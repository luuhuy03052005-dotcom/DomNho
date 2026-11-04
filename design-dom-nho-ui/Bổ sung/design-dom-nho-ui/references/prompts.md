# Prompt triển khai bộ giao diện Đốm Nhỏ

Đính kèm hai ảnh trong assets/ ở gốc skill. Dùng đặc tả và checklist trong references/ để giải quyết chi tiết không thể hiện rõ trong ảnh.

## Prompt cho AI lập trình

Dùng $design-dom-nho-ui để làm giao diện “Mỗi bé, một cơ hội.” trong source Đốm Nhỏ. Dựng màn Khám phá desktop/mobile và ba màn mobile Bản đồ, Chi tiết tin, Đăng tin theo hai ảnh trong skill.

1. Đọc hướng dẫn repo và tìm entry point, các component hiện có của Khám phá, Bản đồ, Chi tiết tin, Đăng tin. Đối chiếu props và luồng dữ liệu trước khi sửa. Giữ stack, route, API, cách lọc tin, định vị, ảnh, nguồn, lưu và xác thực của dự án. Tách thay đổi UI khỏi tính năng mới.
2. Áp dụng nền kem #FAF7F1, chữ #142820, nút #0E513B, cam đất cho cứu trợ, vàng đất cho thú lạc, sage cho nhận nuôi. Dùng chung token và bộ icon dự án. Dùng logo có sẵn.
3. Khám phá desktop dùng feed hai thẻ mỗi hàng, cạnh cột “Bản đồ quanh bạn” và “Câu chuyện của Đốm Nhỏ”. Giữ tìm kiếm, Bộ lọc, các danh mục và sắp xếp. Ảnh nằm trên, thông tin và hàng Xem chi tiết / Nguồn / Lưu nằm dưới.
4. Khám phá mobile dùng một cột, danh mục 2×2 và thanh điều hướng dưới có hàng riêng. Chuyển bản đồ sang màn riêng. Cho nội dung cuộn và nút xuống hàng khi cần.
5. Bản đồ mobile giữ bộ lọc và định vị. Chọn ghim hiện tóm tắt ở hàng dưới bản đồ, căn lại camera để ghim còn trong vùng nhìn. Quay lại Khám phá giữ khu vực, bộ lọc và vị trí cuộn phù hợp.
6. Chi tiết tin dùng ảnh, loại tin, tiêu đề, vị trí, nguồn, mô tả. Với bài tổng hợp, chỉ mở bài gốc khi có URL hợp lệ. Chỉ hiển thị hành động liên hệ và xem trên bản đồ khi dữ liệu hỗ trợ. Đặt nút chính và nút lưu ở hàng cuối có safe area.
7. Đăng tin dùng thứ tự loại tin, ảnh, vị trí, tiêu đề, mô tả và giữ các trường thực tế của form. Đặt nút chính trong hàng riêng. Làm bước Xem trước nếu được yêu cầu đổi cả luồng. Ở bước xem trước, quay lại sửa được, không mất bản nháp và chỉ gửi khi bấm Đăng tin.
8. Chạy các kiểm tra dự án. Kiểm tra mobile 320/360/390/430px và desktop 1440px, thêm viewport tablet nếu thay bố cục trung gian. Cuộn đến nút cuối, thử tiêu đề dài, đổi bộ lọc, chọn ghim, mở chi tiết và quay lại. Kiểm tra bàn phím, safe area, định vị bị từ chối và lỗi form ở mức môi trường cho phép. Báo rõ phần đã kiểm tra.

Dùng dữ liệu thật của app. Hai bài cứu hộ, hình ảnh và bản đồ trong mockup là dữ liệu để tham chiếu. Không thay nguồn dữ liệu chạy bằng danh sách mẫu. Không gắn nhãn khẩn cấp hoặc xác minh dựa vào ảnh.

## Prompt cho AI thiết kế hoặc tạo ảnh

Thiết kế Đốm Nhỏ theo hai ảnh đính kèm. Dùng wordmark “đốm nhỏ”, nền kem, xanh rừng, cam đất và minh họa chó mèo nét mảnh. Dựng đúng phạm vi được yêu cầu, mỗi viewport là một giao diện thực tế có lề và khoảng cách rõ ràng.

- Bảng Khám phá có desktop lớn bên trái, mobile bên phải. Dùng tiêu đề “Mỗi bé, một cơ hội.”, hai thẻ tin cứu hộ trên desktop và một cột trên mobile. Desktop có bản đồ và câu chuyện dự án, mobile có điều hướng dưới. Đặt nhãn và thao tác dưới ảnh.
- Bảng mobile có ba màn Bản đồ, Chi tiết tin, Đăng tin. Tóm tắt ca nằm dưới bản đồ. Chi tiết có ảnh, nguồn và “Đọc bài gốc”. Form có Loại tin, Hình ảnh, Vị trí, Tiêu đề, Mô tả và “Xem trước” như ảnh mẫu.
- Giữ nhãn tiếng Việt đúng dấu. Dùng hàng riêng cho nút cuối và thanh điều hướng, không làm chúng chồng lên nội dung. Cho chữ xuống dòng. Dùng bản đồ minh họa có ít nhãn và ghim dễ phân biệt.

## Prompt sửa responsive

Dùng $design-dom-nho-ui để sửa lỗi [mô tả lỗi] ở màn [tên màn], viewport [chiều rộng × chiều cao]. Tái hiện lỗi. Kiểm tra vùng cuộn, chiều cao header/footer, safe area, kích thước vùng chạm và khả năng xuống dòng. Sửa nguyên nhân khiến nút hoặc ghim bị che. Kiểm tra lại đúng kích thước lỗi và hai kích thước lân cận. Giữ nguyên luồng nghiệp vụ ngoài phạm vi sửa.
