# Đặc tả UI/UX

## 1. Chuẩn hình ảnh

Dùng ba ảnh được liên kết từ SKILL.md. Dùng ảnh mobile-map-compact.png thay màn Bản đồ giữa triptych. Ưu tiên thao tác và khả năng đọc khi bitmap có chi tiết thiếu nhất quán. Nội dung Miu, Bông, Kenh14, thời gian và địa danh là ví dụ minh họa.

## 2. Token đề xuất

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| canvas | #F5F6F2 | Nền chung |
| surface | #FFFFFF | Thẻ, input |
| ink | #15251F | Chữ chính |
| ink-muted | #52605A | Metadata |
| primary | #123F35 | CTA |
| primary-hover | #0C3028 | Hover |
| selected | #E4EDDD | Tab đang chọn |
| border | #DDE2DC | Viền |
| rescue-ink | #A83D20 | Cứu trợ |
| rescue-bg | #FFF0E8 | Nền cứu trợ |
| lost-ink | #775000 | Thú lạc |
| lost-bg | #FFF0BF | Nền thú lạc |
| adopt-ink | #275B3A | Nhận nuôi |
| adopt-bg | #E9F2E2 | Nền nhận nuôi |
| focus | #176CBA | Focus |

Kiểm tra tương phản cặp dùng thật. Dùng nhãn và icon bên cạnh màu trạng thái. Giữ logo gốc của dự án nếu có. Coi bitmap là ảnh giao diện tham chiếu, không dùng toàn ảnh để giả lập UI.

- Font sans-serif có đủ dấu Việt. Tận dụng font đã có hoặc Be Vietnam Pro khi được cung cấp hợp lệ.
- Body và input 16px, line-height 1.45–1.6. Metadata 13–14px, nhãn nav 11–12px khi có đủ tương phản.
- Tiêu đề thẻ 18–20px. Tiêu đề trang 24–32px tùy viewport.
- Spacing 4, 8, 12, 16, 24, 32px. Gutter mobile 12–16px, desktop 24px.
- Radius 10–12px, viền 1px. Dùng bóng nhẹ có mục đích.
- Hit area tối thiểu 44×44 CSS px, ưu tiên 48px cho CTA.
- Nút có label ngắn, icon 20–24px. Button lưu có aria-label riêng theo bài.

## 3. Desktop Khám phá

Từ khoảng 1200px, header có logo, Khám phá, Bản đồ, Câu chuyện, Đã lưu, khu vực, Đăng tin và tài khoản.

Hàng công cụ gồm “Tin quanh bạn”, mô tả ngắn, search và Bộ lọc.

Grid ba cột gồm filter khoảng 220–260px, feed minmax(0,1fr), ngữ cảnh khoảng 300–360px. Thu gọn cột ngữ cảnh khi chiều rộng không đủ để feed còn tối thiểu khoảng 420px.

- Filter gồm Loại tin, Nguồn tin, Khu vực, Xóa bộ lọc.
- Feed là một danh sách thẻ ngang, ảnh 120–160px, phần chữ co giãn, CTA phía dưới nội dung.
- Bên phải là “Vị trí các tin”, chú giải, Mở bản đồ, hướng dẫn hành động nếu có đường đi thật.
- Bộ lọc nguồn chưa chọn gì được hiểu là tất cả. Hiện trạng thái chọn rõ, thống nhất với truy vấn thực.
- Xóa bộ lọc chỉ reset các điều kiện lọc về mặc định đã định nghĩa, tránh tự reset vị trí hoặc nội dung nhập ngoài phạm vi.

Tablet 768–1199px đưa bộ lọc vào panel. Khi feed còn chật, đưa map preview về nút mở màn bản đồ riêng. Dùng điều hướng phù hợp chiều rộng, tránh lặp cả desktop nav và mobile nav.

## 4. Mobile Khám phá

Header logo và Đăng tin. Bên dưới là khu vực, search và Bộ lọc, loại tin, heading Tin quanh bạn và sort. Dùng một cột, thẻ cao tự nhiên.

Loại tin có thể ở một hàng khi mỗi mục vẫn có vùng chạm hợp lệ. Tại 320px hoặc phóng chữ, cho cuộn ngang cục bộ có dấu hiệu còn nội dung hoặc reflow 2×2. Không thu nhỏ chữ để giữ một hàng.

Thẻ tin ngang dùng thumbnail 88–112px và phần chữ min-width:0. Cho ảnh chuyển lên trên nếu nội dung/hit area không đủ. Action nằm dưới chữ hoặc kéo ngang cả thẻ. Cần giữ title đọc được và CTA dễ bấm.

Điều hướng dưới gồm năm mục Khám phá / Bản đồ / Câu chuyện / Đã lưu / Tài khoản. Icon và label có trạng thái active. Năm mục không bị cắt khi chữ tăng, cho label wrap hoặc nav tăng chiều cao.

