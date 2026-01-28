/**
 * Durum yönetimi
 * Yayınlanan trendlerin takibi ve deduplication
 */

import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.join(process.cwd(), 'data', 'state.json');
const EXPIRY_HOURS = 24;

export interface PublishedTrend {
  slug: string;
  publishedAt: string;
}

export interface State {
  publishedTrends: Record<string, PublishedTrend>;
  lastUpdated: string;
}

/**
 * Varsayılan state
 */
function getDefaultState(): State {
  return {
    publishedTrends: {},
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * State'i yükle
 */
export function loadState(): State {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const state = JSON.parse(content) as State;
      
      // Eski girdileri temizle
      cleanExpiredEntries(state);
      
      return state;
    }
  } catch (error) {
    console.warn('State dosyası okunamadı, yeni oluşturuluyor');
  }
  
  return getDefaultState();
}

/**
 * State'i kaydet
 */
export function saveState(state: State): void {
  state.lastUpdated = new Date().toISOString();
  
  const dirPath = path.dirname(STATE_FILE);
  fs.mkdirSync(dirPath, { recursive: true });
  
  // Atomik yazma
  const tempFile = STATE_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempFile, STATE_FILE);
}

/**
 * Süresi dolmuş girdileri temizle
 */
function cleanExpiredEntries(state: State): void {
  const now = Date.now();
  const expiryMs = EXPIRY_HOURS * 60 * 60 * 1000;
  
  for (const [query, data] of Object.entries(state.publishedTrends)) {
    const publishedTime = new Date(data.publishedAt).getTime();
    if (now - publishedTime > expiryMs) {
      delete state.publishedTrends[query];
    }
  }
}

/**
 * Trend'in son 24 saatte yayınlanıp yayınlanmadığını kontrol et
 */
export function isRecentlyPublished(normalizedQuery: string, state: State): boolean {
  const entry = state.publishedTrends[normalizedQuery];
  if (!entry) return false;
  
  const publishedTime = new Date(entry.publishedAt).getTime();
  const now = Date.now();
  const expiryMs = EXPIRY_HOURS * 60 * 60 * 1000;
  
  return (now - publishedTime) < expiryMs;
}

/**
 * Trend'i yayınlandı olarak işaretle
 */
export function markAsPublished(normalizedQuery: string, slug: string, state: State): void {
  state.publishedTrends[normalizedQuery] = {
    slug,
    publishedAt: new Date().toISOString(),
  };
}
