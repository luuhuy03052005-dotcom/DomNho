# ĐỐM NHỎ — Mạng Xã Hội Bản Đồ Cứu Hộ & Lưu Giữ Kỷ Niệm Thú Cưng

**Đốm Nhỏ** là mạng xã hội không gian (Geo-Spatial SNS) tích hợp bản đồ tương tác thời gian thực dưới dạng ứng dụng web (PWA), kết hợp **Động cơ AI Crawler tự động thu thập tin cứu hộ** và **Không gian lưu giữ kỷ niệm ấm áp** dành cho các cặp đôi, nhóm bạn và người yêu động vật.

---

## 1. Triết Lý Thiết Kế & Hệ Thống Thuật Ngữ ("Ánh Sáng & Hơi Ấm")

- **Giao diện Sáng Ấm Mặc Định ("Nắng Sớm" `#F7F4EF`, chữ nâu cà phê `#2C2623`)**: Tràn viền `100dvh`, loại bỏ mọi khung viền cứng (`border-0`) và không dùng thanh Header/Navbar.
- **Bộ Đổi Màu Nền 4 Chế Độ (Theme Switcher - `top-12 right-4`)**:
  1. **Nắng Sớm** (`#F7F4EF`) — Sáng ấm tinh khôi (Mặc định)
  2. **Đồi Thông** (`#ECF2EE`) — Sương mai dịu mát
  3. **Hoàng Hôn** (`#FCEEE9`) — Chiều hồng hoài niệm
  4. **Chạng Vạng** (`#232730`) — Xanh khói êm đềm (Không đen tuyền)
- **Từ vựng Đốm Nhỏ**:
  - **Thắp Đốm**: Mở nhanh Camera kiểu Locket (POV) hoặc tải ảnh lên bản đồ trong 3 giây.
  - **Đốm Đỏ (`#E63946` - SOS)**: Tin tìm thú lạc / cấp cứu, nhấp nháy theo nhịp tim kèm vòng sóng radar nở rộng theo số giờ đi lạc.
  - **Đốm Cam (`#E07A5F` - Tín hiệu)**: Khoảnh khắc người đi đường vừa chụp vội một bé chó/mèo nghi đi lạc hoặc cần giúp đỡ.
  - **Đốm Vàng (`#F4A261` - Đợi Nhà)**: Hồ sơ tâm tình tìm người nhận nuôi hoặc đăng ký **Trạm Tạm Trú (Foster)**.
  - **Đốm Xanh (`#2A9D8F` - Bình Yên)**: Ca đã đoàn tụ / đã nhận nuôi, ghim cố định vào Bản đồ Kỷ niệm.
  - **Truyền Lửa**: Thao tác 1 chạm nạp thêm `+15 light_power` giữ cho đốm sáng không bị mờ dần (Auto-Fade).

---

## 2. Cấu Trúc Thư Mục Monorepo

```text
Đốm nhỏ/
├── apps/
│   └── web-pwa/                         # Giao diện người dùng (Next.js App Router + Tailwind + Framer Motion)
│       ├── public/
│       │   ├── manifest.json            # Cấu hình PWA Full-Screen cho iOS / Android
│       │   ├── sw.js                    # Service Worker nhận thông báo đẩy (Web Push)
│       │   └── icons/                   # Bộ icon SVG Đốm Nhỏ (192x192, 512x512)
│       └── src/
│           ├── app/
│           │   ├── api/spots/route.ts   # API truy vấn & tạo Đốm sáng (Coordinate Fuzzing ±200m)
│           │   ├── api/match/route.ts   # API Thuật toán Khớp Lệnh Kép trong bán kính 3km
│           │   ├── globals.css
│           │   ├── layout.tsx
│           │   └── page.tsx             # Màn hình chính 100dvh tích hợp toàn bộ luồng nghiệp vụ
│           ├── components/
│           │   ├── map/                 # Bản đồ sáng ấm, Lớp Đốm sáng Ring Pulse, Hạt trạng thái & Theme Switcher
│           │   ├── swipe-deck/          # Ngăn kéo Bottom Sheet rounded-t-[32px] & Bộ bài Quẹt thẻ Bưu thiếp
│           │   ├── camera-modal/        # Popup 2: Camera kiểu Locket 1 chạm + Nén ảnh .webp (<150KB)
│           │   ├── modals/              # Popup 1 (Chi tiết Đốm + QR Poster), Popup 3 (Không gian Cặp đôi & Chạm ảnh mỗi tuần), Zero-Verify Auth, Khớp lệnh 3km
│           │   └── ios-prompt/          # Hướng dẫn "Thêm vào MH chính" cho iPhone
│           ├── hooks/                   # useGeolocation (Radar 500m), usePushNotification (Web Push)
│           └── lib/                     # types, themes, security (Fuzzing, Masking, Rate-limit, Match 3km), supabase, image-compressor, seed-data
│
├── services/
│   └── crawler-worker/                  # Động cơ Bot Crawl & Phễu Lọc AI 3 Tầng (Python)
│       ├── scrapers/                    # Playwright Scraper & dữ liệu mẫu hội nhóm cứu hộ
│       ├── processors/
│       │   ├── rule_filter.py           # Tầng 1: Chặn bài bán hàng, phối giống, spam thương mại
│       │   ├── deduplicator.py          # Tầng 2: Lọc trùng văn bản (SimHash 64-bit) & hình ảnh (pHash)
│       │   ├── gemini_extractor.py      # Tầng 3: Gemini 2.5 Flash bóc tách JSON + Che SĐT (090***456)
│       │   └── geocoder.py              # Chuyển địa chỉ sang GPS + Làm mờ tọa độ ±200m
│       ├── main_cron.py                 # Chạy định kỳ đẩy dữ liệu sạch lên Supabase
│       └── requirements.txt
│
├── supabase/
│   └── migrations/
│       └── 01_init_dom_nho.sql          # Schema PostGIS, Trigger Fuzzing ±200m, RPC 3km Match, Auto-Fade & RLS
│
└── Docs/
    ├── GEMINI.md                        # Bản thiết kế tổng thể & Hệ thống Bảo mật / Logic
    ├── UIUX.md                          # Đặc tả giao diện Sáng Ấm & 4 Theme
    └── ARCHITECTURE_AND_EXTENSION_GUIDE.md
```

---

## 3. Hướng Dẫn Chạy Nhanh

### A. Chạy Ứng Dụng Web PWA (`apps/web-pwa`)

```bash
cd "apps/web-pwa"
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`. Ứng dụng hoạt động ngay lập tức ở chế độ **Guest Mode** với đầy đủ dữ liệu mẫu tại TP.HCM, hỗ trợ lưu vĩnh viễn mọi thao tác vào `localStorage` + `IndexedDB`, và tự động đồng bộ với Supabase khi bạn điền biến môi trường trong `.env.local`.

### B. Chạy Động Cơ AI Crawler 3 Tầng (`services/crawler-worker`)

```bash
python services/crawler-worker/main_cron.py --demo --output apps/web-pwa/public/crawled-feed.json
```

### C. Khởi Tạo Cơ Sở Dữ Liệu Supabase + PostGIS

Copy toàn bộ nội dung file [`supabase/migrations/01_init_dom_nho.sql`](file:///c:/Users/luuhu/OneDrive/Desktop/Project/Đốm%20nhỏ/supabase/migrations/01_init_dom_nho.sql) vào **SQL Editor** trên Supabase Dashboard và bấm **Run**.

