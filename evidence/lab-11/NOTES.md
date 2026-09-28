# Bằng chứng — Lab 11 (Cài quy tắc kinh tế vào sản phẩm)

Quy tắc đã chọn: **R3 — Trần giá bán lại** (`docs/ECONOMIC_RULES.md`, mục II.1) — `resalePrice` không được vượt quá 110% `originalPrice`, cài vào `listForResale()` trong `contracts/project/ProjectCore.sol`.

Đã có bằng chứng dạng **log chạy test thật trên EVM** (Hardhat local network, không phải mock) thay cho ảnh chụp Remix — đề bài chấp nhận "ảnh hoặc log":

- [x] [`resale.test.js`](resale.test.js) — mã nguồn 2 ca kiểm thử.
- [x] [`test-log.txt`](test-log.txt) — log chạy `npx hardhat test`:
  - Ca hợp lệ: `listForResale()` giá đúng 110% giá gốc (`0.011 ETH`) → thành công, phát event `TicketListedForResale`; sau đó `buyResaleTicket()` mua lại thành công, đổi chủ.
  - Ca vi phạm: `listForResale()` giá 120% giá gốc (`0.012 ETH`) → bị từ chối đúng lỗi `ResalePriceTooHigh(attempted=0.012 ETH, limit=0.011 ETH)`.
- [x] [`04-resale-not-owner-reverted.png`](04-resale-not-owner-reverted.png) — ảnh chụp Remix VM kiểm thử bổ sung quy tắc **R4 (chỉ chủ vé được rao bán lại)**: Account B (không phải chủ sở hữu vé #0) gọi `listForResale()` bị từ chối đúng lỗi `NotTicketOwner()`.
