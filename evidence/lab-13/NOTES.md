# Bằng chứng — Lab 13 (Thực nghiệm một vụ mất tiền và cách khắc phục)

## Bài luyện — `contracts/training/VulnerableBank.sol` + `Attacker.sol` (phần hands-on Remix, cần người thật làm)

Đã có bằng chứng dạng **log chạy thật trên EVM** (Hardhat local network) chứng minh đúng kịch bản đề bài mô tả:

- [x] [`reentrancy.test.js`](reentrancy.test.js) — mã nguồn 2 ca: tấn công `VulnerableBank.sol` thành công, và tấn công `VulnerableBank_Fixed.sol` (đã vá Cách 1 — đổi thứ tự CEI) thất bại hoàn toàn.
- [x] [`reentrancy-log.txt`](reentrancy-log.txt) — log chạy:
  - 3 tài khoản deposit 2 ETH mỗi người → `bankBalance() = 6 ETH`.
  - `Attacker.attack()` với 1 ETH → `bankBalance() = 0 ETH`, hợp đồng `Attacker` giữ toàn bộ `7 ETH`.
  - Chạy lại `attack()` trên bản đã vá → **revert toàn bộ** ("Chuyen that bai") — không chỉ bị chặn phần bù trội, mà cả giao dịch tấn công thất bại, tiền của 3 người kia (6 ETH) an toàn tuyệt đối.

- [ ] **Vẫn cần làm thêm (không thay được bằng log):** ảnh hoặc ảnh động chụp trực tiếp trên **Remix VM** với 4 tài khoản thật (theo đúng Bước 1–2 của đề) — log Hardhat ở trên chỉ là bằng chứng kỹ thuật bổ sung, không thay thế yêu cầu "ảnh hoặc ảnh động chụp Remix" trong đề.
- [ ] Chạy Bước 3 (hỏi AI theo lối dẫn dắt, không đưa mã sửa ngay) — ghi lại 2 cách khắc phục AI đề xuất và so sánh, lưu vào `docs/AI_JOURNAL.md`.

## Mục tiêu thật — `contracts/project/ProjectCore.sol` (đã xong)

- [x] Soi lại mọi chỗ chuyển tiền / gọi hợp đồng khác / đổi quyền trong `ProjectCore.sol`: `buyTicket()`, `buyResaleTicket()`, `withdrawProceeds()`, `listForResale()`, `mintTicket()`, `createEvent()`.
- [x] 2 ca kiểm thử thất bại (vượt yêu cầu tối thiểu 1 ca) — xem [`projectcore-negative.test.js`](projectcore-negative.test.js) và log [`projectcore-negative-log.txt`](projectcore-negative-log.txt):
  1. **Sai số tiền:** `buyTicket()` gửi sai giá → revert `IncorrectPayment` đúng như SPEC.
  2. **Gọi lại (reentrancy):** dựng hợp đồng `ReentrantOrganizer` ([`ReentrantOrganizer.sol`](ReentrantOrganizer.sol)) cố tình gọi lại `withdrawProceeds()` ngay trong lúc đang nhận tiền — bị chặn đúng cơ chế pull-payment đã vá từ Lab 10, không rút được lần 2.
- [x] Không phát hiện hành vi sai SPEC.md nào cần vá thêm — mô hình pull-payment từ Lab 10 đã đứng vững trước phép thử reentrancy của Lab 13, không cần sửa `ProjectCore.sol` lần này.
