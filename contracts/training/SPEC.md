# SPEC.md — TimeLockVault (Lab 9)

Đặc tả kỹ thuật cho hợp đồng học trong `contracts/training/TimeLockVault.sol`. Bài toán: két tiết kiệm — người tạo két nạp tiền vào, chỉ rút ra được sau một mốc thời gian đã định; trước mốc đó kể cả người tạo cũng không rút được.

## Quy tắc

- **R1 — Ai cũng nạp được tiền vào két.**
  Hàm `deposit()` là `external payable`, không kiểm tra người gọi — bất kỳ địa chỉ nào cũng gọi được.

- **R2 — Chỉ người tạo két mới rút được.**
  `withdraw()` kiểm tra `msg.sender == owner` (địa chỉ đã triển khai hợp đồng); sai → `revert NotOwner()`.

- **R3 — Chỉ rút được khi thời điểm hiện tại đã qua mốc mở khóa.**
  `withdraw()` kiểm tra `block.timestamp >= unlockTime`; còn sớm → `revert StillLocked(unlockAt, currentTime)`.

- **R4 — Số tiền nạp phải lớn hơn 0.**
  `deposit()` kiểm tra `msg.value > 0`; bằng 0 → `revert ZeroAmount()`.

- **R5 — Mọi lần nạp và rút đều phải ghi lại sự kiện để tra cứu được.**
  `deposit()` phát `event Deposited(address indexed from, uint256 amount)`; `withdraw()` phát `event Withdrawn(address indexed to, uint256 amount)` trước khi chuyển tiền (thứ tự Checks–Effects–Interactions).

## Ràng buộc khác

- `unlockTime` được cố định tại thời điểm triển khai: `unlockTime = block.timestamp + lockDurationSeconds` trong `constructor`, không có hàm nào thay đổi được sau đó.
- `withdraw()` rút toàn bộ số dư hiện có của hợp đồng (`address(this).balance`); nếu số dư bằng 0 → `revert NothingToWithdraw()`.
- Chuyển tiền dùng `call` thay cho `transfer`/`send` để không bị giới hạn cứng 2300 gas.
