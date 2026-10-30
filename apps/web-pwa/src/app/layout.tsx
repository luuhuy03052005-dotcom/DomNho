import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Đốm Nhỏ — Mạng Xã Hội Bản Đồ Cứu Hộ & Nhận Nuôi Thú Cưng',
  description:
    'Thắp một đốm sáng ấm áp để tìm thú cưng đi lạc, chia sẻ tín hiệu bắt gặp ngoài đường và kết nối mái ấm nhận nuôi yêu thương.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-dom-nho.png',
    apple: '/logo-dom-nho.png',
  },
  themeColor: '#FAF7F2',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Đốm Nhỏ',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
      <body className="h-[100dvh] w-screen overflow-hidden bg-[#FAF7F2] text-[#133E35] antialiased">
        {children}
      </body>
    </html>
  );
}

