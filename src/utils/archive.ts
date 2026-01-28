/**
 * Arşiv sistemi için yardımcı fonksiyonlar
 */

import type { CollectionEntry } from 'astro:content';
import { parseISO, differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';

type Post = CollectionEntry<'posts'>;

// Türkçe ay isimleri
export const TURKISH_MONTHS: Record<string, string> = {
  '01': 'Ocak',
  '02': 'Şubat',
  '03': 'Mart',
  '04': 'Nisan',
  '05': 'Mayıs',
  '06': 'Haziran',
  '07': 'Temmuz',
  '08': 'Ağustos',
  '09': 'Eylül',
  '10': 'Ekim',
  '11': 'Kasım',
  '12': 'Aralık',
};

// Ay numarasına göre Türkçe ay adı
export const MONTH_NAMES = Object.values(TURKISH_MONTHS);

// Slug'dan ay numarasına dönüştürme
export const MONTH_SLUG_TO_NUMBER: Record<string, string> = {
  'ocak': '01',
  'subat': '02',
  'mart': '03',
  'nisan': '04',
  'mayis': '05',
  'haziran': '06',
  'temmuz': '07',
  'agustos': '08',
  'eylul': '09',
  'ekim': '10',
  'kasim': '11',
  'aralik': '12',
};

// Ay numarasından slug'a dönüştürme
export const MONTH_NUMBER_TO_SLUG: Record<string, string> = {
  '01': 'ocak',
  '02': 'subat',
  '03': 'mart',
  '04': 'nisan',
  '05': 'mayis',
  '06': 'haziran',
  '07': 'temmuz',
  '08': 'agustos',
  '09': 'eylul',
  '10': 'ekim',
  '11': 'kasim',
  '12': 'aralik',
};

/**
 * Makale yaşını gün cinsinden hesapla
 */
export function getArticleAge(publishedAt: string): number {
  const publishDate = parseISO(publishedAt);
  return differenceInDays(new Date(), publishDate);
}

/**
 * Makale arşivde mi? (7+ gün eski)
 */
export function isArchived(publishedAt: string): boolean {
  return getArticleAge(publishedAt) >= 7;
}

/**
 * Makale çok eski mi? (30+ gün)
 */
export function isOldArticle(publishedAt: string): boolean {
  return getArticleAge(publishedAt) >= 30;
}

/**
 * Makaleden tarih parçalarını çıkar
 */
export function getDateParts(publishedAt: string): { year: string; month: string; day: string } {
  const date = parseISO(publishedAt);
  return {
    year: format(date, 'yyyy'),
    month: format(date, 'MM'),
    day: format(date, 'dd'),
  };
}

/**
 * Makaleleri yıla göre grupla
 */
export function groupByYear(posts: Post[]): Record<string, Post[]> {
  const groups: Record<string, Post[]> = {};
  
  for (const post of posts) {
    const { year } = getDateParts(post.data.publishedAt);
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(post);
  }
  
  // Her yıl içinde tarihe göre sırala
  for (const year of Object.keys(groups)) {
    groups[year].sort((a, b) => 
      new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
    );
  }
  
  return groups;
}

/**
 * Makaleleri aya göre grupla
 */
export function groupByMonth(posts: Post[]): Record<string, Post[]> {
  const groups: Record<string, Post[]> = {};
  
  for (const post of posts) {
    const { month } = getDateParts(post.data.publishedAt);
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(post);
  }
  
  // Her ay içinde tarihe göre sırala
  for (const month of Object.keys(groups)) {
    groups[month].sort((a, b) => 
      new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
    );
  }
  
  return groups;
}

/**
 * Makaleleri güne göre grupla
 */
export function groupByDay(posts: Post[]): Record<string, Post[]> {
  const groups: Record<string, Post[]> = {};
  
  for (const post of posts) {
    const { day } = getDateParts(post.data.publishedAt);
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(post);
  }
  
  // Her gün içinde tarihe göre sırala
  for (const day of Object.keys(groups)) {
    groups[day].sort((a, b) => 
      new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
    );
  }
  
  return groups;
}

/**
 * Tüm benzersiz yılları al
 */
export function getUniqueYears(posts: Post[]): string[] {
  const years = new Set<string>();
  for (const post of posts) {
    const { year } = getDateParts(post.data.publishedAt);
    years.add(year);
  }
  return Array.from(years).sort().reverse();
}

/**
 * Belirli bir yıl için benzersiz ayları al
 */
export function getUniqueMonths(posts: Post[], targetYear: string): string[] {
  const months = new Set<string>();
  for (const post of posts) {
    const { year, month } = getDateParts(post.data.publishedAt);
    if (year === targetYear) {
      months.add(month);
    }
  }
  return Array.from(months).sort().reverse();
}

/**
 * Belirli bir yıl ve ay için benzersiz günleri al
 */
export function getUniqueDays(posts: Post[], targetYear: string, targetMonth: string): string[] {
  const days = new Set<string>();
  for (const post of posts) {
    const { year, month, day } = getDateParts(post.data.publishedAt);
    if (year === targetYear && month === targetMonth) {
      days.add(day);
    }
  }
  return Array.from(days).sort().reverse();
}

/**
 * Belirli bir yılın makalelerini filtrele
 */
export function filterByYear(posts: Post[], targetYear: string): Post[] {
  return posts.filter(post => {
    const { year } = getDateParts(post.data.publishedAt);
    return year === targetYear;
  });
}

/**
 * Belirli bir yıl ve ayın makalelerini filtrele
 */
export function filterByMonth(posts: Post[], targetYear: string, targetMonth: string): Post[] {
  return posts.filter(post => {
    const { year, month } = getDateParts(post.data.publishedAt);
    return year === targetYear && month === targetMonth;
  });
}

/**
 * Belirli bir tarihin makalelerini filtrele
 */
export function filterByDay(posts: Post[], targetYear: string, targetMonth: string, targetDay: string): Post[] {
  return posts.filter(post => {
    const { year, month, day } = getDateParts(post.data.publishedAt);
    return year === targetYear && month === targetMonth && day === targetDay;
  });
}

/**
 * Arşiv istatistiklerini hesapla
 */
export function getArchiveStats(posts: Post[]): {
  totalPosts: number;
  totalYears: number;
  categoryDistribution: Record<string, number>;
  monthlyDistribution: Record<string, number>;
} {
  const categoryDistribution: Record<string, number> = {};
  const monthlyDistribution: Record<string, number> = {};
  
  for (const post of posts) {
    // Kategori dağılımı
    const cat = post.data.category;
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    
    // Aylık dağılım
    const { year, month } = getDateParts(post.data.publishedAt);
    const key = `${year}-${month}`;
    monthlyDistribution[key] = (monthlyDistribution[key] || 0) + 1;
  }
  
  return {
    totalPosts: posts.length,
    totalYears: getUniqueYears(posts).length,
    categoryDistribution,
    monthlyDistribution,
  };
}

/**
 * Breadcrumb için veri oluştur
 */
export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function buildArchiveBreadcrumb(
  year?: string,
  month?: string,
  day?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Arşiv', href: '/arsiv' },
  ];
  
  if (year) {
    items.push({ label: year, href: `/arsiv/${year}` });
  }
  
  if (year && month) {
    const monthName = TURKISH_MONTHS[month] || month;
    const monthSlug = MONTH_NUMBER_TO_SLUG[month] || month;
    items.push({ label: monthName, href: `/arsiv/${year}/${monthSlug}` });
  }
  
  if (year && month && day) {
    items.push({ label: `${parseInt(day, 10)}`, href: `/arsiv/${year}/${MONTH_NUMBER_TO_SLUG[month]}/${day}` });
  }
  
  return items;
}

