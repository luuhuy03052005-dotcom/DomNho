# KIẾN TRÚC MỞ RỘNG & HƯỚNG DẪN PHÁT TRIỂN TIẾP (EXTENSION GUIDE)

Tài liệu này mô tả chi tiết cách hệ thống **Đốm Nhỏ** được thiết kế theo kiến trúc phân lớp (Modular Clean Architecture) để dễ dàng mở rộng trong các giai đoạn tiếp theo.

---

## 1. Luồng Dữ Liệu Kép (Hybrid Data Layer: Local-First + Supabase Cloud)

Ứng dụng tại `apps/web-pwa` được thiết kế theo mô hình **Local-First kết hợp Cloud Sync**:
- **Khi chưa cấu hình biến môi trường Supabase**: Ứng dụng vẫn chạy hoàn chỉnh 100% tính năng (Thắp đốm, Nén ảnh `.webp`, Làm mờ tọa độ ±200m, Quét khớp lệnh 3km, Xuất Poster QR, Chạm ảnh kỷ niệm hàng tuần, Đăng ký 3 giây lưu vĩnh viễn 10 năm) thông qua `localStorage` + `IndexedDB`.
- **Khi cấu hình `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
  - Client tại [`src/lib/supabase.ts`](file:///c:/Users/luuhu/OneDrive/Desktop/Project/Đốm%20nhỏ/apps/web-pwa/src/lib/supabase.ts) tự động kích hoạt kết nối thời gian thực (Supabase Realtime) và gọi các hàm RPC PostGIS (`get_nearby_dom_nho`, `find_matching_spots_within_3km`, `boost_dom_light`).

---

## 2. Cách Mở Rộng Từng Phân Hệ

### 2.1. Thêm Chế Độ Màu Mới (Themes)
Mở file [`src/lib/themes.ts`](file:///c:/Users/luuhu/OneDrive/Desktop/Project/Đốm%20nhỏ/apps/web-pwa/src/lib/themes.ts) và bổ sung cấu hình vào đối tượng `DOM_THEMES`. Mọi thành phần giao diện (Nền ứng dụng, Kính mờ Frosted Milk Glass của Bottom Sheet, 3 Popup và Bộ lọc màu Bản đồ) sẽ tự động nhận diện mà không cần sửa code từng component.

### 2.2. Thêm Nguồn Cào Dữ Liệu Mới Cho Bot Crawler
Mở `services/crawl4ai-worker/crawler_engine.py` để bổ sung truy vấn hoặc thay đổi quy tắc chuẩn hóa. Worker dùng Crawl4AI + Chromium cho cả trang tìm kiếm và trang bài viết; `apps/web-pwa/src/lib/crawl4ai-crawler.ts` chỉ chịu trách nhiệm gọi worker, kiểm tra kết quả và chuyển dữ liệu sang API hiện tại.

### 2.3. Tích Hợp Thanh Toán Cho Gói "Truyền Lửa Khẩn Cấp" (VietQR / PayOS / Momo)
Trong [`ProfileMemoryModal.tsx`](file:///c:/Users/luuhu/OneDrive/Desktop/Project/Đốm%20nhỏ/apps/web-pwa/src/components/modals/ProfileMemoryModal.tsx), hàm `onActivateEmergencyBoost(spotId)` đã được tách sẵn. Bạn chỉ cần gắn Webhook VietQR / PayOS để cập nhật trường `is_emergency_boosted = true` và `emergency_boost_until = NOW() + INTERVAL '7 days'` trong bảng `public.dom_nho_posts`.

