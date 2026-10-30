# Bộ prompt dùng lại

## Mục lục

1. Prompt chính: thiết kế giao diện
2. Prompt vẽ bằng AI tạo ảnh
3. Prompt triển khai vào source có sẵn
4. Prompt sửa responsive

Điền phần trong ngoặc vuông trước khi gửi. Đính kèm ảnh assets/dom-nho-desktop-mobile.png từ gốc skill khi công cụ hỗ trợ. Không yêu cầu công cụ sinh ảnh tạo HTML/CSS có thể chạy; phân biệt mockup hình ảnh với sản phẩm tương tác.

## 1. Prompt chính — thiết kế chi tiết

Bạn là senior product designer phụ trách nền tảng Đốm Nhỏ: kết nối cứu trợ chó mèo, tìm thú lạc và nhận nuôi. Hãy thiết kế giao diện theo ảnh tham chiếu, có cùng nhận diện trên desktop và điện thoại.

Đầu ra: [mockup hình ảnh / màn hình thiết kế / đặc tả]. Làm màn Khám phá trước. Nếu chưa được yêu cầu, không tự xây backend hoặc xuất bản website.

### Mục tiêu

Để người xem biết ngay: bé nào cần giúp, ở gần đâu, đang cần gì và bấm vào đâu để tìm hiểu cách hỗ trợ. Tạo cảm giác gần gũi, đáng tin và có bản sắc. Ưu tiên tính sử dụng thật trên điện thoại. Không biến trang thành landing page quảng cáo hoặc dashboard thống kê.

### Nhận diện

Dùng nền kem #FAF7F1, card trắng, chữ #142820, hành động chính xanh rừng #0E513B, mô tả #52605A. Dùng cam đất cho cứu trợ, sage cho nhận nuôi, màu đất vàng cho thú lạc. Xem các mã màu này là token định hướng, kiểm tra tương phản khi triển khai.

Dùng Be Vietnam Pro hoặc sans-serif tương đương hỗ trợ dấu Việt. Chữ body/input 16px, tiêu đề thẻ 20px, section 22–24px; H1 desktop 32–38px và mobile 24–28px. Không ép headline thành một dòng.

Dùng khoảng trắng có nhịp 8/16/24/32px, góc bo 10–14px, viền mảnh, shadow rất nhẹ. Icon đơn giản nhất quán. Dùng ảnh chó mèo tự nhiên; minh họa chó mèo nét mảnh nhỏ ở lời dẫn desktop.

Tránh gradient, kính mờ, tím neon, nút viên thuốc khắp nơi, banner kêu gọi khổng lồ, popup chen nội dung, stock photo người không liên quan và số liệu từ thiện tự bịa. Không đặt chữ hoặc nút lưu lên ảnh động vật.

### Desktop

Thiết kế ở 1440×1000 hoặc viewport phù hợp, nội dung max-width 1440px, gutter 24–40px.

Header:
- Logo/wordmark “đốm nhỏ” và slogan nhỏ “KẾT NỐI NHỮNG ĐIỀU TỬ TẾ”.
- Điều hướng “Khám phá”, “Bản đồ”, “Câu chuyện”; Khám phá đang chọn.
- Chọn vùng “Thủ Đức, TP.HCM”, nút “+ Đăng tin” và avatar.
- Header thấp, thoáng, không là thanh viên thuốc nổi.

Dùng grid hai cột, feed khoảng 2/3 và ngữ cảnh khoảng 1/3, gap 24px.

Cột feed:
1. Lời dẫn “Một kết nối nhỏ. Một mái ấm mới.” và dòng phụ “Cứu trợ, tìm thú lạc và nhận nuôi quanh bạn.”
2. Search “Tìm bé, khu vực…” và nút “Bộ lọc”.
3. Bốn danh mục bằng nhau: “Tất cả”, “Cứu trợ”, “Thú lạc”, “Nhận nuôi”. Tất cả đang chọn.
4. Hàng tiêu đề “Cần bạn hôm nay” và sort “Gần nhất”.
5. Hai card cạnh nhau. Mỗi card có ảnh landscape, badge và khoảng cách dưới ảnh, tiêu đề, metadata, mô tả, CTA và nút lưu riêng.
6. Dải thông điệp cuối “Không thể đón bé? Một lượt chia sẻ cũng là một cơ hội.”

Card Mướp:
- Ảnh mèo con vàng trắng.
- Badge “CẦN CỨU TRỢ”; khoảng cách mẫu “0,8 km”.
- Tiêu đề “Mướp cần người đón”.
- “Linh Chiểu · 20 phút trước”.
- “Cần đưa bé đến phòng khám.”
- Nút “Xem cách giúp bé →” và nút tim viền.

