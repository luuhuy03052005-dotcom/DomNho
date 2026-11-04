# Đặc tả thiết kế Đốm Nhỏ

## Mục lục

1. Ý đồ và giới hạn
2. Token
3. Desktop
4. Điện thoại và tablet
5. Thành phần
6. Nội dung mẫu
7. Các màn hình tiếp nối

## 1. Ý đồ và giới hạn

Thiết kế một nơi giúp người xem trả lời nhanh: bé nào cần giúp, ở đâu, cần gì và mình có thể làm gì. Dùng cảm xúc từ ảnh động vật và câu chữ cụ thể. Giữ giao diện bình tĩnh, không gây áp lực bằng thông báo khẩn giả.

Dùng cả hai ảnh trong assets/ ở gốc skill: dom-nho-desktop-mobile.png cho Khám phá và dom-nho-mobile-flows.png cho ba màn mobile còn lại. Tái hiện cảm giác và thứ tự thông tin; đừng sao chép lỗi bản đồ, chữ hoặc chi tiết sai trong ảnh. Không dùng nhãn “DESKTOP / ĐIỆN THOẠI” trong sản phẩm; chúng chỉ là chú thích bảng trình bày mockup.

## 2. Token triển khai đề xuất

### Màu

| Token | Giá trị | Công dụng |
| --- | --- | --- |
| canvas | #FAF7F1 | Nền trang kem |
| surface | #FFFFFF | Thẻ, input, hộp thoại |
| surface-muted | #F1EFE8 | Nền danh mục chưa chọn |
| ink | #142820 | Chữ chính |
| ink-secondary | #52605A | Mô tả, metadata |
| brand | #0E513B | Nút chính, mục đang chọn |
| brand-hover | #0A412F | Hover nút |
| brand-soft | #E8EFE6 | Nhãn nhận nuôi |
| rescue | #AF421F | Chữ/icon cứu trợ |
| rescue-soft | #FFF0E5 | Nền nhãn cứu trợ |
| lost | #80570D | Chữ/icon thú lạc |
| lost-soft | #FFF3D8 | Nền nhãn thú lạc |
| accent | #D8724D | Minh họa hoặc trang trí nhỏ |
| border | #DDDCD4 | Viền, đường phân cách |
| focus | #176CBA | Vòng focus bàn phím |

Kiểm tra tương phản ở cặp màu dùng thật; không mặc định mọi phối hợp token đều đạt. Không đặt chữ trắng nhỏ trên accent. Dùng chữ rescue trên rescue-soft thay vì chữ cam nhạt trên trắng.

### Typography, spacing và hình khối

- Ưu tiên Be Vietnam Pro; dùng fallback system sans-serif nếu font chưa sẵn. Kiểm tra dấu và font-weight thực có.
- Body/input 16px, line-height 1.5; metadata 14px; nhãn phụ tối thiểu 12px với tương phản rõ.
- H1 desktop 32–38px, 700–800, line-height 1.2; H1 mobile 24–28px, cho xuống dòng.
- Section 22–24px; tiêu đề thẻ 20px; CTA 15–16px, 600–700.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40px.
- Mobile gutter 16px, 320px có thể 12px; desktop gutter 24–40px.
- Radius: nút/input 10px, thẻ 12–14px; không bo tròn mọi thành phần.
- Border 1px; shadow nhẹ, ví dụ 0 3px 14px rgb(20 40 32 / 5%).
- Icon thống nhất một bộ, 20–24px; không trộn emoji vào điều hướng.
- Input, nút chính cao 48–52px; ô nút lưu 48×48px.
- Không tự tải thêm dependency chỉ để vẽ icon đơn giản nếu dự án đã có hệ icon.

## 3. Desktop — từ 1200px

Dùng max-width nội dung 1440px, căn giữa. Header trong luồng trang, cao tối thiểu 72–80px, không ép chiều cao khi chữ tăng.

Header: logo dấu chân và wordmark “đốm nhỏ” bên trái; Khám phá, Bản đồ, Câu chuyện, Đã lưu ở giữa; chọn khu vực và “+ Đăng tin” bên phải. Nếu cần giữ mục tài khoản của dự án, dùng avatar hoặc menu theo không gian thực tế.

Bên dưới dùng grid:
- Feed: minmax(0, 2fr).
- Cột phải: minmax(300px, 1fr), gap 24px.
- Lời dẫn, toolbar, danh mục, heading feed và thẻ thuộc cột feed.
- Bản đồ cột phải bắt đầu gần ngang lời dẫn.
- Hai thẻ trong feed: grid repeat(2, minmax(0, 1fr)), gap 16–20px.

