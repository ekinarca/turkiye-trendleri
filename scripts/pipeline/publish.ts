/**
 * Makale yayınlama modülü
 * Oluşturulan makaleleri Astro content collection'a yazar
 */

import fs from 'node:fs';
import path from 'node:path';
import { GeneratedArticle } from './generate.js';
import { formatDateForFile } from './utils/date.js';
import { loadState, saveState, markAsPublished } from './utils/state.js';
import { normalizeQuery } from './utils/text.js';

/**
 * Makaleyi Markdown dosyasına dönüştür
 */
function articleToMarkdown(article: GeneratedArticle): string {
  const frontmatter = {
    title: article.title,
    summary: article.summary,
    category: article.category,
    tags: article.tags,
    trendQuery: article.trendQuery,
    readingTime: article.readingTime,
    publishedAt: article.generatedAt,
    sources: article.sources,
  };

  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (key === 'sources') {
          // Sources array of objects
          const sourcesYaml = value.map(s => {
            const lines = [`  - title: "${escapeYaml(s.title)}"`];
            lines.push(`    url: "${s.url}"`);
            if (s.publisher) {
              lines.push(`    publisher: "${escapeYaml(s.publisher)}"`);
            }
            return lines.join('\n');
          }).join('\n');
          return `${key}:\n${sourcesYaml}`;
        }
        // Simple array
        return `${key}:\n${value.map(v => `  - "${escapeYaml(String(v))}"`).join('\n')}`;
      }
      if (typeof value === 'string') {
        return `${key}: "${escapeYaml(value)}"`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  return `---
${yaml}
---

${article.content}
`;
}

/**
 * YAML için string escape
 */
function escapeYaml(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Makaleleri yayınla
 */
export async function publishArticles(articles: GeneratedArticle[]): Promise<number> {
  if (articles.length === 0) {
    console.log('  ℹ️ Yayınlanacak makale yok');
    return 0;
  }

  const postsDir = path.join(process.cwd(), 'src', 'content', 'posts');
  let publishedCount = 0;
  const state = loadState();

  for (const article of articles) {
    try {
      // Dosya yolunu oluştur
      const dateStr = formatDateForFile();
      const dirPath = path.join(postsDir, dateStr);
      fs.mkdirSync(dirPath, { recursive: true });
      
      const filePath = path.join(dirPath, `${article.slug}.md`);
      
      // Zaten var mı kontrol et
      if (fs.existsSync(filePath)) {
        console.log(`    ⏭️ Zaten var: ${article.slug}`);
        continue;
      }

      // Markdown dosyasını yaz
      const markdown = articleToMarkdown(article);
      fs.writeFileSync(filePath, markdown, 'utf-8');
      
      console.log(`    📄 Yayınlandı: ${filePath}`);
      
      // State'i güncelle
      const normalizedQuery = normalizeQuery(article.trendQuery);
      markAsPublished(normalizedQuery, article.slug, state);
      
      publishedCount++;
    } catch (error) {
      console.error(`    ❌ Yayınlama hatası (${article.slug}):`, error);
    }
  }

  // State'i kaydet
  saveState(state);
  
  return publishedCount;
}
