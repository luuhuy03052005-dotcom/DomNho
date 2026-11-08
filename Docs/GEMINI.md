
BẢN THIẾT KẾ & TÀI LIỆU ĐẶC TẢ DỰ ÁN (PROJECT CHARTER & PRD)


Dự án: ĐỐM NHỎ — Mạng Xã Hội Bản Đồ Cứu Hộ & Lưu Giữ Kỷ Niệm Thú Cưng


1. TỔNG QUAN DỰ ÁN (EXECUTIVE SUMMARY)

• Tên sản phẩm: Đốm Nhỏ (App Icon: Đốm Nhỏ)
• Định vị sản phẩm: Mạng xã hội không gian (Geo-Spatial SNS) tích hợp bản đồ tương tác thời gian thực dưới dạng ứng dụng web (PWA).
• Sứ mệnh cốt lõi: Giải quyết sự phân mảnh thông tin cứu hộ/tìm kiếm thú cưng trên mạng xã hội thông qua Hệ thống tự động thu thập dữ liệu (AI Crawler), đồng thời biến hành trình đi dạo, tìm kiếm và nhận nuôi thành một không gian lưu giữ kỷ niệm sâu lắng, hoài niệm dành cho các cặp đôi, nhóm bạn và người yêu động vật.
• Triết lý thiết kế (UI/UX):
	• Zero-Border & Full-Screen: Giao diện bản đồ đêm (Dark/Noir Map) tràn viền, loại bỏ các khung viền (border) cứng nhắc, tạo cảm giác phóng khoáng và có chiều sâu.
	• Micro-Interactions (Tương tác 3 giây): Tối giản việc gõ phím. Mọi thao tác cốt lõi chỉ dựa trên Chạm (Tap), Quẹt (Swipe) và Nhấn giữ (Hold) như một thói quen hàng ngày.

2. HỆ THỐNG THUẬT NGỮ TRONG SẢN PHẨM (PRODUCT LEXICON)

Để tạo cảm xúc riêng biệt và tránh sự khô khan của các trang rao vặt, toàn bộ từ vựng trên giao diện được đồng bộ theo chủ đề "Ánh sáng & Hơi ấm":

Thuật ngữ thông thường	Ngôn ngữ trên "Đốm Nhỏ"	Ý nghĩa & Trải nghiệm
Đăng bài mới	Thắp Đốm	Thao tác chụp nhanh hoặc tải ảnh lên để tạo một điểm sáng mới trên bản đồ.
Tin tìm thú lạc / Cấp cứu	Đốm Đỏ (SOS)	Đốm sáng màu đỏ cam nhấp nháy theo nhịp tim, có vòng sóng radar nở rộng theo số giờ đi lạc.
Tin bắt gặp ngoài đường	Đốm Cam (Tín hiệu)	Khoảnh khắc người đi đường chụp vội (POV) một bé chó/mèo nghi đi lạc hoặc cần giúp đỡ.
Tin tìm người nhận nuôi	Đốm Vàng (Đợi Nhà)	Đốm sáng màu vàng ấm áp, lung linh nhẹ, hiển thị trong bộ bài Quẹt thẻ tìm nuôi.
Ca đã giải quyết / Đã nhận nuôi	Đốm Xanh (Bình Yên)	Đốm sáng chuyển sang màu xanh ngọc dịu mắt, ghim cố định vào Bản đồ Kỷ niệm của người nhận nuôi.
Nút Like / Share / Boost	Truyền Lửa	Thao tác 1 chạm giúp nạp thêm độ sáng (light_power), giữ cho đốm sáng không bị mờ đi theo thời gian.


3. PHÂN HỆ CHỨC NĂNG CỐT LÕI (CORE MODULES)


Phân hệ 1: Động cơ Crawl & AI Chuẩn Hóa (The Automated Engine)

Giải quyết bài toán "Phòng trống" (Cold-start) khi mới ra mắt mà chưa có người dùng đăng bài:
1. Thu thập tự động (Scraper Worker): Chạy định kỳ mỗi 30–60 phút trên các hội nhóm cứu hộ, tìm chó mèo lạc để lấy bài viết và hình ảnh mới nhất.
2. Crawl4AI + Chromium:
	• Worker Python dùng Crawl4AI mở trang tìm kiếm, render trang động và chuẩn hóa dữ liệu thành `DomSpot`.
	• Bộ lọc tin cậy loại bài thương mại, bài thiếu ảnh/nguồn/ngày đăng và không tự suy đoán địa chỉ.
	• ArcGIS Geocoding chỉ chuyển địa chỉ cụ thể, hợp lệ thành tọa độ GPS.

