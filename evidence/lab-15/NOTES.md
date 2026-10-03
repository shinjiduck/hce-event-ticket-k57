# Bằng chứng — Lab 15 (Giao diện web và đưa sản phẩm lên mạng)

## Đã làm

- [x] [`ProjectCore.abi.json`](ProjectCore.abi.json) — ABI hiện tại của `ProjectCore.sol`.
- [x] Bảng ánh xạ (Bước 1) trong [README.md](../../README.md) mục "Giao diện web (`web/`) — kết nối Sepolia".
- [x] [`docs/PRESENTATION_PLAN.md`](../../docs/PRESENTATION_PLAN.md) — khung kịch bản trình bày (Bước 5), chưa điền tên người nói và mã giao dịch thật.
- [x] **`web/index.html`** — giao diện riêng tự xây (không dùng bản tối giản giảng viên phát), theo theme FairTicket: tạo sự kiện, phát hành vé, mua vé, chợ bán lại (R3), rút tiền, lịch sử giao dịch đọc thẳng từ blockchain. Dùng skill `ui-skills` (`ibelick/ui-skills`) để áp chuẩn UI (không gradient, 1 màu nhấn, mobile-first, `aria-label`, `safe-area-inset`...).
- [x] `web/ProjectCore.abi.json` — bản ABI đặt sẵn trong `web/` để trang tự fetch, không cần dán tay.
- [x] **Đã test bằng trình duyệt thật (Playwright + Edge có sẵn trên máy):** cả 4 tab render đúng trên mobile (420px) và desktop (1280px), chuyển tab mượt, không lỗi console đáng kể (chỉ `favicon.ico` 404, vô hại), ABI tự nạp thành công. Chi tiết ghi trong `docs/AI_JOURNAL.md` mục Lab 15.
- [x] **Phát hiện quan trọng:** địa chỉ Sepolia cũ (từ Lab 9, `0xb8Cb6Fe71f1Cb5682f27fb738FC2d78DCF09A149`) đã lỗi thời — thiếu hàm `listForResale`/`buyResaleTicket`/`withdrawProceeds`. Phải deploy lại bản `ProjectCore.sol` mới nhất lên Sepolia trước khi dùng thật.

## Chưa làm được (cần môi trường thật — ví MetaMask, mạng Sepolia, điện thoại)

- [ ] Deploy `ProjectCore.sol` (bản mới nhất, đã qua Lab 10/11/14) lên Sepolia → lấy địa chỉ mới, điền vào README và `web/index.html` (`CONTRACT_ADDRESS`).
- [ ] Kết nối ví MetaMask thật, chạy 1 luồng thành công (VD: tạo sự kiện → phát hành vé → mua vé) + 1 luồng bị từ chối (VD: rao bán giá > 110%), xác nhận thông báo lỗi hiện tiếng Việt thân thiện (đã viết sẵn bảng dịch lỗi trong code, chưa test với ví thật).
- [ ] Bật GitHub Pages cho `web/`, lấy URL công khai, mở thử trên điện thoại thật.
- [ ] Tuỳ chỉnh thêm CSS/nội dung nếu muốn (giữ nguyên mọi `id` vì JS đang dùng).
- [ ] Điền tên người nói + mã giao dịch thật vào `docs/PRESENTATION_PLAN.md`.
- [ ] Commit `lab-15: public dapp va presentation plan` + tag `v0.1-demo`.
