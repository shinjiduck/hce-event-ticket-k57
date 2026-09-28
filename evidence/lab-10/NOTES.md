# Bằng chứng — Lab 10 (Rà soát mã nguồn do AI sinh ra)

## `contracts/training/VaultBuggy.sol` (bài luyện, phần của Linh)

Yêu cầu: tìm ra ít nhất 3/4 lỗi cài sẵn, phân biệt lỗi do AI tìm vs lỗi do sinh viên tự tìm (Bước 1–2), và chứng minh bằng thực nghiệm rằng `private` không có nghĩa là bí mật (Bước 3).

Việc cần làm và lưu vào đúng thư mục này:

- [ ] `01-vaultbuggy-storage-leak.png` — ảnh chụp kết quả `eth_getStorageAt(..., "0x2", "latest")` sau khi deploy `VaultBuggy` với `_pin = 123456`, cho thấy giá trị `0x1e240` (=123456) đọc được dù biến khai báo `private`.
- [ ] Bảng phân tích 4 lỗi — đã có khung sẵn trong [docs/AI_JOURNAL.md](../../docs/AI_JOURNAL.md), mục "## Lab 10 → Bảng phát hiện lỗi — `VaultBuggy.sol`". Điền nốt 4 dòng ở đó, không cần lặp lại ở đây.

## `contracts/project/ProjectCore.sol` (mục tiêu thật, phần của Thảo)

Đã xong — xem bảng trong [docs/AI_JOURNAL.md](../../docs/AI_JOURNAL.md), mục "## Lab 10 → Bảng phát hiện lỗi — `ProjectCore.sol`". 2 lỗi tìm được (DoS do push-payment, thiếu validate giá/tran vé) đã sửa và biên dịch lại thành công, commit `5ebae7f`.
