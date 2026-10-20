# TIẾN ĐỘ WEBSITE — FairTicket

> Cập nhật: **20/10/2026**
> URL công khai: https://hce-event-ticket-k57-git-main-nguyenhoangthao.vercel.app
> Mã nguồn: thư mục `web/` · Tiến độ chung của cả dự án (Lab, hợp đồng): [PROGRESS.md](PROGRESS.md)

## 1. Tình trạng chung

| Hạng mục | Tình trạng |
|---|---|
| Số trang | 9 trang + 1 API |
| Deploy | ✅ Vercel tự deploy mỗi lần push lên `main` |
| Giao diện desktop + mobile (390px) | ✅ Không tràn ngang, đã chụp kiểm tra từng trang |
| Đọc dữ liệu thật từ Sepolia | ✅ Đã kiểm tra trực tiếp trên bản Vercel |
| Ghi dữ liệu bằng ví thật | 🟡 Mới chạy thật: **tạo sự kiện** và **rút tiền** (20/10). Chưa chạy thật: mua vé qua trang thanh toán mới, rao bán lại, mua lại, check-in |

**Ký hiệu trạng thái**
- ✅ **Đã chạy thật**: đã có giao dịch thật bằng ví MetaMask, hoặc đã kiểm tra trực tiếp trên bản Vercel.
- 🟢 **Đã test tự động**: đã chạy test trên trình duyệt Edge với dữ liệu Sepolia thật và ví giả lập. Ví giả lập đọc chain thật nhưng không gửi giao dịch.
- 🟡 **Cần test bằng ví thật**: luồng có gửi giao dịch nhưng chưa có giao dịch thật nào chạy qua bản giao diện hiện tại.

## 2. Từng trang

### 2.1 Phần chung (header, footer, ví)

| Chức năng | Trạng thái |
|---|---|
| Logo, menu (Trang chủ · Khám phá · Vé bán lại · Tạo sự kiện), ô tìm kiếm | ✅ |
| Kết nối ví MetaMask, tự kết nối lại khi tải trang | ✅ |
| Menu ví: sao chép địa chỉ, Vé của tôi, Sự kiện của tôi, Check-in, xem ví trên Etherscan, Ngắt kết nối | 🟢 |
| Ví ở sai mạng: chấm đỏ + banner kèm nút "Chuyển sang Sepolia" | 🟢 |
| Đổi ví / đổi mạng không tải lại trang, không mất dữ liệu đang nhập | 🟢 |
| Footer: liên kết, CA hợp đồng (link Etherscan) | ✅ |

### 2.2 Trang chủ — `#/`

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Thanh danh mục (Nhạc sống, Nghệ thuật, Thể thao, Workshop, Hội thảo, Trải nghiệm, Khác) | ✅ | |
| Carousel sự kiện sắp diễn ra (tự chuyển, dừng khi rê chuột, vuốt trên mobile) | ✅ | Hiện chỉ có slide giới thiệu vì chưa có sự kiện nào ở tương lai |
| Sự kiện nổi bật · Sắp diễn ra · Khám phá theo danh mục (có đếm) | ✅ | Dữ liệu thật; không có xếp hạng hay số liệu tự đặt ra |
| Vé bán lại minh bạch | ✅ | Đang trống vì chưa có vé nào được rao bán |
| Vì sao chọn FairTicket | ✅ | |

### 2.3 Khám phá sự kiện — `#/events`

| Chức năng | Trạng thái |
|---|---|
| Tìm theo tên / địa điểm / địa chỉ, không cần gõ dấu | 🟢 |
| Lọc theo danh mục, theo tỉnh/thành; ẩn/hiện sự kiện đã diễn ra | 🟢 |
| Sắp xếp: mới nhất, sắp diễn ra, giá thấp đến cao | 🟢 |
| Bộ lọc lưu trên URL (gửi link cho người khác vẫn giữ bộ lọc) | 🟢 |

