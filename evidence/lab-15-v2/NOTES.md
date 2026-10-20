# Bằng chứng — Thiết kế lại hợp đồng (public mint + check-in)

Sau khi test web thật, phát hiện `mintTicket()` cũ bắt Organizer phát hành từng vé một (không khả thi với số lượng lớn). Thiết kế lại sang mô hình public mint theo hạng vé + thêm check-in. Chi tiết quyết định: `docs/AI_JOURNAL.md` mục "Lab 15 — thiết kế lại hợp đồng".

## Đã làm

- [x] [`projectcore-v2.test.js`](projectcore-v2.test.js) + [`ReentrantOrganizer.sol`](ReentrantOrganizer.sol) — mã test Hardhat.
- [x] [`projectcore-v2-test-log.txt`](projectcore-v2-test-log.txt) — log chạy, **7/7 test pass**:
  1. Ai cũng tự mint vé thành công (không cần Organizer phát hành hộ).
  2. Mint sai giá → revert `IncorrectPayment`.
  3. Mint vượt tổng cung hạng vé → revert `TierSupplyReached`.
  4. Rao bán lại ≤110% thành công; >110% → revert `ResalePriceTooHigh`.
  5. Check-in: chỉ Organizer, revert `NotOrganizer` nếu người lạ gọi; revert `TicketAlreadyCheckedIn` nếu check-in lần 2.
  6. Vé đã check-in → revert `TicketCheckedInCannotResell` khi rao bán lại.
  7. **Reentrancy (lặp lại kịch bản Lab 13)** lên `withdrawProceeds()` — hardening pull-payment từ Lab 10 vẫn đứng vững sau khi đổi toàn bộ model dữ liệu.
- [x] `docs/SPEC.md` viết lại thành v0.2 (R1 đổi ý nghĩa, thêm R1b, Tier vào data model).
- [x] `web/app.js` viết lại gần như toàn bộ cho khớp model Tier mới + panel Organizer (tạo hạng vé, check-in) + QR vé (`qrcode-generator` qua CDN).
- [x] Test lại toàn bộ giao diện bằng Playwright (ví giả lập) — 0 lỗi console, tier/organizer-panel/checkout/QR đều render đúng.

- [x] Deploy `ProjectCore.sol` bản v2 lên Sepolia tại địa chỉ [`0x0f96cafe4C603D706c786C503A5c903090706916`](https://sepolia.etherscan.io/address/0x0f96cafe4C603D706c786C503A5c903090706916).
- [x] Điền `CONTRACT_ADDRESS` mới vào `web/app.js` + README.
- [ ] Test trực tiếp bằng ví thật trên Sepolia (tạo sự kiện → tạo hạng vé → mint vé → check-in → lưu 2 transaction hash cho presentation plan).
