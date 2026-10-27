# ECONOMIC RULES — FairTicket (v0.2)

> Cập nhật sau Lab 15: đồng bộ với `docs/SPEC.md` v0.2 và `ProjectCore.sol` v2 — chuyển từ mô hình Organizer phát hành từng vé sang mô hình public mint theo Hạng vé (Tier) và mô hình rút tiền an toàn (pull-payment).

## I. Dòng tiền / quyền lợi

### Mua lần đầu (Public Mint)
```
Buyer --tiền mua vé (tier.price)--> Contract (pendingWithdrawals[Organizer])
Buyer <--Ticket-- Contract (mintTicket(tierId))
```

Thanh toán và khởi tạo vé sở hữu diễn ra nguyên tử trong cùng một transaction (`mintTicket(tierId)`), tránh trường hợp trả tiền mà không nhận vé. Tiền bán vé được ghi nhận an toàn trên contract qua cơ chế pull-payment (`pendingWithdrawals`), Organizer chủ động rút ra qua `withdrawProceeds()`.

### Bán lại (Resale)
```
Buyer B --giá resale--> Contract (pendingWithdrawals[Buyer A])
Buyer A --Ticket (chuyển owner)--> Buyer B
```

Từ v4 (27/10/2026): khi Buyer B gọi `buyResaleTicket()`, **95%** giá bán vào số dư chờ rút (`pendingWithdrawals`) của người bán cũ (Buyer A), **5%** là phí bản quyền vào số dư của Organizer (`ROYALTY_BPS = 500`, làm tròn xuống — phần lẻ thuộc người bán, không mất wei). FairTicket không thu phí nền tảng. (Lab 8–15 bản v1–v3: 100% về người bán.)

## II. Giới hạn chống lạm dụng

1. Giá resale ≤ trần của sự kiện × giá gốc (R3). Organizer chọn trần 100–200% khi tạo sự kiện (mặc định 110%), ghi vĩnh viễn trên hợp đồng.
2. Chỉ chủ sở hữu hiện tại được rao bán lại vé (R4).
3. Vé đã check-in không được bán/chuyển (R6).
4. Mỗi vé chỉ check-in một lần (R5).
5. Chỉ Organizer được tạo sự kiện (`createEvent`), tạo hạng vé (`createTier`) và check-in vé (`checkIn`) (R1, R5). Bất kỳ ai cũng tự do mint vé theo hạng (`mintTicket`) nếu trả đúng giá và hạng còn cung (R1b).
6. Vé chỉ resale được trước khi sự kiện bắt đầu (R7, *ngoài phạm vi demo hiện tại*).
7. Không cho phép transfer ngoài cơ chế resale của hệ thống (R8).
8. Tổng vé mint của mỗi hạng không vượt `maxSupply`, cố định khi tạo hạng vé `createTier()` (R9).
9. Mỗi ví mua mới tối đa `maxPerWallet` vé mỗi sự kiện (R1c, mặc định 4, 0 = không giới hạn) — chống gom vé. Lưu ý: một người có thể dùng nhiều ví; giới hạn này làm việc gom vé tốn công hơn, không chặn tuyệt đối.
10. Không bán vé mới sau giờ bắt đầu sự kiện (R1d) — hợp đồng tự chặn.

## III. Quyền quản trị

Organizer có quyền:
- Tạo sự kiện (`createEvent`).
- Tạo các hạng vé (`createTier`), xác định tên hiển thị, giá và `maxSupply` cho từng hạng.
- Check-in vé tại sự kiện (`checkIn`).
- Rút doanh thu bán vé thuộc về mình (`withdrawProceeds`).

Organizer **không** được:
- Thay đổi `owner` của vé một cách tùy ý (ngoài luồng mint/resale do contract kiểm soát).
- Đặt lại `checkedIn` từ `true` về `false`.
- Thay đổi `price` hoặc `maxSupply` của hạng vé sau khi đã khởi tạo.

## IV. Tình huống người dùng bị thiệt

### TH1 — Chuyển tiền nhưng không nhận vé
Giải pháp: thanh toán và chuyển quyền sở hữu nằm trong cùng một transaction (`mintTicket()`/`buyResaleTicket()`), không tách thành hai bước.

### TH2 — Người bán nâng giá vé quá cao
Giải pháp: contract kiểm tra `resalePrice <= originalPrice × maxResaleBps / 10000` (trần của sự kiện, mặc định 110%) trước khi cho phép `listForResale()` (R3). Kết hợp giới hạn vé/ví (R1c) để hạn chế gom vé ngay từ lúc mở bán.

### TH3 — Mua phải vé đã sử dụng
Giải pháp: `checkedIn == true` thì không thể `listForResale()` hoặc `buyResaleTicket()` (R6).

### TH4 — Một vé bị check-in nhiều lần
Giải pháp: `checkIn()` yêu cầu `checkedIn == false`, chuyển cờ `checkedIn = true` sau khi thành công; mọi lần gọi tiếp theo revert với lỗi `TicketAlreadyCheckedIn` (R5).

### TH5 — Organizer tự ý thay đổi dữ liệu
Giải pháp: `tier.price`, `tier.maxSupply` bất biến sau khi thiết lập; `checkedIn` chỉ có thể chuyển một chiều `false -> true`, không có hàm nào cho phép đặt lại `false`.

## Phản biện bằng AI

Prompt sử dụng để phản biện:

> Bạn là người dùng thận trọng. Chỉ dựa trên SPEC và ECONOMIC_RULES dưới đây, hãy nêu 5 cách một người có thể lạm dụng quy tắc hoặc làm người khác bị thiệt. Với mỗi cách, chỉ rõ quy tắc nào chưa đủ chặt. Không viết mã.

### Kết quả phản biện và cách nhóm xử lý

**Abuse 1 — Giao dịch ngoài hệ thống rồi transfer thẳng vé**
Người bán nhận tiền ngoài chuỗi (cao hơn trần) rồi transfer vé trực tiếp cho người mua, bỏ qua trần giá.
→ Quy tắc chưa đủ chặt trước khi thêm: không có gì cấm transfer tự do.
→ **Xử lý:** thêm R8 — cấm transfer ngoài cơ chế resale của hệ thống; mọi đổi chủ phải qua `mintTicket()`/`buyResaleTicket()`.

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
Nếu không giới hạn tổng cung, Organizer có thể tạo thêm vé sau khi đã "sold out", làm loãng giá trị vé của người mua trước.
→ **Xử lý:** thêm R9 — `maxSupply` cố định khi `createTier()`, `tier.minted <= tier.maxSupply`, không được tăng sau khi bắt đầu mở bán.