## 5. Mobile Bản đồ gọn

Dùng chuẩn ưu tiên mobile-map-compact.png.

| Vùng | Bố cục |
| --- | --- |
| Hàng 1 | Quay lại, tiêu đề Bản đồ kèm khu vực dropdown, Đăng tin |
| Hàng 2 | Tất cả / Cứu trợ / Thú lạc / Nhận nuôi, nút Bộ lọc |
| Map | Chiếm phần còn lại, ghim, zoom và định vị |
| Tóm tắt | Chỉ xuất hiện khi chọn ghim, hàng riêng |
| Navigation | Năm tab trong hàng riêng và safe area |

Ở 390×844 với cỡ chữ mặc định, nhắm chiều cao phần trên khoảng 104–116 CSS px, chưa tính status bar và safe area. Đây là ngân sách định hướng. Cho tăng chiều cao theo chữ và màn thấp, tránh khóa h để cắt nội dung. Ở 320px, giữ row filter cao một hàng với vùng cuộn ngang cục bộ nếu cần, để nút Bộ lọc cố định cuối hàng.

Dùng icon/label thú y trong panel Bộ lọc. Định vị nằm cạnh zoom trong vùng map. Bộ lọc phải hiển thị trạng thái bật thú y. Trạm cứu hộ, thú nhận nuôi và thú y giữ nhãn đúng dữ liệu.

Map flex/grid chiếm vùng còn lại. Khi chọn hoặc đóng tóm tắt, resize map bằng API provider và điều chỉnh camera chỉ khi cần. Chừa attribution, map controls và selected pin trong vùng nhìn.

Tóm tắt có thumbnail, title, địa điểm/nguồn, Xem chi tiết và nút bỏ chọn. Nội dung dài wrap, chọn phương án compact/scroll khi màn thấp. Không dành sẵn khoảng trắng khi chưa chọn tin.

Desktop Bản đồ dùng sidebar filter/list và map cạnh nhau. Tái dùng state lọc và chọn tin, không áp một bố cục điện thoại phóng to lên desktop.

## 6. Chi tiết và xem ảnh

Chi tiết là màn tác vụ trên mobile, có Quay lại và Lưu. Body cuộn, hàng CTA riêng có safe area. Header hiển thị vừa đủ. Ảnh, bộ đếm và Xem ảnh nằm ở các hàng rõ ràng.

Tin cộng đồng hiển thị người đăng, loại tin, vị trí, cập nhật, đặc điểm/nhu cầu và hành động theo quyền. Tin tổng hợp hiển thị nguồn và Đọc bài gốc nếu có URL.

Lightbox dùng portal ở root overlay phù hợp ứng dụng, header / image-stage minmax(0,1fr) / thumbnails. Dùng object-fit contain ở zoom mặc định. Chỉ layer trên cùng nhận input. Khóa cuộn theo vòng đời, đóng lightbox quay về đúng bài và vị trí đọc. Back/Escape đóng layer trên cùng trước. Thumbnail co giãn theo chiều rộng, chỉ strip thumbnail được cuộn ngang.

## 7. Đăng tin, tài khoản và câu chuyện

Đăng tin dùng các trường thực tế của loại tin. Các nhóm ảnh, vị trí, tiêu đề và mô tả theo thứ tự dễ hiểu. Giữ nháp và ảnh khi validation hoặc submit lỗi. Khi có bước Xem trước, chỉ gửi dữ liệu ở xác nhận cuối, chặn gửi lặp và khôi phục trạng thái nút sau lỗi.

Tài khoản xếp tiêu đề, trạng thái, mô tả, tab nội bộ và CTA theo chiều dọc trên mobile. Cho nhãn tab wrap. Khu vực kỷ niệm dùng mô tả và nút thành các hàng riêng.

Câu chuyện dùng trang kể chuyện liên tục, đoạn ngắn và minh họa nhỏ theo yêu cầu đã có. Giữ đường tới Khám phá và Bản đồ. Tránh dựng số liệu, kết quả đoàn tụ hoặc nhân vật không có dữ liệu.

## 8. Khung trang

Chọn một mô hình scroll nhất quán cho từng màn. Nếu dùng app-shell grid header / main / nav, đặt minmax(0,1fr), min-height:0 ở main và min-width:0 ở vùng co giãn. Main cuộn, nav có hàng riêng.

Nếu dùng body scroll + nav fixed, đo hoặc dùng token chiều cao nav để bù đúng một lần, tính safe area một lần. Dùng viewport động có fallback khi cần. Kiểm tra Safari khi thanh địa chỉ co/giãn và keyboard mở.

Không dùng overflow:hidden toàn trang để giấu lỗi. Kiểm tra tính toán chiều cao, flex-shrink và grid trên thẻ. Card nằm trong flex column cần chống shrink khi đang bị ép chiều cao.
