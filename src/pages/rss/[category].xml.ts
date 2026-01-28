import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext, GetStaticPaths } from 'astro';

const CATEGORIES = [
  'ekonomi',
  'spor',
  'magazin',
  'teknoloji',
  'siyaset',
  'saglik',
  'dunya',
  'egitim',
  'kripto',
  'otomotiv',
  'diger',
];

const CATEGORY_NAMES: Record<string, string> = {
  'ekonomi': 'Ekonomi',
  'spor': 'Spor',
  'magazin': 'Magazin',
  'teknoloji': 'Teknoloji',
  'siyaset': 'Siyaset',
  'saglik': 'Sağlık',
  'dunya': 'Dünya',
  'egitim': 'Eğitim',
  'kripto': 'Kripto',
  'otomotiv': 'Otomotiv',
  'diger': 'Diğer',
};

export const getStaticPaths: GetStaticPaths = async () => {
  return CATEGORIES.map(category => ({
    params: { category },
  }));
};

export async function GET(context: APIContext) {
  const { category } = context.params;
  const categoryName = CATEGORY_NAMES[category as string] || category;
  
  const posts = await getCollection('posts');
  
  // Kategori eşleştirmesi (Türkçe karakterleri normalize et)
  const normalizeCategory = (cat: string) => 
    cat.toLowerCase()
      .replace('ğ', 'g')
      .replace('ı', 'i')
      .replace('ş', 's')
      .replace('ü', 'u')
      .replace('ö', 'o')
      .replace('ç', 'c');
  
  const filteredPosts = posts.filter(post => 
    normalizeCategory(post.data.category) === category
  );
  
  const sortedPosts = filteredPosts.sort((a, b) => 
    new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
  );

  return rss({
    title: `Türkiye Trendleri - ${categoryName}`,
    description: `${categoryName} kategorisindeki güncel haberler`,
    site: context.site || 'https://turkiye-trendleri.netlify.app',
    items: sortedPosts.slice(0, 30).map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.publishedAt),
      description: post.data.summary,
      link: `/haber/${post.slug}/`,
      categories: [post.data.category, ...post.data.tags],
      author: 'Türkiye Trendleri',
    })),
    customData: `
      <language>tr</language>
      <copyright>© ${new Date().getFullYear()} Türkiye Trendleri</copyright>
      <category>${categoryName}</category>
    `,
  });
}
