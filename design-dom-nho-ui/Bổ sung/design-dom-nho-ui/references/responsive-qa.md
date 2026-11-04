# Responsive, trạng thái và nghiệm thu

## Mục lục

1. Khung trang và safe area
2. Bản đồ và hộp thoại
3. Trạng thái
4. Ma trận nghiệm thu
5. Mức bằng chứng

## 1. Khung trang và safe area

Ưu tiên mô hình dễ kiểm soát: app-shell dùng grid ba hàng header / main minmax(0,1fr) / bottom-nav, cao viewport động; chỉ main cuộn. Khi không hỗ trợ dvh, dùng fallback hợp lý. Đặt min-height:0 cho vùng main cần cuộn. Đừng tạo nhiều vùng cuộn lồng nhau trong feed.

Ví dụ định hướng CSS, điều chỉnh theo host/router:
```css
.app-shell {
  min-height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
.app-main {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scroll-padding-block: 16px;
}
.mobile-nav {
  position: relative;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--surface);
}
.pet-card,
.pet-card__body,
.search-row {
  min-width: 0;
}
.pet-card__body {
  display: flex;
  flex-direction: column;
}
.pet-card__actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}
.pet-card__primary {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  white-space: normal;
}
```

Mô hình trên dành sẵn hàng cho navigation, không cần bù padding-bottom cùng chiều cao nav vào feed.

Nếu dự án đang dùng body scroll + fixed nav:
- Dùng một biến --mobile-nav-total bao gồm chiều cao hàng nút và inset.
- Bù padding-bottom vào main và scroll-padding-bottom đúng biến đó.
- Dùng cùng biến cho các CTA cố định khác; ưu tiên bỏ CTA cố định trùng chức năng.
- Không cộng safe area hai lần.
- Giữ khoảng thở 12–16px dưới nội dung cuối.

Không sửa bằng cách đặt body overflow:hidden nếu không có vùng main cuộn thay thế. Không ẩn mọi tràn ngang để giấu phần tử bị sai kích thước.

Khi người dùng phóng chữ, cho header/nav/card tăng chiều cao. Đừng ép nav-height cứng khiến label bị cắt. Có thể đo chiều cao nav bằng ResizeObserver nếu dùng fixed layout.

Khi bàn phím mở:
- Kiểm tra trên thiết bị thật hoặc môi trường mô phỏng hỗ trợ keyboard.
- Đưa trường đang nhập vào vùng nhìn, tránh scroll toàn trang giật liên tục.
- Nếu keyboard che bottom nav không cần thiết, có thể tạm ẩn nav theo trạng thái keyboard đã xác định; giữ cách thoát và nội dung nhập.
- Không dựa hoàn toàn vào :focus-within để khẳng định keyboard đang mở.
- Dùng visualViewport khi thật sự cần; xử lý cleanup listener và thay đổi orientation.
- Không chặn pinch zoom.

## 2. Bản đồ và hộp thoại

### Bản đồ mobile

Dùng screen riêng với header, filter gọn, vùng map và summary vùng riêng. Cho map flex/grid chiếm phần còn lại. Khi chọn pin, summary xuất hiện trong layout và làm map resize. Gọi API resize/invalidateSize tương ứng provider, căn camera để pin được chọn vẫn trong vùng nhìn. Giữ attribution và nút điều khiển không bị che. Nếu nhiều tin cùng tọa độ, dùng cluster hoặc danh sách chọn có nghĩa.

Cho người dùng quay lại feed với filter và scroll trước đó. Không tự khởi động lại định vị mỗi lần chuyển tab. Từ chối định vị phải vẫn chọn được vùng thủ công.

### Bộ lọc / chi tiết

Trên mobile ưu tiên panel toàn màn hình hoặc dialog có header/body/footer riêng. Body scroll; footer chứa Áp dụng ở hàng riêng và có safe area. Nội dung không chạy dưới footer. Có đóng rõ ràng, focus ban đầu hợp lý, Escape khi phù hợp, focus trap cho modal và trả focus về nút mở. Tránh giữ đồng thời bottom nav phía sau modal như mục tiêu tương tác.

Không đưa thông tin nhạy cảm mới vào UI nếu nguồn không có hoặc quyền xem không cho phép. Không làm nút Liên hệ giả.

## 3. Trạng thái bắt buộc theo phạm vi