Card Bông:
- Ảnh chó lông kem thân thiện.
- Badge “CHỜ NHẬN NUÔI”; khoảng cách mẫu “3,2 km”.
- “Bông chờ một mái nhà”.
- “Bình Thạnh · 8 tháng · Đã tiêm phòng”.
- “Bé hiền lành, thân thiện với người và thú khác.”
- “Tìm hiểu về Bông →” và nút lưu riêng.

Cột phải:
- Card “Các bé quanh bạn”, bản đồ nền sáng, sông xanh dịu, ít nhãn, marker phân biệt bằng màu VÀ hình.
- Nút “Mở bản đồ →” nằm ở hàng riêng dưới bản đồ.
- Card câu chuyện nhỏ “MỘT TIN VUI NHỎ”, “Milo đã tìm được nhà”, thumbnail và “Đọc câu chuyện →”.

### Điện thoại

Thiết kế mobile ở 390×844, cho phép nội dung cuộn. Không thu nhỏ desktop. Không ép toàn bộ nội dung vào một ảnh nếu phải giảm chữ hoặc giấu CTA.

Thứ tự:
1. Header logo trái, nút “+ Đăng tin” phải.
2. “Gần bạn, có bé cần giúp.”
3. Hàng chọn vị trí full-width.
4. Search co giãn và nút Bộ lọc 48×48px.
5. Bốn danh mục trong grid 2×2, cao tối thiểu 48px.
6. “Cần bạn hôm nay” và sắp xếp.
7. Feed một cột, cùng card Mướp như desktop. Ảnh 16:9, body đủ chỗ, metadata wrap, CTA và tim nằm dưới mô tả.
8. Thanh dưới bốn mục “Khám phá / Bản đồ / Đã lưu / Tài khoản”, icon kèm nhãn. Chừa vùng layout riêng và safe area; không che card.

Ẩn bản đồ xem nhanh và minh họa ở mobile; tab Bản đồ mở màn riêng. Giữ khu vực, bộ lọc và vị trí cuộn khi quay về feed. Không dùng FAB hoặc bottom sheet tự bật phủ card.

### Quy tắc bắt buộc

- Vùng chạm tối thiểu 44×44px, ưu tiên 48px; khoảng cách nút tối thiểu 8px.
- Không tràn ngang ở 320px. Không cắt chữ bằng fixed height.
- Cho scroll nếu màn hình thấp hoặc phóng chữ; không coi “cuộn xuống để thấy CTA” là lỗi.
- Chỉ giữ thanh dưới cố định khi đã bù đúng chiều cao và safe area.
- Khi bàn phím mở, input vẫn nhìn thấy; CTA/hộp thoại không bị kẹt dưới keyboard.
- Bộ lọc trên mobile có body cuộn và hàng Áp dụng trong layout riêng, có đóng và quay lại.
- Thể hiện loading, empty, error, ảnh lỗi, lưu/bỏ lưu và định vị bị từ chối.
- Không bịa “đã xác minh”, số liệu, địa chỉ, tuổi hoặc tình trạng y tế cho dữ liệu thật.
- Dùng nội dung ví dụ như dữ liệu minh họa; bản đồ concept không dùng làm nguồn tọa độ thực.

Hãy hoàn thành thiết kế, tự rà lại bố cục desktop/mobile và sửa mọi điểm đè lên nội dung. Khi bàn giao, nêu rõ đâu là mockup và đâu là tương tác đã triển khai.

## 2. Prompt vẽ bằng AI tạo ảnh

Use the attached image as the visual reference for a responsive Vietnamese animal welfare application called “Đốm Nhỏ”. Create one polished high-resolution design presentation with two flat UI screenshots side by side: a large desktop view on the left and a readable phone view on the right. Label them DESKTOP and ĐIỆN THOẠI outside the UI. No browser chrome, no device frames, no perspective.

Match the reference's warm ivory canvas, deep forest green actions, dark ink typography, muted apricot rescue accents, white cards, modest rounded corners and delicate dog/cat line drawing. Use natural photos of the same ginger-white kitten and cream dog across views. Use modern sans-serif typography with correct Vietnamese accents. Avoid glassmorphism, gradients, large decorative heroes and generic charity dashboards.

