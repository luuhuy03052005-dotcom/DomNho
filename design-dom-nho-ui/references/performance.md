# Hiệu năng desktop và mobile

## 1. Bằng chứng và phạm vi

Dùng production build khi đo. Chụp screenshot chỉ chứng minh bố cục ở thời điểm đó. Chưa có app chạy hoặc thiết bị thì ghi rõ phần chưa đo. Chỉ tuyên bố mượt trong cấu hình và luồng đã kiểm tra.

Chỉ tối ưu khi có nguyên nhân quan sát được hoặc tránh được rủi ro đã xác định. Tận dụng profiler và công cụ của runtime hiện có. Đọc tài liệu chính thức đúng phiên bản khi cần dùng API chưa chắc chắn.

## 2. Cách ghi baseline

Ghi commit/build, thiết bị, OS, trình duyệt, viewport CSS px, DPR, kiểu mở Safari/PWA, mạng/throttling, số lượng tin/marker, ảnh và cache cold/warm.

- Chạy ít nhất 5 lần cho mở trang hoặc route để báo median/range.
- Thu ít nhất 30 mẫu thao tác trước khi báo p95. Với ít mẫu, báo từng mẫu hoặc median và giới hạn.
- So sánh trước/sau trên cùng cấu hình, cùng dữ liệu, tách thời gian mạng khỏi phản hồi cục bộ.
- Ghi trace hoặc bằng chứng profiler cho điểm nghẽn. Đo event-to-next-paint theo công cụ sẵn có, không gán phép đo custom thành INP chính thức.

## 3. Ngân sách nghiệm thu nội bộ

Đây là mục tiêu cho dự án trên thiết bị thử, không phải kết quả đã đạt hoặc cam kết trên mọi máy.

| Tác vụ | Mục tiêu / điều kiện |
| --- | --- |
| Tap chọn tab, lưu, mở filter | Phản hồi trực quan trong khoảng 100ms khi không đợi mạng, p95 ≤200ms nếu có đủ mẫu |
| Input search | Ký tự hiện ngay, debounce chỉ dành phần xử lý/fetch |
| Mở chi tiết đã có dữ liệu | Hiện khung và phản hồi ≤200ms trong cấu hình thử |
| Cuộn/kéo map 60Hz | Nhắm 60fps, xem xét các frame >16.7ms và chuỗi giật kéo dài từ trace |
| Long tasks frontend | Điều tra task >50ms lặp lại trong tương tác chính |
| Chuyển state | Không nhảy thẻ, mất scroll hoặc kích thước ảnh khi dữ liệu đến |
| Vòng đời màn | Sau 20 vòng mở/đóng, listener/map instance/stream không tăng vô hạn |

Với thiết bị 120Hz, dùng ngân sách frame theo tần số thật. Nếu không đạt, tìm tác vụ chặn và báo số đo, không sửa ngưỡng để che thất bại. Không gộp độ trễ mạng vào kết luận CPU render. Có thể bổ sung số đo web vitals nếu công cụ hỗ trợ và đủ bằng chứng.

## 4. Ảnh và danh sách

- Dùng ảnh có kích thước phù hợp hiển thị và DPR. Ưu tiên thumbnail cho list, ảnh lớn cho lightbox.
- Dành sẵn tỷ lệ và kích thước để tránh layout shift. Lazy-load ảnh ngoài viewport, ưu tiên hợp lý ảnh đầu đang nhìn thấy.
- Chỉ giải mã trước ảnh đang xem và hàng xóm cần thiết. Không tải toàn bộ ảnh gốc ngay khi mở list.
- Khi upload nhiều ảnh, xử lý có giới hạn concurrency để tránh tăng bộ nhớ đột biến. Thu hồi object URL đúng lúc, giữ nháp bằng cơ chế dự án.
- Tìm nguyên nhân rerender bằng profiler. Chỉ memoize phần đắt và props ổn định có lợi. Tránh thêm useMemo/useCallback đại trà.
- Chỉ dùng virtualization/pagination khi số lượng dữ liệu và phép đo cho thấy cần. Giữ key ổn định, scroll restoration và khả năng tiếp cận.
- Kiểm tra listener scroll, đo layout lặp và localStorage JSON lớn chạy đồng bộ trong thao tác. Batch/persist theo nhu cầu thật, giữ nhất quán khi rời màn.

## 5. Bản đồ và định vị

- Giữ một map instance cho mỗi vòng đời màn, tách khởi tạo khỏi effect cập nhật state.
- Chọn tin hoặc mở modal không được làm remount map vô cớ.
- Cập nhật marker theo thay đổi ID/dữ liệu, dùng cluster hoặc tải theo vùng khi mật độ cần.
- Tránh fitBounds/setCenter liên tục trên mỗi GPS tick, drag hoặc render. Follow-location phải là chế độ có chủ đích và dừng khi người dùng tự kéo theo thiết kế.
- Dedupe requests theo vùng/query, debounce công việc nặng ở điểm kết thúc thao tác phù hợp, abort/ignore response cũ.
- Resize map khi vùng chứa đổi kích thước, gộp resize theo frame nếu cần. Dọn ResizeObserver/listener.
- Dừng watcher GPS và tài nguyên nền khi không cần, khôi phục đúng khi quay lại. Không dùng polling render liên tục để đoán kích thước.
- Dùng provider attribution thật. Không hardcode “OpenStreetMap” hay “Google Maps” chỉ vì bitmap có nhãn đó.

## 6. Animation, overlay và background

Ưu tiên transition ngắn có mục đích và transform/opacity. Tôn trọng prefers-reduced-motion. Hạn chế blur toàn màn, shadow nhiều lớp và animation liên tục trên nhiều marker nếu trace cho thấy chậm.

Giữ overlay manager hoặc cơ chế layer của app. Chỉ layer trên cùng nhận pointer/focus. Đóng lightbox không được mount lại toàn app. Dọn animation loops, camera tracks, timers và subscriptions khi unmount.

Kiểm tra service worker/cache khi đã có PWA. Nếu sửa cơ chế cache, chứng minh update không để người dùng mắc ở asset cũ. Đừng xóa dữ liệu người dùng để giải quyết UI lag.

## 7. Bảng báo cáo

| Luồng | Cấu hình/dữ liệu | Baseline | Sau sửa | Bằng chứng | Giới hạn |
| --- | --- | --- | --- | --- | --- |
| Mở list | Điền thông tin thực | Chưa đo | Chưa đo | Trace hoặc log đo | Điền phần chưa kiểm tra |
| Kéo map/chọn ghim | Điền thông tin thực | Chưa đo | Chưa đo | Trace / profiler | Điền giới hạn |
| Mở ảnh/đóng ảnh | Điền thông tin thực | Chưa đo | Chưa đo | Trace / memory | Điền giới hạn |

Thay “Chưa đo” chỉ bằng kết quả thực thu được. Không dùng điểm Lighthouse desktop để khẳng định Safari iPhone đã hết lag.