Lời dẫn: nhãn nhỏ “QUANH BẠN”, tiêu đề “Mỗi bé, một cơ hội.”
Dòng phụ: “Cứu trợ, tìm thú lạc và nhận nuôi quanh bạn.”
Thêm minh họa chó mèo nét mảnh ở cạnh phải nếu còn không gian; ẩn khi chật.

Toolbar: search flex-grow, nút Bộ lọc 100–120px. Danh mục: 4 ô bằng nhau; icon kèm nhãn. Heading feed trái, sort phải.

Bản đồ: card riêng, heading “Các bé quanh bạn”, ảnh/map area tỷ lệ khoảng 4:5 hoặc chiều cao clamp theo chiều rộng. Nút “Mở bản đồ →” dưới map, ở hàng riêng. Map ảnh minh họa chỉ được dùng ở mockup/demo có phân biệt; bản chạy dùng dữ liệu/provider thật và attribution hợp lệ.

Câu chuyện dưới bản đồ: panel nền sage, tiêu đề “Câu chuyện của Đốm Nhỏ”, đoạn ngắn về việc gom tin cứu hộ để người ở gần dễ tìm và hỗ trợ. Dùng minh họa mèo nét mảnh bên phải và link “Đọc câu chuyện →”.

## 4. Điện thoại và tablet

| Viewport | Bố cục |
| --- | --- |
| 320–767px | Một cột, danh mục 2×2, thanh điều hướng dưới, bản đồ ở màn riêng |
| 768–1199px | Feed rộng 1 cột khu vực chính; 2 thẻ/hàng nếu mỗi thẻ đủ 280px; bỏ cột map, dùng nút mở map trong luồng |
| ≥1200px | Feed 2 thẻ/hàng + cột ngữ cảnh; header đầy đủ |

Ở tablet dùng header gọn, không bắt toàn bộ nav desktop chen vào. Nếu dùng nav trên tablet thì không đồng thời lặp lại thanh dưới cùng chức năng.

Thứ tự mobile:
1. Header logo và “Đăng tin”.
2. Nhãn “QUANH BẠN”, tiêu đề “Mỗi bé, một cơ hội.” và dòng mô tả.
3. Chọn khu vực full-width.
4. Search và nút lọc vuông.
5. 4 danh mục 2×2.
6. “Tin quanh bạn” và sắp xếp “Gần nhất”.
7. Thẻ một cột.
8. Thanh dưới 4 mục trong vùng dành sẵn.

Mobile ẩn slogan header. Minh họa nhỏ bên cạnh khu vực là tùy chọn và ẩn khi chật. Không ép headline một dòng. Không hiển thị map xem nhanh xen giữa search và thẻ. Bảo toàn filter, vùng chọn và vị trí cuộn khi chuyển feed ↔ map.

Không dựng cả desktop và mobile song song trên trang thật; chỉ dùng hai viewport cạnh nhau trong ảnh trình bày.

## 5. Thành phần

### Thẻ tin

Đặt ảnh landscape tỷ lệ 16:9, object-fit cover, không bóp méo hoặc cắt mất mặt chủ thể. Ảnh nằm trên, không overlay nhãn hay nút. Khi ảnh lỗi, giữ tỷ lệ và hiện placeholder có nghĩa.

Body padding 12–16px; gap 8–12px:
1. Badge loại tin bên trái; khoảng cách bên phải nếu biết.
2. Tiêu đề diễn đạt nhu cầu thật.
3. Vị trí, thời gian; thêm thông tin tuổi/tiêm phòng chỉ khi có dữ liệu.
4. Mô tả ngắn.
5. Nguồn nếu cần phân biệt bài tổng hợp/bài tự đăng.
6. Nút “Xem chi tiết” co giãn, nút “Nguồn” nếu có URL và nút lưu 48px, gap 8px. Cho hàng nút xuống dòng ở màn rất hẹp hoặc khi phóng to chữ.

Dùng flex column cho body; action margin-top:auto để các thẻ desktop thẳng hàng. Cho metadata wrap. Không set height cứng để cắt body. Trên trang danh sách có thể giới hạn phần tóm tắt với đường dẫn xem đầy đủ, nhưng không cắt nhãn trạng thái hoặc CTA.

### Điều hướng

- Khám phá: paw/compass; Bản đồ: map; Đã lưu: heart; Tài khoản: user.
- Hiện icon + nhãn. Dùng aria-current cho trang hiện tại, aria-pressed cho nút danh mục/lưu.
- Không làm toàn thẻ là button có button con. Dùng link tiêu đề/ảnh và button lưu độc lập.
- Label nút lưu: “Lưu bài viết” / “Bỏ lưu bài viết” kèm tên bài nếu cần phân biệt.
- Không chỉ dựa vào hover; mobile không có hover.

### Danh mục và lọc

