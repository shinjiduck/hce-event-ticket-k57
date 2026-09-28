# Gate Review 1 — FairTicket

> File này chốt lại tại buổi Lab 12. Phần "Chuẩn bị của nhóm" điền trước giờ học; phần "Kết luận của giảng viên" chỉ điền tại lớp, không tự ý điền trước.

## Chuẩn bị của nhóm (tự kiểm tra sức khỏe repo — Bước 1)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| README.md nói rõ bài toán, người dùng, cách chạy | ✅ | Bổ sung mục "Cách chạy" trước Gate Review 1 |
| PROJECT_PLAN.md / SPEC.md / ECONOMIC_RULES.md khớp với mã | ⚠️ | Xem "Khoảng cách đã biết" bên dưới |
| `ProjectCore.sol` biên dịch được | ✅ | `npx solc --bin --abi contracts/project/ProjectCore.sol` không lỗi |
| Có 1 ca hợp lệ + 1 ca vi phạm bị chặn | ✅ | `evidence/lab-11/test-log.txt` (R3 — trần giá bán lại 110%) |
| Lịch sử commit có đóng góp của cả 2 thành viên | ✅ | Cả 2 thành viên đều đã có commit đóng góp rõ ràng (Linh: Lab 8, Lab 10, Lab 11; Thảo: Lab 8, Lab 9, Lab 10, Lab 11, Lab 12) |

### Khoảng cách đã biết giữa SPEC.md và mã hiện tại

- `checkIn()` (R5, R6) — có trong SPEC.md nhưng **chưa cài** vào `ProjectCore.sol`. Quyết định có chủ ý, dời sang lab sau (ghi trong comment đầu file `ProjectCore.sol`).
- R7 (`listForResale()`/`buyResaleTicket()` chỉ được phép trước `event.startTime`) — **chưa cài**. Hiện tại vé có thể rao bán lại bất cứ lúc nào, kể cả sau khi sự kiện đã diễn ra.
- R6 (vé đã check-in bị khóa, không bán lại được) — chưa áp dụng được vì `checkIn()` chưa tồn tại.

### Vấn đề cần xử lý trước khi Gate Review (không phải chờ giảng viên)

**Đã hoàn thành:** Linh đã thực hiện commit và push độc lập các phần Lab 10 (`contracts/training/VaultBuggy.sol`, bảng audit) và Lab 11 (kiểm thử R4 + ảnh minh chứng `04-resale-not-owner-reverted.png`) bằng tài khoản `maibalinh089-crypto`. Lịch sử commit trên repository hiện tại đã phản ánh đầy đủ đóng góp của cả hai thành viên.

## Demo 3 phút — kịch bản chia vai

| Thời lượng | Nội dung | Người nói |
|---|---|:---:|
| 30s | Ai gặp vấn đề gì (sự cố kỹ thuật git & khôi phục VaultBuggy) | **Mai Bá Linh** |
| 30s | Quy tắc kinh tế/quyền lợi quan trọng nhất — R3 (trần giá 110%) & R4 (quyền chủ vé) | **Mai Bá Linh** |
| 60s | Mở `ProjectCore.sol`, chạy một luồng thành công (createEvent → mintTicket → buyTicket → listForResale) | **Nguyễn Hoàng Thảo** |
| 30s | Chạy ca vi phạm — `listForResale()` giá > 110% revert `ResalePriceTooHigh` & không phải chủ vé revert `NotTicketOwner` | **Nguyễn Hoàng Thảo** |
| 30s | Việc sẽ hoàn thành tiếp theo (checkIn, R6, R7 & kế hoạch hoán vai Lab 13–15) | **Linh & Thảo** |

## Kết luận của giảng viên (điền tại lớp)

- **Kết luận:** ☐ Qua ☐ Qua có điều kiện ☐ Thu hẹp phạm vi
- **Ba việc bắt buộc sửa:**
  1.
  2.
  3.
- **Tính năng bị cắt (nếu có):**
- **Hạn hoàn thành:**

## Cập nhật phạm vi sau Gate Review (Bước 4)

_Điền sau khi có kết luận, rồi cập nhật `docs/PROJECT_PLAN.md` — gán người chịu trách nhiệm Lab 13–15 theo bảng vai trò đã hoán đổi._
