/**
 * HTTP yardımcı fonksiyonları
 * Retry, backoff ve rate limiting
 */

const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Belirli süre bekle
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rastgele gecikme ekle (0-maxMs arası)
 */
export function randomDelay(maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * maxMs);
  return sleep(delay);
}

/**
 * Timeout ile fetch
 */
async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry ve exponential backoff ile fetch
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Rastgele gecikme ekle (ilk denemede de)
      if (attempt > 0) {
        const delay = BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
        await sleep(delay);
      } else {
        await randomDelay(500);
      }
      
      const response = await fetchWithTimeout(url, options);
      
      // Rate limit kontrolü
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY * Math.pow(2, attempt + 2);
        console.log(`    ⏳ Rate limit, ${waitTime}ms bekleniyor...`);
        await sleep(waitTime);
        continue;
      }
      
      // Başarılı veya kalıcı hata
      if (response.ok || response.status < 500) {
        return response;
      }
      
      // Sunucu hatası, tekrar dene
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Bilinmeyen hata');
      
      // Abort hatası (timeout)
      if (lastError.name === 'AbortError') {
        lastError = new Error('İstek zaman aşımına uğradı');
      }
    }
  }
  
  throw lastError || new Error('Fetch başarısız');
}

/**
 * URL'den meta description çek
 */
export async function fetchMetaDescription(url: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
    
    const html = await response.text();
    
    // og:description veya meta description'ı bul
    const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) return ogMatch[1].slice(0, 300);
    
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (metaMatch) return metaMatch[1].slice(0, 300);
    
    return null;
  } catch {
    return null;
  }
}
