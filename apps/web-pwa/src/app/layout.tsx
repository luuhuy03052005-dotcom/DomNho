import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Lora } from 'next/font/google';
import './globals.css';

const sansFont = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-dom-sans',
});
const serifFont = Lora({
  weight: 'variable',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-dom-serif',
});

const siteUrl = 'https://dom-nho.vercel.app';
const siteTitle = 'Đốm Nhỏ — Cứu Trợ, Tìm Thú Lạc & Nhận Nuôi Quanh Bạn';
const siteDescription =
  'Đốm Nhỏ kết nối cộng đồng cứu trợ chó mèo, tìm thú cưng đi lạc và hỗ trợ nhận nuôi. Xem tin quanh bạn, báo manh mối và cùng đưa các bé về nhà.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: 'Đốm Nhỏ',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/logo-dom-nho.png',
        width: 1254,
        height: 1254,
        alt: 'Logo chính thức Đốm Nhỏ',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
    images: ['/logo-dom-nho.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-dom-nho.png',
    apple: '/logo-dom-nho.png',
  },
  themeColor: '#FAF7F1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Đốm Nhỏ',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${siteUrl}/#organization`,
                  name: 'Đốm Nhỏ',
                  url: siteUrl,
                  logo: `${siteUrl}/logo-dom-nho.png`,
                },
                {
                  '@type': 'WebSite',
                  '@id': `${siteUrl}/#website`,
                  name: 'Đốm Nhỏ',
                  url: siteUrl,
                  inLanguage: 'vi-VN',
                  description: siteDescription,
                  publisher: { '@id': `${siteUrl}/#organization` },
                },
              ],
            }).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className={`${sansFont.variable} ${serifFont.variable} min-h-[100dvh] w-full bg-[#FAF7F1] text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}

