/**
 * Google Trends Türkiye verilerini çeker
 * Ücretli API kullanmadan, Google Trends RSS/JSON endpoint'i kullanır
 */

import fs from 'node:fs';
import path from 'node:path';
import { formatDateForFile, formatTimeForFile, nowISOTurkey } from './utils/date.js';
import { sleep, fetchWithRetry } from './utils/http.js';
import type { Trend, TrendSnapshot } from './types.js';

export type { Trend, TrendSnapshot };

// Google Trends Daily Trends RSS endpoint (Türkiye)
const TRENDS_RSS_URL = 'https://trends.google.com/trending/rss?geo=TR';

// Alternatif RSS URL'leri
const ALT_RSS_URLS = [
  'https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR',
  'https://trends.google.co.uk/trending/rss?geo=TR',
];

// Alternatif: Google Trends realtime JSON (resmi olmayan)
const TRENDS_JSON_URL = 'https://trends.google.com/trends/api/dailytrends?hl=tr&tz=-180&geo=TR&ns=15';

// Yedek: Türkiye'nin popüler haber konuları (statik fallback)
const FALLBACK_TOPICS = [
  'Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor',
  'dolar kuru', 'altın fiyatları', 'hava durumu',
  'TBMM', 'deprem', 'seçim', 'enflasyon',
];

/**
 * RSS'ten günlük trendleri çeker
 */
async function fetchFromRSS(): Promise<Trend[]> {
  const allUrls = [TRENDS_RSS_URL, ...ALT_RSS_URLS];
  
  for (const url of allUrls) {
    console.log(`  → RSS deneniyor: ${url.slice(0, 60)}...`);
    
    try {
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
        },
      });

      const xml = await response.text();
      
      // HTML dönüyorsa atla
      if (xml.includes('<!doctype') || xml.includes('<!DOCTYPE')) {
        console.log('    ⚠️ HTML döndü, RSS değil');
        continue;
      }
      
      // Basit XML parsing (item elementlerini çıkar)
      const items: Trend[] = [];
      const itemRegex = /<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<\/item>/g;
      let match;
      let rank = 1;

      while ((match = itemRegex.exec(xml)) !== null) {
        const query = match[1].trim();
        if (query && query.length > 1) {
          items.push({
            query,
            rank,
            timestamp: nowISOTurkey(),
          });
          rank++;
        }
      }

      if (items.length > 0) {
        return items;
      }
    } catch (error) {
      console.log(`    ⚠️ Başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
    
    await sleep(1000);
  }
  
  return [];
}

/**
 * JSON endpoint'ten realtime trendleri çeker
 */
async function fetchFromJSON(): Promise<Trend[]> {
  console.log('  → JSON endpoint deneniyor...');
  
  try {
    const response = await fetchWithRetry(TRENDS_JSON_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    });

    const text = await response.text();
    
    // Google returns ")]}'\n" prefix that needs to be stripped
    const jsonStr = text.replace(/^\)\]\}'\n/, '');
    const data = JSON.parse(jsonStr);

    const trends: Trend[] = [];
    let rank = 1;

    // Parse the nested structure
    const days = data.default?.trendingSearchesDays || [];
    
    for (const day of days) {
      const searches = day.trendingSearches || [];
      
      for (const search of searches) {
        const query = search.title?.query;
        if (query && query.length > 1) {
          const relatedQueries = search.relatedQueries?.map((q: any) => q.query) || [];
          
          trends.push({
            query,
            rank,
            relatedQueries,
            timestamp: nowISOTurkey(),
          });
          rank++;
        }
      }
    }

    return trends;
  } catch (error) {
    console.log('  ⚠️ JSON başarısız:', error instanceof Error ? error.message : 'Bilinmeyen hata');
    return [];
  }
}

/**
 * Trend verilerini dosyaya kaydet
 */
function saveTrendsSnapshot(trends: Trend[]): void {
  const dateStr = formatDateForFile();
  const timeStr = formatTimeForFile();
  
  const dirPath = path.join(process.cwd(), 'data', 'trends', dateStr);
  const filePath = path.join(dirPath, `${timeStr}.json`);

  // Dizini oluştur
  fs.mkdirSync(dirPath, { recursive: true });

  const snapshot: TrendSnapshot = {
    fetchedAt: nowISOTurkey(),
    region: 'TR',
    trends,
  };

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`  💾 Trendler kaydedildi: ${filePath}`);
}

/**
 * Google News'ten güncel Türk haberlerinden trend çıkar
 */
async function fetchFromGoogleNews(): Promise<Trend[]> {
  console.log('  → Google News TR deneniyor...');
  
  try {
    const response = await fetchWithRetry('https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    });

    const xml = await response.text();
    
    if (xml.includes('<!doctype') || xml.includes('<!DOCTYPE')) {
      console.log('    ⚠️ HTML döndü');
      return [];
    }
    
    // Başlıklardan anahtar kelimeleri çıkar
    const items: Trend[] = [];
    const titleRegex = /<title>([^<]+)<\/title>/g;
    let match;
    let rank = 1;
    const seen = new Set<string>();

    while ((match = titleRegex.exec(xml)) !== null && items.length < 20) {
      const title = match[1].trim();
      // RSS başlığını ve genel başlıkları atla
      if (title.includes('Google') || title.length < 10 || title.length > 100) continue;
      
      // Ana konuyu çıkar (genellikle başlıktaki ilk 2-4 kelime)
      const words = title.split(/[\s,:\-–]+/).filter(w => w.length > 2);
      const topic = words.slice(0, 3).join(' ');
      
      if (topic.length > 3 && !seen.has(topic.toLowerCase())) {
        seen.add(topic.toLowerCase());
        items.push({
          query: topic,
          rank,
          timestamp: nowISOTurkey(),
        });
        rank++;
      }
    }

    return items;
  } catch (error) {
    console.log(`    ⚠️ Başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    return [];
  }
}

/**
 * Yedek statik trendler
 */
function getFallbackTrends(): Trend[] {
  console.log('  → Yedek trend listesi kullanılıyor...');
  
  // Rastgele sıralama ve seçim
  const shuffled = [...FALLBACK_TOPICS].sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, 10).map((query, index) => ({
    query,
    rank: index + 1,
    timestamp: nowISOTurkey(),
  }));
}

/**
 * Ana fonksiyon: Trendleri çek ve kaydet
 */
export async function fetchTrends(): Promise<Trend[]> {
  console.log('  🌐 Google Trends Türkiye verileri çekiliyor...');
  
  // Sırasıyla dene: JSON → RSS → Google News → Fallback
  let trends = await fetchFromJSON();
  
  if (trends.length === 0) {
    await sleep(1000);
    trends = await fetchFromRSS();
  }
  
  if (trends.length === 0) {
    await sleep(1000);
    trends = await fetchFromGoogleNews();
  }
  
  if (trends.length === 0) {
    trends = getFallbackTrends();
  }

  // İlk 30 trendi al
  trends = trends.slice(0, 30);

  if (trends.length > 0) {
    saveTrendsSnapshot(trends);
    console.log(`  ✅ ${trends.length} trend başarıyla çekildi`);
  } else {
    console.log('  ⚠️ Hiç trend çekilemedi');
  }

  return trends;
}

// Standalone çalıştırma
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTrends().then(trends => {
    console.log('\n📊 Çekilen trendler:');
    trends.forEach((t, i) => console.log(`  ${i + 1}. ${t.query}`));
  });
}
