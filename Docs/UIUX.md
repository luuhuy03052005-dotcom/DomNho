Hãy đọc kỹ file @UI_UX_SPEC.md (bản V2).
Hãy code trang chính của ứng dụng "Đốm Nhỏ" (Next.js + Tailwind CSS + Framer Motion + Lucide Icons) với các yêu cầu bắt buộc sau:
1. Giao diện mặc định dùng tông SÁNG ẤM "Nắng Sớm" (#F7F4EF), chữ màu nâu cà phê (#2C2623), tuyệt đối không làm giao diện tối đen, không dùng viền border cứng, không dùng thanh Header/Navbar.
2. Tích hợp tính năng Đổi Màu Nền (Theme Switcher) ở góc trên bên phải (top-12 right-4) với 4 chế độ màu: Nắng Sớm (#F7F4EF), Đồi Thông (#ECF2EE), Hoàng Hôn (#FCEEE9), và Chạng Vạng (#232730 - xanh khói dịu, không đen). Khi bấm chọn màu nào, cả màu nền ứng dụng, màu kính mờ của Bottom Sheet và bộ lọc màu của Bản đồ phải chuyển đổi mượt mà và lưu vào localStorage.
3. Màn hình chính cao 100dvh, gồm:
   - Lớp bản đồ nền sáng ấm với các đốm sáng (Đỏ san hô #E63946, Cam mật ong #E07A5F, Xanh ngọc #2A9D8F) có vòng sóng lan tỏa (ring pulse).
   - Phía trên bên trái (top-12 left-4): Hạt trạng thái kính mờ sáng (Frosted Milk Glass) báo số đốm sáng quanh bán kính 500m.
   - Phía dưới: Nút nổi "Thắp Đốm" mở nhanh Camera kiểu Locket và tải ảnh, và Ngăn kéo Bottom Sheet bo góc rounded-t-[32px] trượt mượt mà chứa bộ bài Quẹt thẻ Nhận nuôi (Swipe Deck dạng bưu thiếp tràn viền).
