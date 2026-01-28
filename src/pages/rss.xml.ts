import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');
  
  const sortedPosts = posts.sort((a, b) => 
    new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
  );

  return rss({
    title: 'Türkiye Trendleri',
    description: 'Türkiye\'nin günlük trendlerinden otomatik oluşturulan haberler',
    site: context.site || 'https://turkiye-trendleri.netlify.app',
    items: sortedPosts.slice(0, 50).map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.publishedAt),
      description: post.data.summary,
      link: `/haber/${post.slug}/`,
      categories: [post.data.category, ...post.data.tags],
      author: 'Türkiye Trendleri',
      customData: `
        <language>tr</language>
        <source url="${context.site || 'https://turkiye-trendleri.netlify.app'}">Türkiye Trendleri</source>
      `,
    })),
    customData: `
      <language>tr</language>
      <copyright>© ${new Date().getFullYear()} Türkiye Trendleri</copyright>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <ttl>60</ttl>
    `,
    stylesheet: '/rss-style.xsl',
  });
}
