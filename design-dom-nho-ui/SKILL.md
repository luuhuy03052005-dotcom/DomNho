---
name: design-dom-nho-ui
description: Thiết kế, viết prompt, triển khai và rà soát giao diện Đốm Nhỏ cho cứu trợ động vật, tìm thú lạc và nhận nuôi theo mẫu kem–xanh rừng–cam đất. Dùng khi người dùng yêu cầu giao diện Đốm Nhỏ giống ảnh tham chiếu, tạo mockup desktop/mobile, thiết kế màn hình tiếp nối hoặc sửa responsive để nội dung, bản đồ và nút không che nhau.
---

# Đốm Nhỏ — giao diện có cảm xúc, thao tác rõ ràng

## 1. Xác định đầu ra

- Đọc yêu cầu mới nhất và chọn đúng đầu ra: prompt, ảnh mockup, màn hình thiết kế hoặc code.
- Chỉ tạo prompt nếu được yêu cầu viết prompt; chỉ sinh ảnh nếu được yêu cầu vẽ; chỉ thay code khi được yêu cầu triển khai.
- Giữ công nghệ, API, xác thực, dữ liệu và chức năng có sẵn khi sửa dự án; kiểm tra nguồn trước khi thay cấu trúc.
- Không tự biến yêu cầu giao diện thành xây backend, triển khai website hoặc đăng nội dung.
- Dùng tiếng Việt đúng dấu. Giữ tên dự án “Đốm Nhỏ”; dùng wordmark “đốm nhỏ” như ảnh.

## 2. Đọc nguồn thiết kế

1. Mở [ảnh mẫu](assets/dom-nho-desktop-mobile.png) bằng công cụ xem ảnh.
2. Đọc [đặc tả thiết kế](references/design-spec.md) trước khi dựng bố cục.
3. Đọc [bộ prompt](references/prompts.md) khi cần giao prompt cho AI tạo ảnh, công cụ thiết kế hoặc AI lập trình.
4. Đọc [responsive và nghiệm thu](references/responsive-qa.md) trước khi triển khai hoặc đánh giá đầu ra.

Lấy ảnh làm căn cứ cho bố cục, sắc thái và thứ bậc. Coi mã màu, kích thước, breakpoint trong tài liệu là thông số triển khai được đề xuất cho mẫu này, không phải số đo chính xác trích từ ảnh. Ưu tiên khả năng đọc và thao tác nếu ảnh mâu thuẫn với màn hình thực tế. Không hứa tái tạo pixel tuyệt đối từ ảnh sinh bằng AI.

## 3. Giữ nhận diện

- Dùng nền kem ấm, chữ xanh rất đậm, hành động chính xanh rừng, cam đất cho cứu trợ, sage cho nhận nuôi.
- Dùng sans-serif hỗ trợ dấu tiếng Việt; ưu tiên font sẵn có phù hợp hoặc Be Vietnam Pro nếu có thể cung cấp hợp lệ.
- Giữ hình ảnh chó mèo thật, minh họa nét mảnh nhỏ và thông điệp ngắn.
- Dùng bề mặt phẳng, viền nhẹ, góc bo vừa; dành bóng nhẹ cho phần cần tách lớp.
- Tránh gradient, kính mờ, hero chiếm màn hình, các khối số liệu vô nghĩa, mọi nút đều dạng viên thuốc và popup chồng lên ảnh.
- Dùng logo có sẵn nếu được cung cấp. Không tự coi logo trong ảnh mockup là bộ logo gốc hay cắt ảnh giao diện để thay logo chuẩn.

## 4. Dựng desktop

- Giữ header gồm logo, điều hướng “Khám phá / Bản đồ / Câu chuyện”, chọn khu vực, “Đăng tin”, tài khoản.
- Dùng hai cột nội dung: feed khoảng 2 phần, cột ngữ cảnh khoảng 1 phần.
- Đặt lời dẫn, tìm kiếm, bộ lọc, 4 danh mục và danh sách tin trong cột feed.
- Đặt bản đồ xem nhanh cùng nút “Mở bản đồ” và câu chuyện tìm được nhà trong cột ngữ cảnh.
- Dùng 2 thẻ tin mỗi hàng khi đủ chỗ. Giữ thẻ cùng cấu trúc và CTA thẳng hàng bằng layout nội dung, không bằng cắt chữ.
- Giữ dải thông điệp chia sẻ ở cuối phần nội dung. Không cố định nó đè lên feed.

