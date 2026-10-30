import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Đốm Nhỏ — Cứu Trợ, Tìm Thú Lạc & Nhận Nuôi Quanh Bạn',
  description:
    'Một kết nối nhỏ. Một mái ấm mới. Kết nối cứu trợ chó mèo, tìm thú lạc và nhận nuôi quanh bạn.',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] w-full bg-[#FAF7F1] text-[#142820] antialiased">
        {children}
      </body>
    </html>
  );
}

