import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

const TURKEY_TZ = 'Europe/Istanbul';

/**
 * Türkiye saat dilimine göre şu anki zamanı döndürür
 */
export function nowInTurkey(): Date {
  return toZonedTime(new Date(), TURKEY_TZ);
}

/**
 * Türkiye saat dilimine göre ISO string döndürür
 */
export function nowISOTurkey(): string {
  const now = new Date();
  return formatTz(toZonedTime(now, TURKEY_TZ), "yyyy-MM-dd'T'HH:mm:ssXXX", {
    timeZone: TURKEY_TZ,
  });
}

/**
 * Tarih formatla: "28 Ocak 2026, 14:30"
 */
export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "d MMMM yyyy, HH:mm", { locale: tr });
}

/**
 * Kısa tarih formatı: "28 Oca 2026"
 */
export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "d MMM yyyy", { locale: tr });
}

/**
 * Göreceli zaman: "2 saat önce"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return formatDistanceToNow(date, { addSuffix: true, locale: tr });
}

/**
 * Dosya adı için tarih formatı: "2026-01-28"
 */
export function formatDateForFile(date: Date = new Date()): string {
  const turkeyDate = toZonedTime(date, TURKEY_TZ);
  return format(turkeyDate, 'yyyy-MM-dd');
}

/**
 * Dosya adı için saat formatı: "1430"
 */
export function formatTimeForFile(date: Date = new Date()): string {
  const turkeyDate = toZonedTime(date, TURKEY_TZ);
  return format(turkeyDate, 'HHmm');
}

/**
 * Yıl-ay-gün formatı
 */
export function getDateParts(date: Date = new Date()): { year: string; month: string; day: string } {
  const turkeyDate = toZonedTime(date, TURKEY_TZ);
  return {
    year: format(turkeyDate, 'yyyy'),
    month: format(turkeyDate, 'MM'),
    day: format(turkeyDate, 'dd'),
  };
}
