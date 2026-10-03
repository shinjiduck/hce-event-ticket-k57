# Bằng chứng — Lab 15 (Giao diện web và đưa sản phẩm lên mạng)

## Đã chuẩn bị trước (không phải phần web — phần web để Linh/Thảo tự xây)

- [x] [`ProjectCore.abi.json`](ProjectCore.abi.json) — ABI hiện tại của `ProjectCore.sol`, dán thẳng vào `CONTRACT_ABI` trong file HTML giảng viên phát.
- [x] Bảng ánh xạ (Bước 1) đã thêm vào [README.md](../../README.md) mục "Giao diện web (`web/`) — kết nối Sepolia".
- [x] [`docs/PRESENTATION_PLAN.md`](../../docs/PRESENTATION_PLAN.md) — khung kịch bản trình bày (Bước 5), chưa điền tên người nói và mã giao dịch thật.
- [x] **Phát hiện quan trọng:** địa chỉ Sepolia cũ (từ Lab 9, `0xb8Cb6Fe71f1Cb5682f27fb738FC2d78DCF09A149`) đã lỗi thời — thiếu hàm `listForResale`/`buyResaleTicket`/`withdrawProceeds`. Phải deploy lại bản `ProjectCore.sol` mới nhất lên Sepolia trước khi nối giao diện.

## Còn lại — phần web, Linh + Thảo tự làm

- [ ] Deploy `ProjectCore.sol` (bản mới nhất, đã qua Lab 10/11/14) lên Sepolia → lấy địa chỉ mới, điền vào README.
- [ ] Lấy file HTML hoàn chỉnh từ giảng viên (chưa có trong repo).
- [ ] Bước 1: dán `CONTRACT_ABI` + `CONTRACT_ADDRESS` mới, bấm Kết nối ví thử.
- [ ] Bước 2: chạy 1 luồng thành công + 1 luồng bị từ chối, xác nhận thông báo lỗi là tiếng người (không phải chuỗi kỹ thuật) — nhờ đã dùng `error` tùy biến từ Lab 9.
- [ ] Bước 3: đặt `index.html` vào `web/`, bật GitHub Pages, lấy URL công khai, mở thử trên điện thoại.
- [ ] Bước 4: nhờ AI chỉnh HTML/CSS (giữ nguyên JS và mọi `id`) — đổi tiêu đề thành tên sản phẩm "FairTicket", làm gọn trên điện thoại.
- [ ] Bước 5: điền tên người nói + mã giao dịch thật vào `docs/PRESENTATION_PLAN.md`.
- [ ] Commit `lab-15: public dapp va presentation plan` + tag `v0.1-demo`.
