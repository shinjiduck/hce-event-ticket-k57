# Bảng gas — Lab 9

Lấy số từ Remix: bấm mở rộng dòng giao dịch trong console (dưới cùng) sau mỗi lần gọi hàm, copy đúng số ở `transaction cost` và `execution cost` (đơn vị gas).

## TimeLockVault (bắt buộc — Remix VM)

| Thao tác | Trạng thái | Transaction cost (gas) | Execution cost (gas) |
|---|---|---|---|
| `deposit()` — nạp 0.01 ETH | success | 22 840 | — |
| `withdraw()` — gọi khi chưa hết khóa | reverted (StillLocked) | 21 206 | — |
| `withdraw()` — gọi sau khi hết khóa | success | | |

## ProjectCore (bonus)

| Thao tác | Trạng thái | Transaction cost (gas) | Execution cost (gas) |
|---|---|---|---|
| `createEvent(...)` | success | | |
| `mintTicket(...)` | success | 124 399 | — |
| `mintTicket(...)` bởi non-organizer | reverted (NotOrganizer) | | |
| `buyTicket(...)` | success | 63 931 | — |
| `buyTicket(...)` lần 2 (vé đã bán) | reverted (TicketAlreadySold) | | |