### 2.4 Chi tiết sự kiện — `#/events/:id`

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Ảnh bìa lớn, danh mục, trạng thái, thời gian, địa điểm | ✅ | |
| Giới thiệu · Thông tin · **Địa điểm (Google Maps + Chỉ đường)** · Chính sách vé · Xác minh blockchain | ✅ | Bản đồ không cần API key |
| Chọn hạng vé (còn lại / tổng, thanh tiến độ), số lượng (tối đa 10), tổng tiền | 🟢 | |
| Chặn mua khi sự kiện đã bắt đầu | 🟢 | Hợp đồng không tự chặn việc này |
| Thanh "Chọn vé" dính đáy màn hình trên mobile | 🟢 | |
| **Organizer:** thống kê, Sửa thông tin hiển thị, + Thêm hạng vé, nút mở màn hình check-in | 🟢 / 🟡 | Sửa thông tin và thêm hạng vé cần test bằng ví thật |

### 2.5 Thanh toán — `#/checkout/:eventId/:tierId/:qty`

| Chức năng | Trạng thái |
|---|---|
| Kiểm tra trước khi cho bấm: ví, mạng, số vé còn lại, số dư (cả phí gas), chạy thử giao dịch | 🟢 |
| Theo dõi từng vé: chờ ví → đã gửi (link Etherscan) → thành công / bị từ chối / revert | 🟢 (đã thử bấm từ chối trong ví) |
| Chỉ báo thành công khi blockchain xác nhận; chống bấm 2 lần; cảnh báo khi đóng trang | 🟢 |
| **Mua vé thành công bằng ví thật** | 🟡 Chưa thử: các lần mua thật (13/10, 15/10) diễn ra trước khi có trang thanh toán mới |

### 2.6 Vé bán lại — `#/resale`

| Chức năng | Trạng thái |
|---|---|
| Danh sách vé đang rao bán: giá gốc, giá bán lại, % chênh lệch, người bán, số lần đổi chủ | 🟢 |
| Lọc theo sự kiện, sắp xếp, ẩn vé của sự kiện đã bắt đầu | 🟢 |
| Mua lại: đọc lại trạng thái vé ngay trước khi gửi, có modal xác nhận | 🟢 / 🟡 |

### 2.7 Tạo sự kiện — `#/create`

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| 3 bước: Thông tin → Cấu hình vé → Triển khai (2 giao dịch + 1 chữ ký) | ✅ | Sự kiện #3 tạo thật ngày 20/10, ảnh và mô tả đã lưu lên server |
| Danh mục, mô tả, ảnh (tự nén ≤1600px) | ✅ | |
| **Địa chỉ kiểu TMĐT:** Tỉnh/Thành → Phường/Xã (gõ để tìm) → số nhà; chặn phường không thuộc tỉnh | 🟢 | 34 tỉnh / 3.321 phường-xã theo đơn vị hành chính mới |
| Bản đồ xem trước, cập nhật khi đang gõ | 🟢 | |
| Tự lưu bản nháp, F5 không mất | 🟢 | |

### 2.8 Vé của tôi — `#/my-tickets`

| Chức năng | Trạng thái |
|---|---|
| Thẻ vé điện tử, chia tab Sắp diễn ra / Đã sử dụng / Đang bán lại / Tất cả (có đếm) | ✅ (kiểm tra trên Vercel) |
| Modal vé: QR, chủ sở hữu kiểm tra lại trên chain, CA, lịch sử riêng của vé, chỉ đường | 🟢 |
| **Tạo mã check-in có chữ ký** (hết hạn 5 phút, đếm ngược) | 🟢 |
| Rao bán lại / đổi giá (chặn giá > 110% ngay trên giao diện) | 🟡 |
| Rút tiền | ✅ Ví `0x4f99…` đã rút thật 0.005 ETH ngày 20/10 |
| Lịch sử giao dịch của ví | ✅ (kiểm tra trên Vercel) |

### 2.9 Sự kiện của tôi (Dashboard Organizer) — `#/my-events`

| Chức năng | Trạng thái |
|---|---|
| Số liệu: số sự kiện, vé đã bán/tổng, doanh thu bán lần đầu, tiền chờ rút | 🟢 |
| Bảng sự kiện có lọc, nút Quản lý / Check-in (dạng thẻ trên mobile) | ✅ (kiểm tra trên Vercel) |
| Hoạt động gần đây của các sự kiện mình tổ chức | 🟢 |

### 2.10 Check-in tại cửa — `#/check-in`

