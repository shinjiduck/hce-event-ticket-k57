# TỰ RÀ SOÁT (chuẩn bị trước Lab 14) — `contracts/project/ProjectCore.sol`

> File này **không phải** `docs/AUDIT_REPORT.md` thật của Lab 14 (file đó sẽ do nhóm bạn rà soát chéo tạo ra, nộp vào repo nhóm mình sau khi ghép cặp trên lớp). Đây là bản nhóm tự chạy trước đúng bộ 10 tiêu chí để (1) vá trước những gì tự tìm được, (2) làm quen checklist trước khi đi rà soát nhóm khác.

## Tóm tắt

Đã rà soát `contracts/project/ProjectCore.sol`, 183 dòng (trước khi vá). Phát hiện 3 vấn đề: 1 nhẹ-trung bình đã sửa, 2 quan sát (ghi nhận, không phải lỗi mới).

## Đối chiếu 10 tiêu chí bắt buộc

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Phân quyền | ✅ Đạt — `mintTicket()` kiểm tra `msg.sender == evt.organizer`; `listForResale()` kiểm tra `msg.sender == t.owner`. `createEvent()`/`buyTicket()`/`buyResaleTicket()` cố ý không giới hạn người gọi (đúng thiết kế). |
| 2 | Thứ tự thao tác (CEI) | ✅ Đạt — chỉ còn 1 chỗ chuyển ETH (`withdrawProceeds()`), đã cập nhật `pendingWithdrawals[msg.sender] = 0` **trước** `call`. `buyTicket()`/`buyResaleTicket()` không còn `call` trực tiếp (đã chuyển pull-payment từ Lab 10). |
| 3 | Điều kiện thời gian | ⚠️ Quan sát — trường `startTime` trong `EventInfo` **chưa được dùng để so sánh ở đâu cả** (R7 — hạn bán lại trước `startTime` — chưa cài, đã ghi nhận từ Gate Review 1). Không phải lỗi dấu so sánh sai, mà là thiếu kiểm tra hoàn toàn. |
| 4 | Phép chia | ⚠️ Quan sát — `maxResalePrice = (originalPrice * 11000) / 10000` (dòng ~140) có thể làm tròn xuống khi `originalPrice` cực nhỏ (vài wei), khiến trần giá bằng đúng giá gốc (0% biên thay vì 10%). Không khai thác được trong thực tế vì giá vé luôn lớn hơn nhiều so với 1 wei, nhưng đúng tinh thần mục 4 nên ghi nhận. |
| 5 | Cách chuyển ETH | ✅ Đạt — dùng `call`, có kiểm tra `ok` và `revert WithdrawFailed()` nếu thất bại. Không dùng `transfer`/`send`. |
| 6 | Dữ liệu riêng tư | ✅ Đạt — không có biến `private` nào chứa dữ liệu nhạy cảm; mọi state đều `public` một cách có chủ đích. |
| 7 | Vòng lặp | ✅ Đạt — không có vòng lặp nào trong toàn bộ contract. |
| 8 | Sự kiện | ✅ Đạt — mọi hàm thay đổi trạng thái đều phát event tương ứng (`EventCreated`, `TicketMinted`, `TicketBought`, `TicketListedForResale`, `TicketResold`, `ProceedsWithdrawn`). |
| 9 | Trường hợp số 0 | 🔴 **Phát hiện & đã sửa** — `listForResale()` trước đây không chặn `price == 0`, có thể khiến vé bị "tặng không" ngoài ý muốn cho người gọi `buyResaleTicket()` đầu tiên. Đã thêm `error ZeroResalePrice()` + kiểm tra, nhất quán với `mintTicket()`/`createEvent()` (đã chặn giá/maxSupply = 0 từ Lab 10). |
| 10 | Địa chỉ rỗng | N/A — không có tham số kiểu `address` nào do người dùng truyền trực tiếp vào hàm nào (organizer luôn lấy từ `msg.sender`), nên không có chỗ nào cần kiểm tra `address(0)`. |

## Phát hiện 1 — Thiếu kiểm tra giá bán lại bằng 0

- **Mức độ:** Nhẹ – Trung bình
- **Vị trí:** hàm `listForResale()` (trước khi sửa, dòng ~133-141)
- **Mô tả:** Hàm không kiểm tra `price > 0` trước khi cho phép rao bán lại.
- **Tình huống gây thiệt hại:** Nếu chủ vé gõ nhầm giá bán lại là `0` (hoặc để trống ô nhập trên giao diện sau này mà frontend không chặn), bất kỳ ai cũng có thể gọi `buyResaleTicket()` với `msg.value = 0` và lấy vé miễn phí, mất vé oan cho chủ cũ.
- **Khuyến nghị:** Thêm `require`/`error` chặn `price == 0`, nhất quán với các hàm khác trong cùng contract.
- **Ai phát hiện:** Thành viên nhóm (tự rà soát theo checklist, có AI hỗ trợ đối chiếu).
- **Trạng thái:** Đã sửa và biên dịch lại thành công; test `evidence/lab-14/lab14-selfaudit.test.js` xác nhận revert đúng `ZeroResalePrice`.
