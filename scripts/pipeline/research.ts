/**
 * Trend araştırma modülü
 * Google News RSS ve Türk haber kaynakları RSS'lerinden bilgi toplar
 */

import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { Trend, Source, ResearchBundle } from './types.js';
import { formatDateForFile, formatTimeForFile, nowISOTurkey } from './utils/date.js';
import { sleep, fetchWithRetry } from './utils/http.js';
import { loadState, saveState, isRecentlyPublished } from './utils/state.js';
import { normalizeQuery, isSimilar } from './utils/text.js';

export type { Source, ResearchBundle };

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

// Türk haber siteleri RSS listesi
const TURKISH_RSS_FEEDS = [
  'https://www.ntv.com.tr/son-dakika.rss',
  'https://www.hurriyet.com.tr/rss/gundem',
  'https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml',
  'https://www.sabah.com.tr/rss/gundem.xml',
  'https://www.haberturk.com/rss/kategori/gundem.xml',
  'https://www.sozcu.com.tr/rss/gundem.xml',
  'https://www.cumhuriyet.com.tr/rss/son_dakika.xml',
  'https://t24.com.tr/rss',
];

/**
 * Google News RSS'ten haber ara
 */
async function searchGoogleNews(query: string): Promise<Source[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}+when:1d&hl=tr&gl=TR&ceid=TR:tr`;
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    });

    const xml = await response.text();
    const data = xmlParser.parse(xml);
    
    const items = data?.rss?.channel?.item || [];
    const itemArray = Array.isArray(items) ? items : [items];
    
    const sources: Source[] = [];
    
    for (const item of itemArray.slice(0, 15)) {
      if (item.title && item.link) {
        // Google News link'ten gerçek URL'yi çıkar
        let realUrl = item.link;
        if (item.link.includes('news.google.com')) {
          // Link içinden source URL'yi çıkarmaya çalış
          const sourceMatch = item.source?.['@_url'];
          if (sourceMatch) {
            realUrl = sourceMatch;
          }
        }

        sources.push({
          title: item.title.replace(/ - .*$/, '').trim(),
          url: realUrl,
          publisher: item.source?.['#text'] || item.source || 'Bilinmeyen Kaynak',
          publishedAt: item.pubDate,
          snippet: item.description?.replace(/<[^>]*>/g, '').slice(0, 200),
        });
      }
    }

    return sources;
  } catch (error) {
    console.log(`    ⚠️ Google News araması başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    return [];
  }
}

/**
 * Türk haber sitelerinden ilgili haberleri ara
 */
async function searchTurkishFeeds(query: string): Promise<Source[]> {
  const sources: Source[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  for (const feedUrl of TURKISH_RSS_FEEDS.slice(0, 4)) { // İlk 4 feed'i kontrol et
    try {
      const response = await fetchWithRetry(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      const xml = await response.text();
      const data = xmlParser.parse(xml);
      
      const items = data?.rss?.channel?.item || [];
      const itemArray = Array.isArray(items) ? items : [items];
      
      for (const item of itemArray) {
        if (!item.title || !item.link) continue;
        
        const titleLower = item.title.toLowerCase();
        const descLower = (item.description || '').toLowerCase();
        
        // Anahtar kelime eşleşmesi kontrol et
        const matchesQuery = queryWords.some(word => 
          titleLower.includes(word) || descLower.includes(word)
        );
        
        if (matchesQuery) {
          const publisher = new URL(feedUrl).hostname.replace('www.', '').split('.')[0];
          
          sources.push({
            title: item.title,
            url: item.link,
            publisher: publisher.charAt(0).toUpperCase() + publisher.slice(1),
            publishedAt: item.pubDate,
            snippet: item.description?.replace(/<[^>]*>/g, '').slice(0, 200),
          });
        }
      }
      
      await sleep(500); // Rate limiting
    } catch {
      // Sessizce devam et
    }
  }

  return sources;
}

/**
 * Kaynakları benzersizleştir ve skorla
 */
function dedupeAndScoreSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const unique: Source[] = [];
  
  for (const source of sources) {
    // URL ve başlık bazında dedupe
    const key = source.url + source.title.slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(source);
    }
  }
  
  // İlk 15'i döndür
  return unique.slice(0, 15);
}

/**
 * Araştırma paketini dosyaya kaydet
 */
function saveResearchBundle(bundle: ResearchBundle): void {
  const dateStr = formatDateForFile();
  const timeStr = formatTimeForFile();
  
  const dirPath = path.join(process.cwd(), 'data', 'research', dateStr);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const safeQuery = bundle.normalizedQuery.replace(/[^a-z0-9]/g, '-').slice(0, 50);
  const filePath = path.join(dirPath, `${timeStr}-${safeQuery}.json`);
  
  fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), 'utf-8');
}

/**
 * Trendleri filtrele: Son 24 saatte yazılmış olanları çıkar
 */
function filterNewTrends(trends: Trend[]): Trend[] {
  const state = loadState();
  
  return trends.filter(trend => {
    const normalized = normalizeQuery(trend.query);
    
    // Tam eşleşme kontrolü
    if (isRecentlyPublished(normalized, state)) {
      console.log(`    ⏭️ Atlandı (son 24 saat): ${trend.query}`);
      return false;
    }
    
    // Benzerlik kontrolü
    for (const published of Object.keys(state.publishedTrends)) {
      if (isSimilar(normalized, published)) {
        console.log(`    ⏭️ Atlandı (benzer trend): ${trend.query} ≈ ${published}`);
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Ana araştırma fonksiyonu
 */
export async function researchTrends(trends: Trend[], maxArticles: number): Promise<ResearchBundle[]> {
  // Önce yeni trendleri filtrele
  const newTrends = filterNewTrends(trends);
  console.log(`  📋 ${trends.length} trend içinden ${newTrends.length} yeni trend bulundu`);
  
  if (newTrends.length === 0) {
    return [];
  }

  const bundles: ResearchBundle[] = [];
  const trendsToResearch = newTrends.slice(0, maxArticles + 5); // Yedek için fazladan al
  
  for (const trend of trendsToResearch) {
    console.log(`\n  🔍 Araştırılıyor: "${trend.query}"`);
    
    // Google News'ten ara
    let sources = await searchGoogleNews(trend.query);
    console.log(`    📰 Google News: ${sources.length} sonuç`);
    
    await sleep(1500); // Rate limiting
    
    // Türk RSS feed'lerden ara
    const turkishSources = await searchTurkishFeeds(trend.query);
    console.log(`    🇹🇷 Türk RSS: ${turkishSources.length} sonuç`);
    
    // Birleştir ve benzersizleştir
    sources = dedupeAndScoreSources([...sources, ...turkishSources]);
    
    // Minimum kaynak kontrolü
    if (sources.length < 3) {
      console.log(`    ⚠️ Yetersiz kaynak (${sources.length}), atlanıyor`);
      continue;
    }
    
    const bundle: ResearchBundle = {
      query: trend.query,
      normalizedQuery: normalizeQuery(trend.query),
      researchedAt: nowISOTurkey(),
      sources,
    };
    
    saveResearchBundle(bundle);
    bundles.push(bundle);
    
    console.log(`    ✅ ${sources.length} kaynak toplandı`);
    
    // Yeterli araştırma paketi toplandıysa dur
    if (bundles.length >= maxArticles) {
      break;
    }
    
    await sleep(2000); // Rate limiting
  }
  
  return bundles;
}
