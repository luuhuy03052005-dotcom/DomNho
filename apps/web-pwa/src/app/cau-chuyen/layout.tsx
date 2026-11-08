import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Câu chuyện cộng đồng cứu trợ thú cưng | Đốm Nhỏ',
  description:
    'Khám phá những câu chuyện cứu trợ chó mèo và hành trình tìm mái ấm mới trên Đốm Nhỏ. Cùng cộng đồng chia sẻ kinh nghiệm chăm sóc và nhận nuôi thú cưng.',
  alternates: { canonical: '/cau-chuyen' },
  openGraph: {
    title: 'Câu chuyện cộng đồng cứu trợ thú cưng | Đốm Nhỏ',
    url: '/cau-chuyen',
    description:
      'Những câu chuyện cứu trợ chó mèo, tìm thú lạc và nhận nuôi từ cộng đồng Đốm Nhỏ.',
  },
};

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