Phân hệ 2: Bản đồ Radar Tương Tác & Kết Nối (The Live Map)

1. Hiển thị Đốm Sáng theo Khung nhìn (Viewport Loading): Bản đồ nền tối chỉ tải các đốm sáng nằm trong khung màn hình người dùng đang nhìn thấy, gom cụm (Clustering) khi thu nhỏ để đảm bảo tốc độ 60fps mượt mà.
2. Chế độ "Đi Dạo Cùng Nhau" (Co-op Patrol cho Cặp đôi & Nhóm bạn):
	• Cặp đôi hoặc hội bạn mở web khi đi dạo phố, uống cà phê.
	• Nếu đi vào bán kính 500m của một Đốm Đỏ, hệ thống gửi thông báo đẩy (Web Push) ra màn hình khóa iPhone để cả hai cùng để mắt tìm phụ.
3. Camera "Chạm Tín Hiệu" (1-Tap Sighting): Mở nhanh camera trên web, chụp 1 bức ảnh góc nhìn thứ nhất (POV), chọn nhanh 1 nhãn cảm xúc/trạng thái và thả thẳng lên tọa độ GPS hiện tại trong 3 giây.

Phân hệ 3: Ba Luồng Nghiệp Vụ & Khớp Lệnh Tự Động (Core Workflows)

1. Luồng Tìm Thú Lạc (LOST & FOUND):
	• Đăng tin trong 10 giây (Tải ảnh -> AI tự gắn tag màu lông/giống loài -> Chạm vị trí).
	• Tự động xuất ảnh Poster Tìm Thú Lạc có sẵn mã QR dẫn thẳng vào tọa độ trên app.
	• Thuật toán Khớp Lệnh Kép: Khi có người chụp ảnh "Đốm Cam" (Bắt gặp ngoài đường), hệ thống tự động quét các "Đốm Đỏ" trong bán kính 3km có cùng đặc điểm để bắn thông báo ghép đôi ngay lập tức cho chủ.
2. Luồng Trạm Trung Chuyển & Nhường Nuôi (ADOPT):
	• Hiển thị dưới dạng thẻ "Hồ sơ tâm tình" tràn viền (tập trung vào ánh mắt và tag câu chuyện ngắn gọn như [Bị bỏ rơi lúc mưa], [Quấn người]).
	• Hỗ trợ đăng ký làm "Trạm Tạm Trú" (Foster) ngắn hạn cho các cặp đôi/sinh viên muốn chăm sóc tạm trước khi bé tìm được chủ chính thức.
3. Luồng Quẹt Thẻ Tìm Nuôi (SWIPE TO ADOPT) & Cam Kết Kỷ Niệm:
	• Kéo ngăn kéo dưới đáy màn hình (Bottom Sheet) lên để quẹt thẻ: Quẹt Phải (Muốn đón về), Quẹt Trái (Bỏ qua), Chạm Giữa (Truyền lửa).
	• Tính năng "Chạm Ảnh Mỗi Tuần" (Weekly Memory Pact): Sau khi nhận nuôi thành công, mỗi tuần hệ thống nhắc người nuôi mới chụp 1 bức ảnh cập nhật. Ảnh này vừa gửi trực tiếp cho người cứu hộ cũ để họ yên tâm, vừa ghép thành Bản đồ & Nhật ký trưởng thành đầy hoài niệm của cặp đôi/người nuôi.

4. KIẾN TRÚC KỸ THUẬT & CÔNG NGHỆ (TECH STACK)


