/**
 * Paylaşılan tip tanımlamaları
 */

export interface Trend {
  query: string;
  rank: number;
  relatedQueries?: string[];
  timestamp: string;
}

export interface TrendSnapshot {
  fetchedAt: string;
  region: string;
  trends: Trend[];
}

export interface Source {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  snippet?: string;
}

export interface ResearchBundle {
  query: string;
  normalizedQuery: string;
  researchedAt: string;
  sources: Source[];
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
  readingTime: number;
  content: string;
  sources: Source[];
  trendQuery: string;
  generatedAt: string;
}

export interface PublishedTrend {
  slug: string;
  publishedAt: string;
}

export interface State {
  publishedTrends: Record<string, PublishedTrend>;
  lastUpdated: string;
}

export interface HealthStatus {
  lastRun: string;
  success: boolean;
  message: string;
  articlesGenerated: number;
  consecutiveFailures: number;
}
