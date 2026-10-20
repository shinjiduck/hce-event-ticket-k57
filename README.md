# FairTicket

DApp quản lý vé sự kiện chống vé giả và hạn chế đầu cơ.

## Giới thiệu sản phẩm

> Nhóm xây nền tảng vé sự kiện cho người tham dự và ban tổ chức để chống vé giả, hạn chế đầu cơ và đảm bảo mỗi vé chỉ được check-in một lần.

## Chủ đề

Vé sự kiện giới hạn bán lại.

## Thành viên

- Mai Bá Linh
- Nguyễn Hoàng Thảo

## Tài liệu

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) — vai trò, mốc bắt buộc
- [docs/SPEC.md](docs/SPEC.md) — đặc tả v0.2
- [docs/ECONOMIC_RULES.md](docs/ECONOMIC_RULES.md) — quy tắc kinh tế v0.2
- [docs/AI_JOURNAL.md](docs/AI_JOURNAL.md) — nhật ký sử dụng AI
- [docs/WEBSITE.md](docs/WEBSITE.md) — **tiến độ website**: từng trang có gì, đã chạy thật hay chưa, việc cần test
- [docs/PROGRESS.md](docs/PROGRESS.md) — **tiến độ dự án**: trạng thái từng Lab, việc còn lại, lỗi đã sửa, giao dịch thật trên Sepolia

**DApp công khai:** https://hce-event-ticket-k57-git-main-nguyenhoangthao.vercel.app

## Cách chạy

Contract chính: [contracts/project/ProjectCore.sol](contracts/project/ProjectCore.sol) (Solidity `^0.8.20`).

**Cách 1 — Remix (dùng trong lớp):**
1. Mở [remix.ethereum.org](https://remix.ethereum.org), tạo file mới, dán nội dung `ProjectCore.sol`.
2. Tab Solidity Compiler → chọn phiên bản `0.8.20` trở lên → Compile.
3. Tab Deploy & Run → môi trường "Remix VM" (thử nhanh, miễn phí) hoặc "Injected Provider - MetaMask" (Sepolia, để có bằng chứng on-chain thật) → Deploy.
4. Gọi lần lượt: `createEvent(name, startTime)` → `createTier(eventId, name, price, maxSupply)` → `mintTicket(tierId)` kèm `value` đúng giá hạng vé → `listForResale(ticketId, price)` / `buyResaleTicket(ticketId)` để thử bán lại → `checkIn(ticketId)` (ví Organizer) → `withdrawProceeds()`.

**Cách 2 — biên dịch nhanh bằng dòng lệnh (kiểm tra không lỗi cú pháp, không deploy):**
```
npx solc --bin --abi contracts/project/ProjectCore.sol
```

**Kiểm thử tự động (ca hợp lệ + ca vi phạm quy tắc R3):** xem [evidence/lab-11/resale.test.js](evidence/lab-11/resale.test.js) và log kết quả tại [evidence/lab-11/test-log.txt](evidence/lab-11/test-log.txt).

## Giao diện web (`web/`) — kết nối Sepolia

> ✅ **Contract đã thiết kế lại (public mint theo hạng vé + check-in) và đã deploy bản v2.** Địa chỉ Sepolia cũ (`0x09967aeeb595236e74BD5F283a9Ff1960e695AF2`, Lab 15 bản đầu) không còn dùng — thiếu `createTier`/`checkIn`.

| Thành phần | Giá trị của nhóm |
|---|---|
| Địa chỉ contract | [`0x0f96cafe4C603D706c786C503A5c903090706916`](https://sepolia.etherscan.io/address/0x0f96cafe4C603D706c786C503A5c903090706916) (Sepolia) |
| ABI lấy từ đâu | Remix → tab Solidity Compiler → biên dịch `contracts/project/ProjectCore.sol` → nút **ABI** (copy). Bản lưu sẵn để đối chiếu: [web/ProjectCore.abi.json](web/ProjectCore.abi.json) |
| Hàm đọc không tốn phí (`view`, không cần ký ví) | `nextEventId()`, `nextTierId()`, `nextTicketId()`, `MAX_RESALE_BPS()`, `events(id)`, `tiers(id)`, `tickets(id)`, `pendingWithdrawals(address)` |
| Hàm ghi cần xác nhận ví (gửi transaction, tốn gas) | `createEvent()`, `createTier()` *(Organizer)*, `mintTicket()` *(ai cũng gọi được)*, `listForResale()`, `buyResaleTicket()`, `checkIn()` *(Organizer)*, `withdrawProceeds()` |

**Mô hình mới:** Organizer tạo sự kiện rồi tạo từng **hạng vé** (`createTier`: tên + giá + tổng cung, VD "Standard" 0.02 ETH × 50). Sau đó **ai cũng tự `mintTicket(tierId)` được trực tiếp** (trả đúng giá, không cần Organizer phát hành hộ) — kiểu "public mint" của NFT. Tại cửa, chủ vé tạo **mã QR check-in có chữ ký ví** (hết hạn sau 5 phút); Organizer quét ở trang `#/check-in`, hệ thống kiểm tra người ký là chủ vé hiện tại trên chain rồi mới gọi `checkIn()`.

**Cấu trúc `web/`:** `index.html` (khung trang) + `styles.css` (design system) + `app.js` (router, logic contract) + `api/metadata.js` (Vercel Function lưu ảnh/mô tả/địa chỉ/danh mục vào Vercel Blob, ghi phải kèm chữ ký ví của Organizer) + `assets/vn-units.json` (34 tỉnh/thành, 3.321 phường/xã). `CONTRACT_ADDRESS` nằm ở **đầu file `web/app.js`** và trong `web/api/metadata.js`. Kiến trúc chi tiết: [docs/PROGRESS.md](docs/PROGRESS.md#5-kiến-trúc-hiện-tại).

### Chạy và deploy

1. **Test cục bộ (không có API metadata):** chạy `python -m http.server 4173` trong thư mục `web/`, mở `http://localhost:4173`. Ảnh/mô tả chỉ lưu trên máy vì không có `/api`.
2. **Deploy lên Vercel (cách nhóm đang dùng — GitHub Pages không chạy được `/api`):**
   - Import repo vào Vercel, **Root Directory = `web`**, tắt Deployment Protection để URL công khai.
   - Tab **Storage** → tạo Blob store → Vercel tự thêm biến `BLOB_READ_WRITE_TOKEN` (mẫu: `web/.env.example`; file `web/.env` thật **không commit**).
   - Mỗi lần push lên `main`, Vercel tự deploy lại.
3. **Deploy lại hợp đồng (chỉ khi sửa `ProjectCore.sol`):** Remix → Injected Provider - MetaMask → Sepolia → Deploy. Đổi địa chỉ trong `web/app.js`, `web/api/metadata.js`, `FIRST_LOG_BLOCK` trong `web/app.js` (khối có log đầu tiên của hợp đồng mới) và README này. Dữ liệu cũ sẽ không còn hiển thị.