## 5. Chuyển sang điện thoại

- Thu gọn header còn logo và “Đăng tin”.
- Dùng thứ tự: lời dẫn → khu vực → tìm kiếm và lọc → danh mục 2×2 → tiêu đề feed và sắp xếp → thẻ tin một cột.
- Giữ thanh dưới 4 mục: “Khám phá / Bản đồ / Đã lưu / Tài khoản”.
- Dành không gian thực cho thanh dưới và safe area. Cho nội dung cuộn tự nhiên khi màn hình thấp.
- Đưa bản đồ vào màn hình riêng. Không thu nhỏ giao diện desktop để nhét vào điện thoại.
- Không bắt buộc toàn bộ thẻ đầu phải nằm trong viewport. Bắt buộc có thể cuộn tới toàn bộ nội dung và CTA.
- Đặt nút chính và nút lưu dưới thông tin, không nổi trên ảnh.
- Giữ vùng chạm tối thiểu 44×44 CSS px, ưu tiên 48px; giữ khoảng cách giữa các hành động.
- Xử lý bàn phím, phóng to chữ, nhãn dài và chuyển ngang theo tài liệu nghiệm thu.

## 6. Giữ nghĩa của thẻ và bản đồ

- Hiển thị ảnh → loại tin và khoảng cách → tiêu đề → vị trí/thời gian → nhu cầu → hành động và lưu.
- Phân biệt cứu trợ, thú lạc, nhận nuôi bằng icon và nhãn, không chỉ màu.
- Hiển thị nguồn/tác giả khi dữ liệu có; phân biệt bài tự đăng và bài tổng hợp. Giữ liên kết nguồn khi có.
- Không tự gắn “đã xác minh”, suy đoán tuổi/tiêm phòng, tạo khoảng cách hay phần trăm hoàn thành.
- Đánh dấu dữ liệu mẫu là minh họa trong tài liệu hoặc chế độ demo; không chèn cảnh báo kỹ thuật vào luồng sản phẩm.
- Dùng tọa độ và provider bản đồ thật trong sản phẩm. Chỉ dùng bản đồ minh họa khi vẽ concept.
- Xin định vị sau thao tác phù hợp, cung cấp chọn khu vực khi bị từ chối; không bịa vị trí.

## 7. Quy trình thực hiện

1. Xác nhận phạm vi bằng yêu cầu hiện có; chỉ hỏi nếu thiếu đầu vào thật sự chặn công việc.
2. Lập bố cục mobile trước tại 390px, sau đó 360px và 320px.
3. Mở rộng sang tablet và desktop; kiểm tra header và thẻ ở độ rộng trung gian.
4. Dùng chung token và cấu trúc dữ liệu cho mọi kích thước.
5. Bổ sung trạng thái cần thiết: tải, rỗng, lỗi, ảnh lỗi, từ chối định vị, lưu thành công.
6. Với mockup, vẽ đúng bố cục và nêu đây là concept; không tuyên bố đã kiểm thử tương tác.
7. Với code, chạy và kiểm tra luồng thao tác thật; không để nút giả hoặc liên kết rỗng được trình bày như đã hoàn thiện.
8. Đánh giá theo các tiêu chí trong references/responsive-qa.md, sửa lỗi trước khi giao.
9. Báo ngắn gọn phần hoàn thành, phạm vi đã kiểm tra và giới hạn còn lại.

## 8. Điểm dừng chất lượng

Chỉ coi đầu ra đạt khi:
- Nhận ra cùng một sản phẩm ở desktop và mobile.
- Nội dung không tràn ngang; nút và văn bản không đè nhau.
- CTA cuối vẫn truy cập được khi có thanh dưới, safe area và màn hình thấp.
- Bản đồ, bộ lọc và chi tiết không làm mất đường quay lại feed.
- Không dùng ảnh chụp toàn giao diện như giao diện đã triển khai.
- Không bịa trạng thái xác minh, dữ liệu cứu trợ hoặc kết quả kiểm thử.