| Chức năng | Trạng thái |
|---|---|
| Chọn sự kiện; quét camera, tải ảnh QR, hoặc dán mã / nhập số vé | 🟢 (đọc ảnh QR đã test) |
| Kiểm tra: chữ ký đúng chủ vé hiện tại, mã chưa quá 5 phút, vé thuộc đúng sự kiện, vé chưa check-in | 🟢 Đã thử đủ các trường hợp sai: ví khác ký, mã hết hạn, sửa số vé, sai sự kiện |
| Nhập tay số vé → cảnh báo "không có chữ ký, đối chiếu ví thủ công" | 🟢 |
| **Xác nhận check-in bằng ví thật** | 🟡 Chưa có check-in nào trên chain |
| Quét bằng camera điện thoại thật | 🟡 Cần HTTPS — bản Vercel đáp ứng |

### 2.11 API metadata — `/api/metadata`

| Chức năng | Trạng thái |
|---|---|
| Đọc ảnh, mô tả, địa điểm, địa chỉ, danh mục của sự kiện | ✅ Chạy thật trên Vercel |
| Ghi: bắt buộc chữ ký ví còn hạn, server kiểm tra người ký là organizer trên chain | ✅ Ví khác bị từ chối 403 |
| Lọc dữ liệu: ảnh chỉ nhận base64, danh mục theo danh sách, giới hạn độ dài | ✅ |

## 3. Việc cần làm cho website

| # | Việc | Ai |
|---|---|---|
| 1 | **Test bằng ví thật** theo thứ tự: tạo sự kiện ở ngày tương lai → ví B mua 2 vé → B rao bán lại (thử giá > 110% phải bị chặn) → ví C mua lại → C tạo mã check-in → Organizer quét bằng camera điện thoại → kiểm tra Dashboard | Cả nhóm |
| 2 | Gán danh mục và địa chỉ cho sự kiện cũ (đang hiện "Khác"): #0 và #2 bằng ví `0x4f99…`, #1 bằng ví `0x82d0…19A7` | Thảo + chủ ví #1 |
| 3 | Lưu mã giao dịch từ bước 1 vào `docs/PRESENTATION_PLAN.md` | Cả nhóm |
| 4 | (Tuỳ chọn) Thêm lọc theo khoảng giá / khoảng ngày ở trang Khám phá | — |

## 4. Giới hạn của website (nói rõ khi demo)

- Giao diện chặn một số việc mà **hợp đồng không chặn**: mua vé sau giờ bắt đầu, check-in nhầm vé của sự kiện khác. Gọi thẳng hợp đồng (Remix/Etherscan) thì vẫn làm được.
- Không có nút **gỡ rao bán**, vì hợp đồng không có hàm này; chỉ đổi giá được.
- Mã check-in còn hạn 5 phút: nếu chủ vé tự gửi mã cho người khác trong 5 phút đó thì người kia vào được. Hợp đồng vẫn chỉ cho check-in 1 lần.
- Website phụ thuộc Vercel, Tenderly, publicnode và Google Maps. Dịch vụ nào lỗi thì phần tương ứng báo lỗi kèm nút "Thử lại"; dữ liệu trên chain không bị ảnh hưởng.
- Chạy cục bộ bằng `python -m http.server` thì không có `/api`, nên ảnh và mô tả chỉ lưu trên máy.

## 5. Kỹ thuật

| Mục | Chi tiết |
|---|---|
| Công nghệ | HTML/CSS/JS thuần, không cần build; ethers.js 6.13.4, qrcode-generator, jsQR (CDN) |
| Định tuyến | Hash router: `#/`, `#/events`, `#/events/:id`, `#/checkout/...`, `#/resale`, `#/create`, `#/my-tickets`, `#/my-events` (`#/organizer`), `#/check-in` |
| Tệp chính | `web/index.html`, `web/styles.css`, `web/app.js`, `web/api/metadata.js`, `web/assets/vn-units.json`, `web/ProjectCore.abi.json` |
| Đọc chain | Ví (nếu đúng Sepolia) → không có thì publicnode; lịch sử qua Tenderly từ khối `11904408` |
| Bảo mật | Không có private key hay API key trên frontend; token Blob chỉ nằm ở Vercel / `web/.env` (không commit); ảnh và thuộc tính HTML được lọc chống XSS |
