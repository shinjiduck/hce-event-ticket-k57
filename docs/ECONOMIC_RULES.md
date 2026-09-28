# ECONOMIC RULES — FairTicket

## I. Dòng tiền / quyền lợi

### Mua lần đầu
Buyer --tiền mua vé (originalPrice)--> Organizer
Buyer <--Ticket-- Organizer

Thanh toán và chuyển quyền sở hữu diễn ra trong cùng một transaction (`buyTicket()`), tránh trường hợp trả tiền mà không nhận vé.

### Bán lại
Buyer B --giá resale--> Buyer A (chủ cũ)
Buyer A --Ticket--> Buyer B

Resale price = 100% chuyển cho người bán cũ, không thu phí/commission ở Lab 8–11 để giữ contract đơn giản.

## II. Giới hạn chống lạm dụng

1. Giá resale ≤ 110% giá gốc (R3).
2. Chỉ chủ sở hữu hiện tại được bán vé (R4).
3. Vé đã check-in không được bán/chuyển (R6).
4. Mỗi vé chỉ check-in một lần (R5).
5. Chỉ Organizer được phát hành và check-in vé (R1, R5).
6. Vé chỉ resale được trước khi sự kiện bắt đầu (R7).
7. Không cho phép transfer ngoài cơ chế resale của hệ thống (R8).
8. Tổng vé mint không vượt `maxSupply`, cố định khi tạo event (R9).

## III. Quyền quản trị

Organizer có quyền:
- Tạo sự kiện (`createEvent`).
- Phát hành vé (`mintTicket`), trong giới hạn `maxSupply`.
- Check-in vé (`checkIn`).

Organizer **không** được:
- Thay đổi `owner` của vé một cách tùy ý (ngoài luồng mua/bán do contract kiểm soát).
- Đặt lại `checkedIn` từ `true` về `false`.
- Thay đổi `originalPrice` hoặc `maxSupply` sau khi vé đã bắt đầu bán.

## IV. Tình huống người dùng bị thiệt

### TH1 — Chuyển tiền nhưng không nhận vé
Giải pháp: thanh toán và chuyển quyền sở hữu nằm trong cùng một transaction (`buyTicket()`/`buyResaleTicket()`), không tách thành hai bước.

### TH2 — Người bán nâng giá vé quá cao
Giải pháp: contract kiểm tra `resalePrice <= maxResalePrice` trước khi cho phép `listForResale()` (R3).

### TH3 — Mua phải vé đã sử dụng
Giải pháp: `checkedIn == true` thì không thể `listForResale()`/`buyResaleTicket()` (R6).

### TH4 — Một vé bị check-in nhiều lần
Giải pháp: `checkIn()` yêu cầu `checkedIn == false`, set `checkedIn = true` sau khi thành công; lần gọi tiếp theo revert (R5).

### TH5 — Organizer tự ý thay đổi dữ liệu
Giải pháp: `originalPrice`, `maxSupply` bất biến sau khi thiết lập; `checkedIn` chỉ có thể chuyển một chiều `false -> true`, không có hàm nào cho phép đặt lại `false`.

## Phản biện bằng AI

Prompt sử dụng để phản biện:

> Bạn là người dùng thận trọng. Chỉ dựa trên SPEC và ECONOMIC_RULES dưới đây, hãy nêu 5 cách một người có thể lạm dụng quy tắc hoặc làm người khác bị thiệt. Với mỗi cách, chỉ rõ quy tắc nào chưa đủ chặt. Không viết mã.

### Kết quả phản biện và cách nhóm xử lý

**Abuse 1 — Giao dịch ngoài hệ thống rồi transfer thẳng vé**
Người bán nhận tiền ngoài chuỗi (cao hơn 110%) rồi transfer vé trực tiếp cho người mua, bỏ qua trần giá.
→ Quy tắc chưa đủ chặt trước khi thêm: không có gì cấm transfer tự do.
→ **Xử lý:** thêm R8 — cấm transfer ngoài cơ chế resale của hệ thống; mọi đổi chủ phải qua `buyTicket()`/`buyResaleTicket()`.

**Abuse 2 — Organizer check-in vé của người khác trước khi họ đến sự kiện**
Organizer có toàn quyền gọi `checkIn()` bất kỳ lúc nào cho bất kỳ vé nào.
→ **Xử lý:** nhóm chấp nhận rủi ro này ở Lab 8 — Organizer được xem là trusted party trong mô hình demo. Ghi nhận rủi ro thay vì thêm cơ chế xác thực phức tạp (ngoài phạm vi Lab 8, có thể bổ sung `eventCheckInStart` ở giai đoạn sau nếu cần).

**Abuse 3 — Bán vé sau khi sự kiện đã kết thúc**
Không có giới hạn thời gian, vé "chết" vẫn được rao bán cho người không biết.
→ **Xử lý:** thêm R7 — chỉ resale được khi `block.timestamp < event.startTime`.

**Abuse 4 — Chủ cũ dùng lại thông tin vé cũ để cố check-in**
Sau khi Alice bán vé cho Bob, nếu check-in chỉ dựa vào `ticketId` mà không đối chiếu chủ sở hữu hiện tại, Alice có thể cố check-in bằng thông tin vé cũ.
→ **Xử lý:** `checkIn()` phải xác thực đồng thời `ticketId`, `owner` hiện tại (on-chain), và `checkedIn == false`. QR/giao diện chỉ là lối vào, contract là nguồn xác thực cuối cùng.

**Abuse 5 — Organizer mint vé vượt số lượng đã công bố**
Nếu không giới hạn tổng cung, Organizer có thể mint thêm vé sau khi đã "sold out", làm loãng giá trị vé của người mua trước.
→ **Xử lý:** thêm R9 — `maxSupply` cố định khi `createEvent()`, `ticketsMinted <= maxSupply`, không được tăng sau khi bắt đầu bán.
