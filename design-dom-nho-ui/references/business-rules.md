# Quy tắc nghiệp vụ và hành động

## 1. Phân biệt ba trục

- Loại tin mô tả nhu cầu như cứu trợ, thú lạc, nhận nuôi hoặc trạm.
- Nguồn mô tả người dùng tự đăng hay nội dung tổng hợp.
- Trạng thái mô tả đang mở, đã giải quyết, đã tìm thấy, đã nhận nuôi hoặc hết hiệu lực theo schema hiện có.

Đọc types, API và chính sách quyền trong source. Ánh xạ nhãn vào enum thực, tránh suy ra quyền hoặc tình trạng từ ảnh. Không coi mọi tin tổng hợp là nhận nuôi, mọi tin cứu hộ là SOS.

## 2. Ma trận hành động

| Trường hợp | CTA chính | Hành động phụ và điều kiện |
| --- | --- | --- |
| Tin cộng đồng đang mở | Xem chi tiết | Lưu, xem vị trí khi hợp lệ |
| Thú lạc cộng đồng | Báo đã nhìn thấy hoặc liên hệ theo luồng hiện có | Ghi nhận thông tin có chủ đích, xác nhận gửi theo API |
| Nhận nuôi cộng đồng | Xem thông tin / liên hệ nhận nuôi | Dùng chính sách hiện có, không tự tạo quy trình duyệt |
| Tin tổng hợp có URL | Đọc bài gốc | Xem chi tiết, lưu, attribution |
| Tin tổng hợp thiếu URL | Xem chi tiết | Thể hiện nguồn nếu biết, không tạo URL giả |
| Tin đã đóng | Xem kết quả theo dữ liệu | Giữ lưu/nguồn khi hợp lệ, loại bỏ hành động gửi yêu cầu không còn được hỗ trợ |
| Tin không có tọa độ | Xem thông tin khu vực | Hiển thị trong list, chỉ đưa lên map khi có vị trí phù hợp |
| Thú y / trạm | Xem thông tin địa điểm | Liên hệ/chỉ đường khi có dữ liệu và URL hợp lệ |

“Đăng nhập để liên hệ” trong ảnh là mẫu trạng thái khách. Đối chiếu auth thật. Nếu đã đăng nhập và được phép, mở liên hệ theo luồng đang có. Nếu đang là chủ tin, tránh đưa CTA liên hệ chính mình. Dùng cơ chế quyền server đang có khi truy cập thông tin bị giới hạn.

Nguồn tin và link gốc phải hiện rõ, mở URL theo chính sách dự án. Bảo vệ thông tin liên hệ theo quyền, tránh đưa liên hệ riêng tư vào thông báo hoặc log frontend.

## 3. Tìm kiếm và lọc

- Dùng query, category, nguồn, khu vực và sort như state có ý nghĩa rõ ràng.
- Khi đổi filter, cập nhật list và map từ cùng dữ liệu đã lọc.
- Khi tin chọn bị loại khỏi kết quả, bỏ chọn và đóng tóm tắt phù hợp.
- Loại kết quả fetch cũ khi người dùng đổi truy vấn nhanh.
- Giữ query/filter/view state khi quay lại từ Chi tiết.
- Cho chọn khu vực thủ công khi không có GPS. Chỉ tính khoảng cách từ vị trí hợp lệ, phân biệt gần đúng và chính xác theo dữ liệu.

## 4. Trạng thái bất đồng bộ

Loading, success, empty, partial và error phải theo kết quả thật. Tránh diễn giải HTTP 200 là thành công nếu payload báo lỗi.

Khi refresh thất bại, giữ dữ liệu hiện có, hiển thị lời nhắc thử lại. Toast không tràn ngang và không báo thành công khi API lỗi. Chi tiết máy chủ chỉ log server theo quy tắc dự án.

Nếu phát hiện EROFS, truy từ thông báo tới code ghi file. Xác định dữ liệu tạm hay cần lưu bền vững. Dùng bộ nhớ/tệp tạm chỉ cho dữ liệu có thể mất. Với dữ liệu phải tồn tại qua request, dùng kho đã có hoặc nêu rõ nhu cầu bổ sung, không coi thư mục tạm là lưu trữ bền vững.

Dedupe cập nhật, chặn submit lặp theo luồng thật, giữ nháp khi lỗi. Thông báo “Cách bạn” chỉ ghép một lần và format khoảng cách thống nhất.