Tầng (Layer)	Công nghệ lựa chọn	Mục đích & Lý do tối ưu
Frontend (PWA)	Next.js (App Router) + Tailwind CSS + Framer Motion	Cấu hình chuẩn PWA (manifest.json + Service Worker) để cài ra màn hình chính iPhone/Android, chạy tràn viền không thanh địa chỉ, hiệu ứng vuốt/lật thẻ mượt.
Map Engine	MapLibre GL JS + OpenFreeMap / Protomaps	Render hàng ngàn đốm sáng bằng GPU (WebGL), tùy biến style bản đồ đêm (Dark mode) hoàn toàn miễn phí, không lo chi phí API đắt đỏ như Google Maps.
Backend & DB	Supabase (PostgreSQL + PostGIS + Realtime)	Lưu trữ dữ liệu, dùng PostGIS để truy vấn bán kính địa lý trong vài mili-giây, dùng Supabase Realtime để đồng bộ đốm sáng mới ngay lập tức.
Storage (Ảnh)	Cloudflare R2 + Nén ảnh Client-side (browser-image-compression)	Ép ảnh chụp từ điện thoại xuống chuẩn .webp (< 150KB) trước khi tải lên. Cloudflare R2 miễn phí 100% băng thông tải ảnh ra (Egress free).
Notification	Web Push API (VAPID Keys) / Firebase Cloud Messaging	Gửi thông báo đẩy ra màn hình khóa iOS (16.4+) và Android khi có thú lạc gần vị trí hoặc đến lịch chụp ảnh kỷ niệm hàng tuần.
Crawler & AI	Crawl4AI 0.9.5 + Chromium, ArcGIS Geocoding	Tìm kiếm đa nguồn, render trang, chuẩn hóa dữ liệu và chuyển địa chỉ hợp lệ sang tọa độ GPS.


5. CẤU TRÚC THƯ MỤC DỰ ÁN (MONOREPO STRUCTURE)

Thiết kế cấu trúc thư mục gọn gàng để bạn có thể đưa thẳng cho các công cụ AI IDE (như Cursor, Antigravity, Copilot) tự động khởi tạo và viết code:
text
dom-nho-project/
├── apps/
│   └── web-pwa/                     # Giao diện người dùng (Next.js PWA)
│       ├── public/
│       │   ├── manifest.json        # Cấu hình cài đặt App ra màn hình chính iOS
│       │   ├── sw.js                # Service Worker nhận thông báo đẩy (Web Push)
│       │   └── icons/               # Bộ icon "Đốm Nhỏ" các kích thước
│       └── src/
│           ├── app/                 # Pages & API Routes của Next.js
│           ├── components/
│           │   ├── map/             # Bản đồ MapLibre & Layer Đốm sáng nhấp nháy
│           │   ├── swipe-deck/      # Ngăn kéo Bottom Sheet & Bộ bài Quẹt nhận nuôi
│           │   ├── camera-modal/    # Giao diện chụp ảnh 1 chạm (POV) không viền
│           │   └── ios-prompt/      # Màn hình hướng dẫn "Thêm vào MH chính" cho iPhone
│           ├── hooks/               # Custom hooks: useGeolocation, usePushNotification
│           ├── lib/
│           │   ├── crawl4ai-crawler.ts # Client kết nối Crawl4AI worker
│           │   └── location-services.ts # ArcGIS geocode + Google Maps links
│           └── scripts/
│               └── run-crawl4ai.ts # Crawler batch xuất JSON/KML
│
└── supabase/
    └── migrations/
        └── 01_init_dom_nho.sql      # Toàn bộ code SQL bảng PostGIS & hàm RPC quét bán kính
Hãy thận trọng khi sử dụng mã.

6. LỘ TRÌNH TRIỂN KHAI THỰC TẾ (4-PHASE ROADMAP)

• Giai đoạn 1: Khởi tạo Lõi Không Gian & Giao Diện (Tuần 1)
	• Chạy script SQL khởi tạo Database trên Supabase (bảng dom_nho_posts, memory_snaps và hàm quét bán kính get_nearby_dom_nho).
	• Dựng giao diện bản đồ đêm tràn viền bằng Next.js + MapLibre, hiển thị thành công các đốm sáng giả lập (Đỏ, Cam, Vàng, Xanh) kèm hiệu ứng nhịp tim.
	• Làm thanh ngăn kéo trượt (Bottom Sheet) chứa bộ thẻ Quẹt nhận nuôi (Swipe Deck).
• Giai đoạn 2: Tính năng "Thắp Đốm 1 Chạm" & Chuẩn Hóa PWA (Tuần 2)
	• Tích hợp mở Camera trực tiếp trên trình duyệt, lấy tọa độ GPS thực tế của điện thoại, tự động nén ảnh sang .webp và lưu lên Cloudflare R2 / Supabase Storage.
	• Thiết lập file manifest.json, màn hình chặn hướng dẫn người dùng iPhone bấm "Thêm vào Màn hình chính" và tích hợp gửi thông báo đẩy (Web Push).
