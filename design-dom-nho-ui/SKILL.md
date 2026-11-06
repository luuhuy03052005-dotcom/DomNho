---
name: design-dom-nho-ui
description: Thiết kế và triển khai UI/UX Đốm Nhỏ theo mẫu desktop ba cột, mobile dễ thao tác và bản đồ hai hàng điều khiển gọn. Dùng khi xây hoặc sửa Khám phá, Bản đồ, Chi tiết, ảnh, Đăng tin, Tài khoản, sai hành động nghiệp vụ, lỗi responsive iPhone Safari hoặc giật lag. Bao gồm quy tắc tin cộng đồng/tổng hợp, kiểm tra tương tác và đo hiệu năng trước–sau.
---

# Đốm Nhỏ — UI/UX và hiệu năng

## Chọn đúng đầu ra

- Thực hiện đầu ra người dùng yêu cầu gồm prompt, mockup, đặc tả hoặc sửa source.
- Đọc hướng dẫn dự án và nguồn hiện tại trước khi thay code. Tái dùng stack, provider bản đồ, route, state, API và component khi phù hợp.
- Khi chỉ tạo skill hoặc ảnh, mô tả tiêu chí nghiệm thu. Chỉ công bố kết quả chạy ứng dụng khi có bằng chứng đã chạy.
- Dùng tiếng Việt đúng dấu và tên Đốm Nhỏ. Giữ quyền truy cập, trạng thái nghiệp vụ và khả năng dùng bàn phím.

## Nguồn thiết kế và thứ tự ưu tiên

Mở các ảnh khi thiết kế hoặc triển khai.

1. [Bản đồ mobile gọn](assets/mobile-map-compact.png) là chuẩn cao nhất cho Bản đồ mobile.
2. [Khám phá desktop](assets/desktop-explore.png) quy định bố cục ba cột.
3. [Khám phá và Chi tiết mobile](assets/mobile-explore-detail.png) quy định thẻ tin và chi tiết.

Trong ảnh thứ ba, màn Bản đồ ở giữa đã được thay bằng ảnh số một. Dùng năm mục điều hướng mobile gồm Khám phá, Bản đồ, Câu chuyện, Đã lưu, Tài khoản. Thông số pixel và breakpoint trong tài liệu là lựa chọn triển khai, không phải số đo chính xác từ bitmap.

Đọc tài liệu theo công việc.

- [Đặc tả UI](references/design-spec.md) cho token, desktop/mobile và các màn tiếp nối.
- [Quy tắc nghiệp vụ](references/business-rules.md) trước khi nối hành động.
- [Hiệu năng](references/performance.md) khi triển khai hoặc xử lý lag.
- [Nghiệm thu](references/responsive-qa.md) trước khi bàn giao.
- [Prompt dùng lại](references/prompts.md) khi người dùng cần giao việc cho AI khác.

## Các yêu cầu cốt lõi

- Dùng bề mặt trắng trên nền xám ấm rất nhạt, nút xanh rừng, trạng thái có nhãn/icon. Dùng token nhất quán.
- Desktop Khám phá có bộ lọc trái, feed giữa và bản đồ/ngữ cảnh phải. Mobile dùng một cột và thẻ ngang gọn.
- Bản đồ mobile chỉ có hai hàng điều khiển ở trên. Gộp chọn khu vực vào hàng tiêu đề. Giữ định vị cạnh zoom và đưa thú y vào Bộ lọc.
- Dành hàng riêng cho tóm tắt ghim và thanh điều hướng. Mở rộng vùng map khi đóng tóm tắt.
- Cho thẻ cao theo nội dung. Kiểm tra flex shrink, grid row và vùng cuộn để tránh thẻ biến thành dải mỏng.
- Trên Chi tiết, dùng header quay lại và hàng hành động riêng. Trình xem ảnh là lớp trên cùng, quản lý focus và khóa cuộn theo vòng đời.
- Trên mobile, xếp mô tả dài và nút của Tài khoản thành một cột. Cho nội dung cuối cuộn tới được.
- Phân biệt loại tin, nguồn tin và trạng thái xử lý. Lấy quyền hành động từ chính sách hiện có của dự án.
- Giữ source attribution, chỉ mở vị trí khi tọa độ hợp lệ, chỉ hiện liên hệ khi được phép. Dùng dữ liệu thật ở bản chạy.
- Đo thao tác và tìm nguyên nhân chậm trước khi tối ưu. Dùng production build để đánh giá.
- Dọn map listeners, animation loops, camera streams, object URLs và timer đúng vòng đời.
- Đọc kết quả API trước khi thông báo. Giữ dữ liệu cũ khi tải mới thất bại và báo lỗi dễ hiểu.

## Quy trình thực hiện

1. Đọc source và lập bản đồ các màn, dữ liệu, quyền và hành động.
2. Chọn ảnh chuẩn theo màn. Ghi rõ các điểm chưa có thiết kế hoặc nghiệp vụ chưa được xác nhận.
3. Tái hiện lỗi có sẵn và đo baseline trước khi sửa nếu có app chạy được.
4. Dựng hoặc sửa bố cục mobile tại 390px và 320px, sau đó mở rộng desktop.
5. Nối các hành động theo references/business-rules.md và chính sách nguồn hiện tại.
6. Kiểm tra các lỗi hồi quy trong references/responsive-qa.md, xử lý nguyên nhân.
7. Đo lại cùng cấu hình và dữ liệu theo references/performance.md.
8. Sửa các lỗi còn lại trong phạm vi, chạy kiểm tra sẵn có và lưu đầu ra đúng môi trường.
9. Bàn giao phần đã làm, ảnh nếu có, kết quả kiểm tra và những trường hợp chưa thể xác nhận.

## Điều kiện hoàn thành

- Đúng ảnh ưu tiên, đặc biệt bản đồ gọn và năm tab mobile.
- Có thể cuộn tới CTA, đóng từng lớp và trở lại đúng state.
- Tin tổng hợp dẫn về nguồn, tin cộng đồng dùng đúng hành động và quyền.
- Kiểm tra được màn thấp, phóng chữ, ảnh lỗi, định vị bị từ chối và cập nhật thất bại.
- Báo hiệu năng theo số đo, cấu hình và luồng thực đã kiểm tra. Phân biệt mockup, phép đo phòng thử và quan sát trên máy thật.