| Thành phần | Trạng thái | Hiển thị và hành vi |
| --- | --- | --- |
| Feed | Đang tải | Skeleton cùng tỷ lệ, thông báo trạng thái phù hợp |
| Feed | Không có kết quả | Giải thích ngắn, Xóa bộ lọc / chọn khu vực khác |
| Feed | Lỗi | Mô tả dễ hiểu, Thử lại |
| Ảnh | Không tải được | Placeholder đúng tỷ lệ, không vỡ layout |
| Định vị | Chưa xin / từ chối / lỗi | Chọn khu vực thủ công, không bịa khoảng cách |
| Lưu | Chưa lưu / đã lưu / lỗi | Toggle aria-pressed, feedback và rollback nếu cần |
| Nguồn tin | Tự đăng / tổng hợp | Attribution và link gốc theo dữ liệu |
| Tin | Đã xử lý / đã tìm thấy / đã nhận nuôi | Trạng thái đúng, điều chỉnh CTA phù hợp |
| Search | Đang nhập / đã áp dụng | Giữ query khi đổi route, không mất focus vô cớ |
| Filter | Mở / đã lọc / đã xóa | State nhất quán giữa feed và map |

## 4. Ma trận nghiệm thu

| Trường hợp | Phải đạt |
| --- | --- |
| 320×568 | Không tràn ngang; header không đè; category 2×2; CTA cuối cuộn tới được |
| 360×640 và 390×844 | Chữ rõ, một cột, touch target đủ, nav không che thẻ |
| 430×932 | Không kéo giãn ảnh méo; vẫn một cột, không nhét map vào feed |
| 768×1024 | Header gọn, không lặp nav, thẻ đủ rộng |
| 1024×768 | Không có vùng layout nửa desktop nửa mobile bị chật |
| 1440×900 | Feed 2 thẻ cạnh map; CTA thẳng hàng; không hero lấn nội dung |
| Mobile ngang / màn hình thấp | Cho scroll, không cố nhét thẻ, không giấu CTA |
| Chữ 200% | Không mất nhãn, cắt nút, đè metadata; cho tăng chiều cao |
| Bàn phím mở | Input đang nhập nhìn thấy; dialog actions còn truy cập được |
| Safe area | Nav và nút không sát home indicator; không đệm hai lần |
| Tiêu đề 80–120 ký tự | Wrap hợp lý; ảnh/nút không bị đẩy tràn ngang |
| Nguồn hoặc địa chỉ dài | Wrap/thu gọn có đường xem đủ; không lộ email ngoài phạm vi mong đợi |
| Điều hướng bàn phím | Focus thấy rõ; thứ tự logic; không trap ngoài modal |
| Mạng chậm / ảnh lỗi | Không nhảy layout lớn; có retry hoặc fallback |
| Đổi feed ↔ map ↔ chi tiết | Query/filter/location và vị trí cuộn được giữ theo luồng |
| Filter + sort + save | Dữ liệu hiển thị thay đổi thật; trạng thái không mất khi đổi viewport |
| Tin tổng hợp có / thiếu URL | Có URL thì mở đúng nguồn; thiếu URL thì bỏ nút nguồn, không gắn nhãn xác minh hoặc khẩn cấp |
| Chọn và bỏ chọn ghim | Bản đồ resize; ghim chọn, attribution và điều khiển vẫn thấy; có thể mở chi tiết |
| Chi tiết và form mobile | Hàng hành động có chỗ riêng; quay lại được; không lặp thanh điều hướng chính |
| Xem trước → Sửa → Đăng tin | Nếu triển khai bước xem trước, giữ ảnh và dữ liệu khi sửa; chỉ gửi ở bước cuối; lỗi gửi không mất bản nháp |

Kiểm tra tương phản chữ thường ít nhất 4.5:1, chữ lớn 3:1; kiểm tra focus/control boundaries theo ngữ cảnh. Dùng label và icon cùng màu trạng thái. Không mặc định mọi màu trang trí phải làm màu chữ.

Khi kiểm tra bằng trình duyệt:
- Đọc scrollWidth và clientWidth ở root/vùng chính để phát hiện tràn.
- Kiểm tra bounding boxes của nav và CTA cuối; cuộn xuống trước khi kết luận CTA bị che.
- Thực hiện click/tap, bàn phím và back navigation, không chỉ chụp ảnh.
- Kiểm tra việc giữ state sau chuyển tab/route và sau reload nếu tính năng có yêu cầu persist.
- Ghi lại trường hợp không thể kiểm tra thực, đặc biệt keyboard/safe area trên thiết bị.

## 5. Mức bằng chứng

- Prompt: chỉ chứng minh đã mô tả yêu cầu.
- Ảnh mockup: chỉ chứng minh định hướng và bố cục hiển thị ở ảnh đó.
- Prototype tương tác: chứng minh các tương tác đã dựng, không chứng minh backend.
- Code chạy và kiểm tra: chỉ khẳng định viewport/luồng đã thực sự kiểm tra.
- Không viết “không bao giờ bị che” chỉ dựa trên một ảnh hoặc một viewport.
