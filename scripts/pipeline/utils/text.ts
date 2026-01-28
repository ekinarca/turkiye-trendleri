/**
 * Metin işleme yardımcı fonksiyonları
 */

import slugifyLib from 'slugify';
import { compareTwoStrings } from 'string-similarity';

const SIMILARITY_THRESHOLD = 0.75;

/**
 * Query'yi normalize et (küçük harf, trim, extra boşlukları kaldır)
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Sadece harf, rakam ve boşluk
    .trim();
}

/**
 * Türkçe karakterleri ASCII'ye dönüştür
 */
export function turkishToAscii(str: string): string {
  const map: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  
  return str.split('').map(char => map[char] || char).join('');
}

/**
 * URL-safe slug oluştur
 */
export function createSlug(title: string): string {
  const ascii = turkishToAscii(title);
  
  return slugifyLib(ascii, {
    lower: true,
    strict: true,
    locale: 'tr',
  }).slice(0, 80);
}

/**
 * İki query'nin benzer olup olmadığını kontrol et
 */
export function isSimilar(query1: string, query2: string): boolean {
  const norm1 = normalizeQuery(query1);
  const norm2 = normalizeQuery(query2);
  
  // Tam eşleşme
  if (norm1 === norm2) return true;
  
  // Birinin diğerini içermesi
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // String similarity
  const similarity = compareTwoStrings(norm1, norm2);
  return similarity >= SIMILARITY_THRESHOLD;
}

/**
 * Kelimeleri token'lara ayır
 */
export function tokenize(text: string): string[] {
  return normalizeQuery(text)
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Jaccard similarity hesapla
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
}
