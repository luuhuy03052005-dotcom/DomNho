import type { MetadataRoute } from 'next';

const siteUrl = 'https://dom-nho.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/cau-chuyen`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