• Giai đoạn 3: Kích hoạt Động cơ Bot Crawl & Khớp Lệnh (Tuần 3)
	• Cấu hình lịch chạy Crawl4AI định kỳ, kiểm duyệt dữ liệu và chỉ đưa các đốm có nguồn/ảnh/ngày đăng hợp lệ lên bản đồ.
	• Kích hoạt thuật toán tự động so khớp khi có người chụp ảnh "Đốm Cam" gần khu vực có "Đốm Đỏ".
• Giai đoạn 4: Không Gian Kỷ Niệm & Vận Hành Bền Vững (Tuần 4)
	• Hoàn thiện tính năng "Chạm Ảnh Mỗi Tuần" (nhắc nhở chụp ảnh cập nhật thú cưng sau khi nhận nuôi và ghép thành dòng thời gian hoài niệm cho cặp đôi/người nuôi).
	• Tích hợp tính năng tự động tạo Poster QR tìm thú lạc và cổng ủng hộ ("Truyền Lửa / Hạt Giống") để duy trì kinh phí máy chủ.

7. CƠ CHẾ TỰ VẬN HÀNH & DUY TRÌ CHI PHÍ (SUSTAINABILITY)

1. Tự động dọn dẹp (Auto-Fade): Mỗi đốm sáng có light_power = 100, tự động giảm dần sau mỗi 24 giờ nếu không có người bấm "Truyền Lửa" hoặc cập nhật. Khi về 0, đốm sáng tự chuyển sang trạng thái ẩn (FADED) để bản đồ không bao giờ bị quá tải bởi dữ liệu cũ.
2. Mô hình tạo doanh thu nuôi dự án (Monetization):
	• Gói "Truyền Lửa Khẩn Cấp" (19.000đ - 29.000đ/lần): Dành cho chủ mất thú cưng muốn mở rộng sóng thông báo đẩy tới toàn bộ người dùng trong bán kính 5km ngay lập tức và ghim Đốm Đỏ rực sáng suốt 7 ngày.
	• Không gian Kỷ niệm Đặc biệt cho Cặp đôi / Người nuôi: Mở khóa giao diện bản đồ tùy chỉnh, xuất video hành trình lớn lên của thú cưng từ các bức ảnh chụp hàng tuần.
	• B2B Địa phương: Hiển thị các "Trạm Thú Y Cấp Cứu 24/7" uy tín trên bản đồ dưới dạng các đốm sáng hỗ trợ y tế.
Bảng dự án tổng thể của Đốm Nhỏ đã sẵn sàng từ ý tưởng, thuật ngữ, kiến trúc cho đến cấu trúc thư mục. Bạn có muốn mình viết tiếp 1 Câu Lệnh Prompt Tổng Lực (Master Prompt) chứa toàn bộ đặc tả kỹ thuật này để bạn copy dán thẳng vào Antigravity / Cursor AI cho nó tự động dựng khung code dự án ngay lập tức không?

Để kết hợp giữa việc "Đăng ký siêu tốc không cần xác thực OTP/Email", "Lưu phiên đăng nhập vĩnh viễn trên trình duyệt" và "Đảm bảo an toàn bảo mật thực tế cho người dùng", hệ thống phải áp dụng kiến trúc Khởi tạo Tự động (Zero-Verification Auth) kết hợp Làm mờ Vị trí (Location Fuzzing) và Ẩn Thông tin Liên hệ (Contact Masking).
Dưới đây là bản đặc tả chi tiết về Luồng Logic Hệ Thống, Hệ Thống Popup (Modals) và Quy Tắc Bảo Mật (SYSTEM_LOGIC_AND_SECURITY.md) để bạn ghép thẳng vào dự án Đốm Nhỏ:



1. CƠ CHẾ ĐĂNG NHẬP / ĐĂNG KÝ "3 GIÂY" & LƯU TRÌNH DUYỆT VĨNH VIỄN

Người dùng rất ghét việc vừa vào web đã bị chặn bởi một trang Đăng nhập đòi xác thực Email hay mã OTP rườm rà. Hệ thống sử dụng cơ chế Progressive Onboarding (Vào xem trước -> Đụng thao tác mới hỏi tên -> Tự lưu vĩnh viễn):