Desktop: slim header with logo “đốm nhỏ”, navigation Khám phá / Bản đồ / Câu chuyện, location, Đăng tin and avatar. Content has a two-thirds feed and one-third contextual column. Feed includes the headline “Một kết nối nhỏ. Một mái ấm mới.”, short subtitle, search, filter button, four categories Tất cả / Cứu trợ / Thú lạc / Nhận nuôi, heading “Cần bạn hôm nay”, sort and two photo cards. Each card puts its status below the photo, then title, location, concise need and a green action button with separate heart-save button. Show “Mướp cần người đón” and “Bông chờ một mái nhà”. Right column has a pale map card, a dedicated “Mở bản đồ” button below the map, and a small success story “Milo đã tìm được nhà”. Place the sharing message in normal flow below cards.

Phone: header with logo and Đăng tin; compact headline “Gần bạn, có bé cần giúp.”; full-width location selector; search and square filter button; 2×2 category grid; section heading; one-column kitten card. Buttons must be large and legible. Keep all text, status and actions below the photo. Show a complete first card only if it fits naturally without shrinking typography. Otherwise show a natural scroll continuation. Bottom navigation has a dedicated opaque layout region with safe-area breathing room and four icon-plus-label items Khám phá / Bản đồ / Đã lưu / Tài khoản. No part of the navigation overlaps the card or actions. Do not show a mini map or side-by-side feed on the phone. Never float buttons over pet photos. All visible controls have enough room for a finger.

Make the two views clearly the same product, with intentional spacing and warm character. This is a visual concept with illustrative data, not proof of working responsive behavior. Produce only the requested design image.

## 3. Prompt triển khai vào source có sẵn

Hãy dùng skill design-dom-nho-ui, ảnh tham chiếu và đặc tả đi kèm để xây lại giao diện Đốm Nhỏ trong source hiện có.

Trước khi sửa, đọc cấu trúc dự án, hướng dẫn repo, route, component, style, map provider, nguồn dữ liệu và các thao tác search/filter/save/detail/post. Giữ stack và business logic đang hoạt động. Không đổi API/schema/auth vì yêu cầu chỉ về giao diện. Không tự deploy.

Triển khai đúng bố cục desktop/mobile trong references/design-spec.md. Chia component theo trách nhiệm: header, lời dẫn, location selector, search/filter, category group, feed, pet card, map preview, success story và mobile navigation; tái dùng component có sẵn nếu phù hợp. Dùng một nguồn dữ liệu cho mọi viewport.

Dùng token tập trung. Dùng semantic HTML, focus rõ, label tiếng Việt, aria-current/pressed, ảnh alt có nghĩa. Không gộp button con vào link/button bọc toàn thẻ. Giữ nguồn tin và trạng thái thật. Không để nút chỉ đẹp nhưng không có hành vi; nếu phụ thuộc API chưa có, báo rõ phần chưa hoàn thiện.

Dùng layout mobile một cột; nội dung cuộn tự nhiên. Dành chỗ thật cho bottom navigation và safe area. Khi bàn phím mở, bảo đảm input và hàng hành động còn truy cập được. Cho card cao theo nội dung, metadata wrap và ảnh giữ tỷ lệ. Không dùng overflow:hidden trên body chỉ để che lỗi tràn ngang.

Kiểm tra theo references/responsive-qa.md: 320/360/390/430/768/1024/1440px, màn hình thấp, chữ phóng 200%, bàn phím và route quay lại. Kiểm tra tương tác thật: search, filter, sort, lưu/bỏ lưu, chi tiết, chuyển map/feed, định vị bị từ chối, đăng tin. Chỉ thêm kiểm tra phù hợp phạm vi thay đổi. Bàn giao screenshot nếu công cụ cho phép và báo chính xác cái đã chạy, lỗi còn lại; không gọi bản dựng tĩnh là hoàn thiện backend.

## 4. Prompt sửa responsive

Dùng skill design-dom-nho-ui để sửa lỗi responsive của Đốm Nhỏ, giữ nhận diện và chức năng hiện có. Lỗi quan sát: [mô tả lỗi]. Viewport: [width × height]. Route: [đường dẫn].

Tìm nguyên nhân từ layout, fixed/sticky, safe area, text wrapping, visual viewport, keyboard và z-index. Sửa đúng nguyên nhân; không che lỗi bằng cắt chữ, thu nhỏ toàn trang, chặn scroll hoặc bỏ chức năng. Dành chỗ cho bottom nav một lần, tránh cộng safe area hai lần. Giữ CTA cuộn tới được trên màn hình thấp. Ghi lại cách tái hiện, sửa và kiểm tra lại ở viewport lỗi cùng hai kích thước lân cận.
