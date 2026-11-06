# Prompt dùng lại

## Triển khai từ ba ảnh

Dùng $design-dom-nho-ui để triển khai UI/UX Đốm Nhỏ theo bộ ảnh trong skill. Dùng ảnh mobile-map-compact.png làm chuẩn Bản đồ mobile, desktop-explore.png cho Khám phá desktop và mobile-explore-detail.png cho Khám phá/Chi tiết mobile. Màn bản đồ giữa triptych đã được thay bởi mẫu gọn.

Đọc source và hướng dẫn repo trước khi sửa. Làm desktop Khám phá ba cột, mobile thẻ ngang một cột và năm tab. Bản đồ mobile giữ hai hàng điều khiển, thú y trong Bộ lọc, định vị cạnh zoom, summary và nav có hàng riêng. Chi tiết có body cuộn và CTA theo nguồn/quyền. Nối hành động đúng references/business-rules.md và chính sách thật trong source.

Tái hiện các lỗi cũ trong responsive-qa.md. Đo baseline production trước khi tối ưu theo performance.md, sửa nguyên nhân, đo lại cùng cấu hình và dữ liệu. Bàn giao code hoạt động, kiểm tra luồng, ảnh màn hình và số đo thật. Đánh dấu rõ môi trường hoặc luồng chưa thể kiểm tra.

## Chỉ thiết kế hoặc vẽ

Dùng $design-dom-nho-ui để thiết kế [tên màn] cho [viewport]. Đọc ảnh chuẩn có liên quan và business-rules.md. Giữ màu sáng, nút lớn, năm tab ở màn chính. Ưu tiên map compact ở điện thoại. Hiển thị CTA đúng loại tin, nguồn và trạng thái quyền. Nội dung trong mockup là minh họa. Chỉ xuất đầu ra thiết kế được yêu cầu.

## Sửa lỗi iPhone và lag

Dùng $design-dom-nho-ui để tái hiện [triệu chứng] ở [màn, thiết bị, viewport]. Đọc ảnh lỗi và source. Ghi baseline, điều tra layout/viewport/overlay và trace render/network. Sửa đúng nguyên nhân, kiểm tra lại luồng thực và đo trước–sau. Giữ state khi quay lại, dữ liệu khi lỗi và quyền truy cập liên hệ. Báo số đo cùng cấu hình và bước còn thiếu.

## Thêm màn tiếp nối

Dùng $design-dom-nho-ui để làm [Đăng tin / Câu chuyện / Đã lưu / Tài khoản] liền mạch với các ảnh đã chốt. Đọc source để xác định trường dữ liệu và hành động đang có. Cho nội dung cuộn, header/action rõ, bảo toàn nháp khi lỗi. Phân biệt phần suy ra để bổ sung thiết kế với phần đã có trong mẫu.
