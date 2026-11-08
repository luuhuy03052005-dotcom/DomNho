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
│           ├── lib/
│           │   ├── crawl4ai-crawler.ts  # Client kết nối Crawl4AI worker
│           │   ├── location-services.ts # Geocode địa chỉ Việt Nam
│           │   └── ...                  # types, themes, security, Supabase
│           └── scripts/
│               └── run-crawl4ai.ts      # Crawler batch xuất JSON + KML
│
├── services/
│   └── crawl4ai-worker/                 # Python Crawl4AI + Chromium, CLI và HTTP API
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

### B. Chạy Crawl4AI Crawler

```bash
python -m pip install -r services/crawl4ai-worker/requirements.txt
crawl4ai-setup
npm run crawler
```

Crawler dùng Crawl4AI 0.9.5 và Chromium để mở trang kết quả tìm kiếm, phát hiện URL rồi đọc trực tiếp từng bài. Hệ thống không còn phụ thuộc SDK hoặc API key của dịch vụ crawler trả phí cũ.

Hệ thống dùng 33 nhóm truy vấn cứu hộ/thất lạc/nhận nuôi, phủ nhiều nền tảng và cụm tỉnh thành trên toàn quốc. Một lần chạy batch chỉ cập nhật feed khi có tối thiểu **50 bài hợp lệ**; nếu không đạt, feed cũ được giữ nguyên.

### C. Lịch crawl tự động hàng tháng

Khi deploy thư mục `apps/web-pwa` lên Vercel, `vercel.json` gọi `GET /api/cron/monthly-crawl` vào `00:00 UTC` ngày đầu mỗi tháng (`07:00` giờ Việt Nam). Crawl4AI cần Chromium nên worker Python phải được chạy riêng từ `services/crawl4ai-worker` (có sẵn Dockerfile); cấu hình `CRAWL4AI_WORKER_URL`, `CRAWL4AI_WORKER_TOKEN`, `MONGODB_URI` và `CRON_SECRET` trên Vercel. Kết quả được lưu vào MongoDB; endpoint từ chối ghi đè nếu chưa đạt 50 bài hợp lệ.

### D. Khởi Tạo Cơ Sở Dữ Liệu Supabase + PostGIS

Copy toàn bộ nội dung file [`supabase/migrations/01_init_dom_nho.sql`](file:///c:/Users/luuhu/OneDrive/Desktop/Project/Đốm%20nhỏ/supabase/migrations/01_init_dom_nho.sql) vào **SQL Editor** trên Supabase Dashboard và bấm **Run**.

