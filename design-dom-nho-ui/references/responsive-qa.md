# Nghiệm thu UI/UX và hồi quy

## 1. Ma trận môi trường

| Cấu hình | Kiểm tra |
| --- | --- |
| 320×568 | Thẻ cao đủ, filter map không đội thành nhiều hàng vô cớ, CTA cuộn tới được |
| 360×640, 390×844, 430×932 | Khám phá một cột, map hai hàng trên, năm tab rõ |
| 768×1024, 1024×768 | Không chen ba cột quá hẹp, điều hướng không lặp |
| 1440×900 | Khám phá ba cột theo mẫu, thẻ ngang đủ chữ |
| Safari iPhone thật | Toolbar hiện/ẩn, rubber-band scroll, keyboard, xoay máy |
| Mở từ màn hình chính | Safe area, height và update tài nguyên nếu app hỗ trợ |
| Desktop Chrome / WebKit thử | Chuột, bàn phím, focus và hover |
| Chữ 200%, landscape | Label wrap, controls vẫn truy cập được |
| Mạng chậm và offline | Loading, lỗi/retry, không mất dữ liệu đang xem |

WebKit mô phỏng là bằng chứng riêng. Ghi rõ khi chưa có iPhone thật.

## 2. Luồng cần chạy

1. Khám phá → search → filter → sort → lưu → mở tin → quay lại đúng query/scroll.
2. Bản đồ → chọn ghim → summary → chi tiết → trở lại → đổi filter làm tin bị loại → bỏ chọn.
3. Chi tiết → xem ảnh → đổi ảnh/zoom → đóng ảnh → đóng chi tiết → cuộn được màn nền.
4. Tài khoản → kỷ niệm → nhập/chọn ảnh nếu có → đóng → mở lại. Kiểm tra nút và mô tả không ép thành hai cột hẹp.
5. Đăng tin → validation → chọn vị trí/ảnh → xem trước nếu có → sửa → gửi theo luồng thật. Chặn double tap gửi lặp.
6. Refresh thành công, không có tin mới, lỗi và partial theo API. Thông báo chính xác.
7. Định vị bị từ chối → chọn vùng thủ công → map/list dùng cùng khu vực.
8. Tin tổng hợp có và thiếu URL, tin cộng đồng khách và đã đăng nhập, tin đã đóng, tin thiếu tọa độ.

## 3. Các lỗi phải tái hiện và sửa đúng nguyên nhân

| Triệu chứng từng gặp | Điểm cần điều tra | Điều kiện đạt |
| --- | --- | --- |
| Card chỉ thấy nhãn/ngày | Flex shrink, fixed height, grid row, overflow, exit animation | Ảnh, title, CTA hiện đủ và cuộn được |
| Feed trống lớn sau quay lại | Mount state, scroll container, virtual list nếu có | Tin còn hiện và vị trí quay lại hợp lý |
| Map hở vùng trắng dưới | Height chain, reserved summary row, ResizeObserver | Map lấp vùng còn lại, đóng summary trả diện tích |
| Header map quá cao | Location/filter/vet tách quá nhiều hàng | Hai hàng mặc định theo ảnh compact |
| Lightbox lẫn controls với detail | Portal/stacking context, transition lifecycle, scroll lock | Một lớp nhận input, nút đóng rõ, trả đúng state |
| Tài khoản text thành cột hẹp | flex direction, min-width, button shrink | Mô tả và CTA xếp dọc mobile |
| Toast tràn và lộ lỗi EROFS | Response contract và raw server error | Toast wrap, báo thất bại đúng, log ở server |
| “Cách bạn Cách bạn” | Format ở data và component | Một prefix duy nhất |

Kiểm tra console/network và code trước khi kết luận nguyên nhân. Dùng các điểm trên như giả thuyết điều tra.

## 4. Hình học và tương tác

- So scrollWidth với clientWidth ở root và vùng main. Điều tra phần tử tràn, không che bằng overflow toàn cục.
- Cuộn tới CTA cuối trước khi đánh giá bị che. So bounding boxes của CTA, nav và footer.
- Một vùng scroll chính cho nội dung màn, vùng phụ chỉ khi có lý do như thumbnail strip hoặc modal body.
- Chỉ tính safe area một lần. Nav/header cao tự nhiên khi chữ tăng.
- Giữ target tối thiểu 44×44px, focus rõ, label cho icon và aria-current/pressed phù hợp.
- Modal trap focus, trả focus về phần tử mở, Escape/back đóng layer phù hợp. Trang nền không nhận touch khi modal đang chặn.
- Ở bàn phím mở, input và hành động còn truy cập được. Không ép cùng lúc mọi chi tiết vào viewport không đủ chiều cao.
- Giữ attribution, controls và selected pin trong vùng map nhìn thấy.
- Kiểm tra tương phản chữ thường 4.5:1 và chữ lớn 3:1 cho cặp màu dùng thật.

## 5. Bàn giao

Ghi bảng lỗi, nguyên nhân đã chứng minh, file sửa, bước tái hiện và kết quả. Kèm số đo theo performance.md khi có app chạy được. Nêu rõ source/build và môi trường đã kiểm tra.

Skill chỉ định nghĩa quy trình và tiêu chí. Không xem việc tạo skill, mockup hoặc validate Markdown là kiểm thử hiệu năng ứng dụng.
