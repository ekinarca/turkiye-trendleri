import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    category: z.enum([
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
    ]),
    tags: z.array(z.string()).default([]),
    trendQuery: z.string(),
    readingTime: z.number(),
    publishedAt: z.string(),
    sources: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        publisher: z.string().optional(),
      })
    ),
  }),
});

export const collections = { posts };
