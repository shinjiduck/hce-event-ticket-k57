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
- [docs/SPEC.md](docs/SPEC.md) — đặc tả v0.1
- [docs/ECONOMIC_RULES.md](docs/ECONOMIC_RULES.md) — quy tắc kinh tế
- [docs/AI_JOURNAL.md](docs/AI_JOURNAL.md) — nhật ký sử dụng AI

## Cách chạy

Contract chính: [contracts/project/ProjectCore.sol](contracts/project/ProjectCore.sol) (Solidity `^0.8.20`).

**Cách 1 — Remix (dùng trong lớp):**
1. Mở [remix.ethereum.org](https://remix.ethereum.org), tạo file mới, dán nội dung `ProjectCore.sol`.
2. Tab Solidity Compiler → chọn phiên bản `0.8.20` trở lên → Compile.
3. Tab Deploy & Run → môi trường "Remix VM" (thử nhanh, miễn phí) hoặc "Injected Provider - MetaMask" (Sepolia, để có bằng chứng on-chain thật) → Deploy.
4. Gọi lần lượt: `createEvent(name, startTime, maxSupply)` → `mintTicket(eventId, originalPrice)` → `buyTicket(ticketId)` kèm `value` đúng giá vé → `listForResale(ticketId, price)` / `buyResaleTicket(ticketId)` nếu muốn thử luồng bán lại.

**Cách 2 — biên dịch nhanh bằng dòng lệnh (kiểm tra không lỗi cú pháp, không deploy):**
```
npx solc --bin --abi contracts/project/ProjectCore.sol
```

**Kiểm thử tự động (ca hợp lệ + ca vi phạm quy tắc R3):** xem [evidence/lab-11/resale.test.js](evidence/lab-11/resale.test.js) và log kết quả tại [evidence/lab-11/test-log.txt](evidence/lab-11/test-log.txt).

## Giao diện web (`web/`) — kết nối Sepolia

| Thành phần | Giá trị của nhóm |
|---|---|
| Địa chỉ contract | [`0x09967aeeb595236e74BD5F283a9Ff1960e695AF2`](https://sepolia.etherscan.io/address/0x09967aeeb595236e74BD5F283a9Ff1960e695AF2) (Sepolia) |
| ABI lấy từ đâu | Remix → tab Solidity Compiler → biên dịch `contracts/project/ProjectCore.sol` → nút **ABI** (copy). Bản lưu sẵn để đối chiếu: [evidence/lab-15/ProjectCore.abi.json](evidence/lab-15/ProjectCore.abi.json) |
| Hàm đọc không tốn phí (`view`, không cần ký ví) | `nextEventId()`, `nextTicketId()`, `MAX_RESALE_BPS()`, `events(eventId)`, `tickets(ticketId)`, `pendingWithdrawals(address)` |
| Hàm ghi cần xác nhận ví (gửi transaction, tốn gas) | `createEvent()`, `mintTicket()`, `buyTicket()`, `listForResale()`, `buyResaleTicket()`, `withdrawProceeds()` |

**✅ Đã deploy lại bản mới nhất** (có đủ `listForResale`/`buyResaleTicket`/`withdrawProceeds`) tại địa chỉ trong bảng trên, thay cho địa chỉ cũ từ Lab 9 (`0xb8Cb6Fe71f1Cb5682f27fb738FC2d78DCF09A149`) vốn thiếu các hàm này.

**Cấu trúc `web/`:** `index.html` (khung trang) + `styles.css` (design system) + `app.js` (router, logic contract). Điền `CONTRACT_ADDRESS` ở **đầu file `web/app.js`** (không phải `index.html`). Trước khi deploy contract thật, trang tự chuyển sang **chế độ dữ liệu minh họa** (3 sự kiện mẫu) để xem/trình bày giao diện — luôn có banner vàng nhắc chưa cấu hình thật.

### Các bước còn lại để đưa web lên mạng công khai (Lab 15)

1. ~~**Deploy lại contract** lên Sepolia~~ ✅ Xong — địa chỉ ở bảng trên.
2. ~~**Cấu hình** `CONTRACT_ADDRESS` trong `web/app.js`~~ ✅ Xong.
3. **Test cục bộ:** chạy `python -m http.server 4173` trong thư mục `web/`, mở `http://localhost:4173`, bấm "Kết nối ví" (MetaMask phải đang ở mạng Sepolia), thử tạo 1 sự kiện thật → phát hành vé → mua vé, xác nhận giao dịch hiện trên [Sepolia Etherscan](https://sepolia.etherscan.io/).
4. **Đưa lên GitHub Pages:**
   - Vào repo trên GitHub → **Settings → Pages**.
   - Mục "Build and deployment" → Source: **Deploy from a branch**.
   - Branch: `main`, thư mục: **`/web`** → Save.
   - Đợi vài phút, GitHub cấp link dạng `https://<tên tài khoản>.github.io/<tên kho>/`.
5. **Test trên điện thoại:** mở link đó bằng trình duyệt có MetaMask mobile (hoặc quét QR từ MetaMask), lặp lại luồng mua vé, lưu lại mã giao dịch (transaction hash) làm bằng chứng nộp bài.
6. Điền `docs/PRESENTATION_PLAN.md`, commit `lab-15: public dapp va presentation plan`, gắn tag `v0.1-demo`.