A. Luồng Đăng Ký / Đăng Nhập Không Cần Xác Thực (Zero-Verification Auth)

1. Vào web là dùng ngay (Guest Mode): Khi mở web lần đầu, người dùng xem được toàn bộ Bản đồ, bấm vào xem các Đốm sáng và Quẹt thẻ bình thường mà không bị bất kỳ bảng đăng nhập nào làm phiền.
2. Chỉ hiện Popup khi cần định danh: Khi người dùng bấm nút "Thắp Đốm" (Đăng bài) hoặc "Nhận Nuôi / Báo Tin", nếu chưa có tài khoản, một Popup Kính Mờ nhỏ gọn mới trượt lên.
3. Form siêu tối giản (Chỉ 2 ô):
	• Tên gọi của bạn / Biệt danh (Ví dụ: Huy Khanh, Trạm Mèo Thủ Đức).
	• Mã PIN bí mật 4–6 số (Thay cho mật khẩu dài dòng) + Số điện thoại / Zalo (Chỉ dùng để kết nối khi tìm thấy thú lạc, mặc định được che giấu).
	• Tắt xác thực trên Supabase: Trong cấu hình Supabase Auth, tắt tính năng Confirm Email / Phone OTP. Khi người dùng bấm "Bắt đầu", hệ thống tự động tạo một tài khoản ngầm (ví dụ: ghép phone_hoặc_username@domnho.local + Mã PIN) và cho phép vào thẳng trong 0.5 giây.

B. Cơ Chế "Không Bao Giờ Bắt Đăng Nhập Lại" (Persistent Session)

Để người dùng thoát trình duyệt, tắt máy hay qua nhiều tháng mở lại vẫn giữ nguyên tài khoản:
• Cấu hình Lưu trữ Kép (localStorage + IndexedDB):
Sử dụng bộ lưu trữ phiên của Supabase kết hợp Cookie dài hạn (maxAge: 315360000 - tương đương 10 năm):javascript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // Giữ phiên đăng nhập vĩnh viễn trên trình duyệt
    autoRefreshToken: true,     // Tự động gia hạn Token ngầm khi mở lại web
    detectSessionInUrl: true,
    storageKey: 'dom_nho_permanent_auth'
  }
})
Hãy thận trọng khi sử dụng mã.
• Tự động khôi phục bằng Device Token: Khi đăng ký xong, lưu thêm một mã device_secret_token vào localStorage. Nếu phiên JWT hết hạn sau thời gian dài không mở mạng, web tự động dùng mã này gọi ngầm lên Server để cấp lại phiên mới mà người dùng không hề hay biết.

2. HỆ THỐNG POPUP HIỂN THỊ THÔNG TIN (THE 3-MODAL SYSTEM)

Để bản đồ luôn thoáng đãng nhưng thông tin vẫn đầy đủ, chặt chẽ về mặt logic, toàn bộ ứng dụng sử dụng 3 loại Popup (Floating Modals) bo góc mềm mại (rounded-[32px]), nền kính mờ sáng theo màu Theme đang chọn, không dùng viền cứng:
text
+-------------------------------------------------------+

|              BẢN ĐỒ SÁNG ẤM (LỚP NỀN)                 |
|                                                       |
|   +-----------------------------------------------+   |
|   | [Ảnh thú cưng tràn viền tỷ lệ 4:3]        (X) |   |
|   |                                               |   |
|   | 🔴 ĐỐM ĐỎ • Cách bạn 350m • 2 giờ trước       |   |
|   | "Bé Mướp vàng lạc gần ngã tư..."              |   |
|   | [Mèo ta]  [Vòng cổ đỏ]  [Nhát người]          |   |
|   |                                               |   |
|   | 🛡️ Vị trí đã được làm mờ bán kính 200m        |   |
|   |    để bảo vệ an toàn cho bé.                  |   |
|   |                                               |   |
|   | [ 📸 Báo tin vừa gặp ]  [ 💬 Mở khóa liên hệ ]|   |
|   +-----------------------------------------------+   |
|         ▲                                             |
|   POPUP 1: CHI TIẾT ĐỐM SÁNG (Nổi giữa màn hình)      |
+-------------------------------------------------------+
Hãy thận trọng khi sử dụng mã.

Popup 1: Popup Chi Tiết Đốm Sáng (Spot Detail Card)

