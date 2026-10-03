# Bằng chứng — Lab 15 (Giao diện web và đưa sản phẩm lên mạng)

## Đã làm

- [x] [`ProjectCore.abi.json`](ProjectCore.abi.json) — ABI hiện tại của `ProjectCore.sol`.
- [x] Bảng ánh xạ (Bước 1) trong [README.md](../../README.md) mục "Giao diện web (`web/`) — kết nối Sepolia".
- [x] [`docs/PRESENTATION_PLAN.md`](../../docs/PRESENTATION_PLAN.md) — khung kịch bản trình bày (Bước 5), chưa điền tên người nói và mã giao dịch thật.
- [x] **Thiết kế lại toàn bộ UI (lần lặp 2)** theo phong cách Linear/Luma/Stripe/Eventbrite — "event website trước, blockchain app sau". Kiến trúc 3 file: `web/styles.css` (design system đầy đủ: màu, type scale, spacing 8px, bo góc 8-12px, shadow nhẹ), `web/app.js` (SPA router, 6 trang: Trang chủ, Sự kiện, Chi tiết sự kiện, Tạo sự kiện wizard 3 bước, Vé & Lịch sử, Checkout — toàn bộ giá bằng **ETH**, không VNĐ), `web/index.html` (khung header/footer).
- [x] "Hạng vé" (Standard/Premium/VIP) tính **thật** từ hợp đồng — gom các vé chưa bán theo `originalPrice`, không phải dữ liệu giả.
- [x] **Chế độ dữ liệu minh họa** (tự thêm, không có trong đề): khi chưa deploy contract thật, trang hiện 3 sự kiện mẫu đầy đủ (có ảnh, có hạng vé, có trạng thái khác nhau) để xem/trình bày giao diện ngay — luôn có banner cảnh báo "Chưa cấu hình" đi kèm để không nhầm là dữ liệu thật.
- [x] 4 ảnh chụp thật (do AI tạo qua Canva `generate-image`, phong cách tài liệu — không phải 3D/illustration) lưu ở `web/assets/`: `hero.jpg`, `event-conference.jpg`, `event-festival.jpg`, `event-jazz.jpg`.
- [x] **Đã test bằng trình duyệt thật (Playwright + Edge có sẵn trên máy)** — 2 vòng kiểm thử, vòng 1 phát hiện 2 lỗi responsive mobile thật (banner vỡ chữ, nav header vỡ dòng), đã sửa cả 2, vòng 2 xác nhận hết lỗi. Chụp đủ desktop (1440px) + mobile (390px) cho cả 6 trang và luồng chọn vé → checkout. Chi tiết trong `docs/AI_JOURNAL.md` mục Lab 15.
- [x] **Phát hiện quan trọng:** địa chỉ Sepolia cũ (từ Lab 9, `0xb8Cb6Fe71f1Cb5682f27fb738FC2d78DCF09A149`) đã lỗi thời — thiếu hàm `listForResale`/`buyResaleTicket`/`withdrawProceeds`. Phải deploy lại bản `ProjectCore.sol` mới nhất lên Sepolia trước khi dùng thật.

## Chưa làm được (cần môi trường thật — ví MetaMask, mạng Sepolia, điện thoại)

- [ ] Deploy `ProjectCore.sol` (bản mới nhất, đã qua Lab 10/11/14) lên Sepolia → lấy địa chỉ mới, điền vào README và `web/app.js` (hằng số `CONTRACT_ADDRESS` ở đầu file).
- [ ] Kết nối ví MetaMask thật, chạy 1 luồng thành công (VD: tạo sự kiện → phát hành vé → mua vé) + 1 luồng bị từ chối (VD: rao bán giá > 110%), xác nhận thông báo lỗi hiện tiếng Việt thân thiện (đã viết sẵn bảng dịch lỗi trong code, chưa test với ví thật).
- [ ] Bật GitHub Pages cho `web/`, lấy URL công khai, mở thử trên điện thoại thật.
- [ ] Điền tên người nói + mã giao dịch thật vào `docs/PRESENTATION_PLAN.md`.
- [ ] Commit `lab-15: public dapp va presentation plan` + tag `v0.1-demo`.
