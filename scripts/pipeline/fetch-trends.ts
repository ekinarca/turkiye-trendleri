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
const TRENDS_RSS_URL = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR';

// Alternatif: Google Trends realtime JSON (resmi olmayan)
const TRENDS_JSON_URL = 'https://trends.google.com/trends/api/dailytrends?hl=tr&tz=-180&geo=TR&ns=15';

/**
 * RSS'ten günlük trendleri çeker
 */
async function fetchFromRSS(): Promise<Trend[]> {
  console.log('  → RSS endpoint deneniyor...');
  
  try {
    const response = await fetchWithRetry(TRENDS_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    });

    const xml = await response.text();
    
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

    return items;
  } catch (error) {
    console.log('  ⚠️ RSS başarısız:', error instanceof Error ? error.message : 'Bilinmeyen hata');
    return [];
  }
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
 * Ana fonksiyon: Trendleri çek ve kaydet
 */
export async function fetchTrends(): Promise<Trend[]> {
  console.log('  🌐 Google Trends Türkiye verileri çekiliyor...');
  
  // Önce JSON dene, başarısız olursa RSS
  let trends = await fetchFromJSON();
  
  if (trends.length === 0) {
    await sleep(2000); // Rate limiting için bekle
    trends = await fetchFromRSS();
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