/**
 * Tarih formatla (Türkçe)
 */
export function formatArchiveDate(year: string, month?: string, day?: string): string {
  if (day && month) {
    return `${parseInt(day, 10)} ${TURKISH_MONTHS[month]} ${year}`;
  }
  if (month) {
    return `${TURKISH_MONTHS[month]} ${year}`;
  }
  return year;
}

/**
 * Önceki ve sonraki dönemleri hesapla
 */
export function getAdjacentPeriods(
  posts: Post[],
  currentYear: string,
  currentMonth?: string,
  currentDay?: string
): { prev: string | null; next: string | null } {
  if (currentDay && currentMonth) {
    // Günlük navigasyon
    const days = getUniqueDays(posts, currentYear, currentMonth);
    const idx = days.indexOf(currentDay);
    return {
      prev: idx < days.length - 1 ? days[idx + 1] : null,
      next: idx > 0 ? days[idx - 1] : null,
    };
  }
  
  if (currentMonth) {
    // Aylık navigasyon
    const months = getUniqueMonths(posts, currentYear);
    const idx = months.indexOf(currentMonth);
    return {
      prev: idx < months.length - 1 ? months[idx + 1] : null,
      next: idx > 0 ? months[idx - 1] : null,
    };
  }
  
  // Yıllık navigasyon
  const years = getUniqueYears(posts);
  const idx = years.indexOf(currentYear);
  return {
    prev: idx < years.length - 1 ? years[idx + 1] : null,
    next: idx > 0 ? years[idx - 1] : null,
  };
}
