/**
 * Makale üretim modülü
 * OpenAI API kullanarak araştırma paketlerinden Türkçe makaleler oluşturur
 */

import OpenAI from 'openai';
import type { ResearchBundle, Source, GeneratedArticle } from './types.js';
import { nowISOTurkey } from './utils/date.js';
import { createSlug } from './utils/text.js';

export type { GeneratedArticle };

const CATEGORIES = [
  'Ekonomi',
  'Spor',
  'Magazin',
  'Teknoloji',
  'Siyaset',
  'Sağlık',
  'Dünya',
  'Eğitim',
  'Kripto',
  'Otomotiv',
  'Diğer',
] as const;

const SYSTEM_PROMPT = `Sen Türkçe haber yazan profesyonel bir gazetecisin. Sana verilen kaynakları kullanarak özgün, tarafsız ve bilgilendirici haberler yazarsın.

KURALLAR:
1. SADECE verilen kaynaklarda bulunan bilgileri kullan. Asla uydurma.
2. Kaynaklar arasında çelişki varsa "bazı kaynaklara göre..." şeklinde belirt.
3. Emin olmadığın bilgileri "iddia ediliyor" veya "belirtiliyor" gibi ifadelerle yaz.
4. Kısa paragraflar ve net cümleler kullan.
5. Tarafsız ve profesyonel bir dil kullan (magazin bile olsa).
6. Başlıklar ve alt başlıklar kullan.
7. Gereksiz tekrarlardan kaçın.

FORMAT:
- Başlangıçta "## Kısa Özet" bölümü (2-3 cümle)
- "## Neden Trend Oldu?" bölümü
- "## Öne Çıkan Başlıklar" (madde listesi)
- Ana içerik bölümleri (h2 ve h3 kullan)
- Sonuç paragrafı

YASAKLAR:
- Kaynaklardan uzun alıntı yapma
- Yorum veya kişisel görüş ekleme
- Abartılı veya sansasyonel dil
- Emoji kullanımı`;

const ARTICLE_PROMPT = `Aşağıdaki trend hakkında bir haber makalesi yaz.

TREND: {query}

KAYNAKLAR:
{sources}

GÖREVLER:
1. Makale başlığı (dikkat çekici ama clickbait olmayan)
2. Kısa özet (maksimum 160 karakter, SEO için)
3. Kategori seç: Ekonomi, Spor, Magazin, Teknoloji, Siyaset, Sağlık, Dünya, Eğitim, Kripto, Otomotiv, Diğer
4. 2-5 etiket (tag) öner
5. Makale içeriği (Markdown formatında)

Yanıtını tam olarak şu JSON formatında ver:
{
  "title": "Makale Başlığı",
  "summary": "Kısa özet (max 160 karakter)",
  "category": "Kategori",
  "tags": ["etiket1", "etiket2"],
  "content": "## Kısa Özet\\n\\nÖzet metni...\\n\\n## Neden Trend Oldu?\\n\\n..."
}`;

/**
 * Kaynakları formatla
 */
function formatSources(sources: Source[]): string {
  return sources
    .map((s, i) => `[${i + 1}] ${s.title}\n    Kaynak: ${s.publisher || 'Bilinmeyen'}\n    Özet: ${s.snippet || 'Özet yok'}`)
    .join('\n\n');
}

/**
 * Okuma süresini hesapla (kelime sayısına göre)
 */
function calculateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // Ortalama 200 kelime/dakika
  return Math.max(1, minutes);
}

/**
 * Kategoriyi doğrula
 */
function validateCategory(category: string): string {
  const normalized = category.trim();
  const found = CATEGORIES.find(c => c.toLowerCase() === normalized.toLowerCase());
  return found || 'Diğer';
}

/**
 * OpenAI ile makale üret
 */
async function generateWithOpenAI(bundle: ResearchBundle, openai: OpenAI): Promise<GeneratedArticle | null> {
  const prompt = ARTICLE_PROMPT
    .replace('{query}', bundle.query)
    .replace('{sources}', formatSources(bundle.sources));

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Boş yanıt alındı');
    }

    const parsed = JSON.parse(responseText);
    
    // Validasyon
    if (!parsed.title || !parsed.content) {
      throw new Error('Geçersiz yanıt formatı');
    }

    const article: GeneratedArticle = {
      title: parsed.title.trim(),
      slug: createSlug(parsed.title),
      summary: (parsed.summary || '').slice(0, 160).trim(),
      category: validateCategory(parsed.category || 'Diğer'),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      readingTime: calculateReadingTime(parsed.content),
      content: parsed.content.trim(),
      sources: bundle.sources.map(s => ({
        title: s.title,
        url: s.url,
        publisher: s.publisher,
      })),
      trendQuery: bundle.query,
      generatedAt: nowISOTurkey(),
    };

    return article;
  } catch (error) {
    console.error(`    ❌ Üretim hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    return null;
  }
}

/**
 * Ana üretim fonksiyonu
 */
export async function generateArticles(bundles: ResearchBundle[]): Promise<GeneratedArticle[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('  ❌ OPENAI_API_KEY bulunamadı!');
    return [];
  }

  const openai = new OpenAI({ apiKey });
  const articles: GeneratedArticle[] = [];

  for (const bundle of bundles) {
    console.log(`  ✍️ Makale yazılıyor: "${bundle.query}"`);
    
    const article = await generateWithOpenAI(bundle, openai);
    
    if (article) {
      articles.push(article);
      console.log(`    ✅ "${article.title}" (${article.category})`);
    } else {
      console.log(`    ⚠️ Makale üretilemedi: "${bundle.query}"`);
    }

    // Rate limiting için bekle
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return articles;
}