Tất cả / Cứu trợ / Thú lạc / Nhận nuôi. Mục chọn nền brand, chữ trắng; các mục khác surface-muted. Icon thể hiện nghĩa, màu phân loại phụ trợ.

Filter không tự mở khi vừa vào trang. Có áp dụng/xóa lọc và số bộ lọc đang dùng. Sắp xếp dùng lựa chọn thật, không chỉ đổi nhãn.

## 6. Nội dung minh họa

Dùng các mục sau để dựng mockup. Khi tích hợp, lấy ảnh, nguồn, thời gian, khoảng cách và trạng thái từ dữ liệu dự án.

| Thuộc tính | Bài về chó | Bài về chim cú |
| --- | --- | --- |
| Nhãn | Tin cứu hộ | Tin cứu hộ |
| Tiêu đề | Mái ấm cho những chú chó bị bỏ rơi | Giải cứu chim cú ở TP.HCM |
| Địa điểm và nguồn | Bình Quới · Kenh14 | Tân Sơn Hòa · Dân Trí |
| Ảnh | Người chăm sóc đang bế chó nâu | Chim cú cạnh cây xanh |
| Hành động | Xem chi tiết · Nguồn · Lưu | Xem chi tiết · Nguồn · Lưu |

Các bài trên là tin tổng hợp, không tự đánh dấu cần cứu khẩn cấp hoặc đã xác minh. Khu vực mẫu là “Thủ Đức, TP.HCM”. Bản đồ và vị trí ghim trong ảnh chỉ minh họa bố cục. Không chép tài khoản hay địa chỉ cá nhân từ ảnh chụp màn hình.

## 7. Màn hình tiếp nối

### Bản đồ mobile

- Header có quay lại, “Bản đồ” và định vị. Hàng tiếp theo có khu vực và bộ lọc Cứu trợ / Thú lạc / Nhận nuôi.
- Vùng bản đồ nằm trong một hàng riêng. Dùng icon kèm màu cho loại ghim. Thể hiện nút phóng to, thu nhỏ và attribution của nhà cung cấp.
- Khi chọn ghim, hiện tóm tắt dưới bản đồ: ảnh nhỏ, loại tin, tiêu đề, địa điểm/nguồn và “Xem chi tiết”. Cho bỏ chọn. Resize bản đồ và căn lại camera để ghim còn nhìn thấy.
- Thanh điều hướng bốn mục nằm dưới vùng nội dung. Khi màn hình thấp, cho phần tóm tắt cuộn hoặc thu gọn và giữ đường mở chi tiết.

### Chi tiết tin

- Header quay lại và “Chi tiết tin”. Ảnh 16:9 hoặc tỷ lệ gốc hợp lý. Nếu có nhiều ảnh, đặt bộ đếm “1 / 3” và nút chuyển ảnh ở hàng riêng.
- Hiện loại tin, tiêu đề, khu vực, nguồn và mô tả. Dùng “Xem trên bản đồ” khi có vị trí hợp lệ.
- Với bài tổng hợp có URL, hàng cuối dùng “Đọc bài gốc” và nút Lưu. Với bài tự đăng, hiển thị hành động phù hợp dữ liệu và quyền xem. Không tạo liên hệ giả.
- Không lặp thanh điều hướng chính. Body cuộn và hàng hành động nằm ngoài vùng cuộn, chừa safe area.

### Đăng tin

- Header quay lại và “Đăng tin”. Thứ tự như ảnh: Loại tin → Hình ảnh → Vị trí → Tiêu đề → Mô tả.
- Dùng ba lựa chọn Cứu trợ / Thú lạc / Nhận nuôi, “Thêm ảnh”, “Chọn vị trí trên bản đồ”, “Nhập tiêu đề”, “Bé đang cần hỗ trợ gì?”. Giữ các trường bổ sung của dự án khi chúng cần cho loại tin đang chọn.
- Đặt nút chính ở hàng riêng. Khi được yêu cầu làm luồng Xem trước, kiểm tra dữ liệu trước khi mở, giữ bản nháp nếu quay về sửa và chỉ gửi ở nút “Đăng tin” cuối. Khi chỉ đổi giao diện và source chưa có Xem trước, giữ nút gửi đang hoạt động và nêu khác biệt khi bàn giao.
- Đặt lỗi cạnh trường, đưa trường lỗi đầu tiên vào vùng nhìn, giữ nội dung đã nhập khi tải ảnh hoặc gửi lỗi.

### Các mục còn lại

Giữ Đã lưu, Câu chuyện và Tài khoản theo tính năng thực của dự án. Áp dụng cùng kiểu thẻ và các trạng thái tải, rỗng, lỗi. Mở rộng thiết kế khi người dùng yêu cầu các màn này.