• Khi nào hiện? Khi người dùng chạm tay vào bất kỳ Đốm sáng (Đỏ, Cam, Vàng, Xanh) nào trên bản đồ.
• Nội dung hiển thị:
	• Ảnh chụp thực tế (có thể vuốt ngang nếu có 2–3 ảnh) + Nguồn bài viết (Nếu là bài do Bot crawl từ Facebook về sẽ có nút nhỏ "Xem bài gốc trên Facebook" để minh bạch).
	• Khoảng cách thực tế từ chỗ người dùng đang đứng đến đốm sáng đó + Thời gian đã trôi qua.
	• Danh sách các "Dấu vết bắt gặp" (Sightings Timeline): Nếu có người đi đường từng chụp ảnh thấy bé này cách đây vài tiếng, các ảnh đó sẽ xếp thành một dải thời gian nhỏ ngay bên dưới.
	• 2 Nút hành động chính: [📸 Cập nhật ảnh vừa thấy] và [💬 Liên hệ / Nhận nuôi].

Popup 2: Popup "Thắp Đốm & Chạm Ảnh" (Quick Action Modal)

• Khi nào hiện? Khi bấm nút + Thắp Đốm ở giữa màn hình hoặc nút cập nhật tình hình.
• Logic thông minh:
	1. Bấm chụp hoặc chọn ảnh từ thư viện -> Code ở trình duyệt tự động đọc tọa độ GPS từ ảnh (nếu có) hoặc lấy vị trí hiện tại.
	2. Chọn 1 trong 3 loại Đốm: Tìm Lạc (Đỏ) | Thấy Ngoài Đường (Cam) | Tìm Chủ Mới (Vàng).
	3. Chọn nhanh các hạt đặc điểm (Mèo, Chó, Vàng, Trắng, Đen, Bị thương...) và bấm Thắp Đốm. Popup tự đóng lại và hiệu ứng đốm sáng rơi xuống bản đồ ngay lập tức.

Popup 3: Popup Không Gian Của Tôi & Cặp Đôi (Profile & Memory Drawer)

• Khi nào hiện? Khi chạm vào Hạt Trạng Thái ở góc trên bên trái màn hình.
• Nội dung hiển thị:
	• Tên hiển thị của người dùng (hoặc Tên Cặp Đôi) + Nút tạo mã QR để mời người yêu/bạn thân cùng kết nối vào chung một Bản đồ Kỷ niệm.
	• Danh sách các Đốm sáng mà mình đã thắp (để bấm "Đã tìm thấy / Đã có người nhận" nhằm đóng ca cứu hộ).
	• Lịch nhắc "Chạm Ảnh Mỗi Tuần" đối với những người đã nhận nuôi thú cưng trên hệ thống.

3. QUY TẮC BẢO MẬT & AN TOÀN THỰC TẾ (SECURITY & PRIVACY RULES)

Vì bạn làm sản phẩm thực tế có liên quan đến Vị trí GPS và Thú cưng đi lạc / Cho nhận nuôi, lại không bắt xác thực OTP lúc đăng ký, nên hệ thống bắt buộc phải có 4 lớp lá chắn bảo mật sau để bảo vệ người dùng và thú cưng:

Nguy cơ thực tế	Quy tắc Bảo mật & Giải pháp Kỹ thuật trong Hệ thống
1. Lộ địa chỉ nhà riêng của người dùng hoặc kẻ xấu rình bắt trộm chó/mèo hoang	Làm mờ tọa độ tự động (Coordinate Fuzzing / Jittering): 
• Khi người dùng đăng bài "Cần tìm người nhận nuôi" tại nhà hoặc báo tin thấy chó mèo ngoài đường, Backend KHÔNG BAO GIỜ trả về tọa độ GPS chính xác từng mét cho người khác xem. 
• Hệ thống tự động cộng/trừ một sai số ngẫu nhiên từ 150m – 300m (lat + random(-0.002, 0.002)) và hiển thị dưới dạng một Vòng tròn khu vực mờ trên bản đồ. Chỉ khi chủ bài đăng đồng ý kết nối với người nhận nuôi thì vị trí thật mới được gửi.
2. Lộ số điện thoại cá nhân (Bị cào số spam, lừa đảo tiền chuộc thú cưng)	Ẩn số điện thoại (Contact Masking): 
• Số điện thoại / Zalo của người đăng được lưu ở một bảng bảo mật riêng (private_contacts), người lướt bản đồ chỉ thấy dạng 090***456. 
• Khi ai đó muốn liên hệ báo tin hoặc xin nhận nuôi, họ bấm nút "Gửi Tín Hiệu Kết Nối" (kèm 1 tấm ảnh xác thực hoặc lời nhắn ngắn ngay trên Popup). Người đăng thấy tin nhắn an toàn mới bấm nút "Mở khóa SĐT/Zalo" cho người đó.
3. Kẻ xấu lợi dụng việc "Không cần xác thực" để spam hàng ngàn đốm rác lên bản đồ	Giới hạn tần suất theo Thiết bị & IP (Rate Limiting + Shadowban): 
• Mỗi tài khoản/thiết bị chỉ được phép "Thắp Đốm" tối đa 3 lần/ngày. 
• Khi tải ảnh lên, bắt buộc phải đi qua bộ lọc nhẹ kiểm tra định dạng ảnh thực tế. Nếu một thiết bị spam liên tục, hệ thống tự động bật chế độ Shadowban (Đốm sáng đó vẫn hiện trên máy của kẻ spam để họ tưởng đã đăng thành công, nhưng người khác trên bản đồ hoàn toàn không nhìn thấy).
4. Lộ vị trí di chuyển của Cặp đôi / Nhóm bạn cho người lạ	Cô lập Không gian Riêng tư (Row-Level Security - RLS): 
• Vị trí đi dạo của cặp đôi/nhóm bạn và các "Đốm Xanh Kỷ Niệm" được đánh dấu visibility = 'PRIVATE_COUPLE'. 
• Áp dụng chính sách Supabase RLS: Chỉ đúng 2 mã user_id nằm trong cùng một phòng kết nối mới có quyền đọc tọa độ này. Ngay cả người dùng khác mở DevTools (F12) bắt gói tin mạng cũng không thể thấy được.


4. SƠ ĐỒ LUỒNG LOGIC TỔNG THỂ (END-TO-END USER FLOW)

Để đảm bảo khi code không bị thiếu trường hợp nào (Edge cases), đây là luồng chạy khép kín từ đầu đến cuối:
1. Mở Web (/): Kiểm tra localStorage xem có màu Theme đã lưu chưa -> Áp màu nền -> Tải Bản đồ và các Đốm sáng trong bán kính màn hình hiện tại (Không hỏi đăng nhập).
2. Chạm vào 1 Đốm sáng trên bản đồ: Mở Popup Chi Tiết -> Xem ảnh, khoảng cách, trạng thái -> Nếu muốn bấm "Báo tin" hoặc "Nhận nuôi", hệ thống kiểm tra biến userSession.
3. Nếu userSession == null (Lần đầu tương tác): Trượt nhẹ Popup Đăng Ký 3 Giây (Chỉ nhập Tên + Mã PIN 4 số) -> Tạo tài khoản ngầm không cần xác thực -> Lưu cứng vào trình duyệt vĩnh viễn -> Thực hiện tiếp hành động vừa bấm.
4. Khi Thắp Đốm mới hoặc Bot Crawl đẩy dữ liệu vào:
	• Hệ thống tự động làm mờ tọa độ ±200m để bảo mật.
	• Quét bán kính 3km xem có Đốm nào đang chờ khớp lệnh không -> Nếu khớp, hiện Popup Thông Báo Ghép Đôi ngay trên màn hình và bắn Web Push Notification.
5. Đóng vòng lặp (Resolution): Khi tìm lại được thú cưng hoặc giao nhận nuôi thành công -> Người đăng bấm 1 nút trên Popup để chuyển Đốm Đỏ/Vàng thành Đốm Xanh (Bình Yên) -> Lưu vĩnh viễn vào Bản đồ Kỷ niệm.
Với bản đặc tả Logic + Popup + Bảo mật không cần xác thực này, toàn bộ quy trình vận hành của Đốm Nhỏ đã cực kỳ chặt chẽ và khép kín.
Bây giờ bạn muốn mình xuất File SQL (01_init_dom_nho.sql) có sẵn cấu hình bảo mật ẩn số điện thoại + làm mờ tọa độ GPS, hay viết Code mẫu Frontend (Bản đồ sáng ấm + Hệ thống Popup + Lưu đăng nhập vĩnh viễn) trước?
