# SPEC v0.2 — FairTicket

> Cập nhật sau Lab 15: chuyển từ mô hình "Organizer phát hành từng vé" sang mô hình "public mint" kiểu NFT — Organizer chỉ tạo hạng vé (giá + tổng cung), ai cũng tự mint vé trực tiếp trong giới hạn hạng. Thêm check-in (R5, R6) đã viết đặc tả từ v0.1 nay mới cài vào contract.

## Actor

- **Organizer** — tạo sự kiện, tạo hạng vé (giá + tổng cung mỗi hạng), check-in vé tại sự kiện.
- **Ticket Owner** — tự mint vé (trả đúng giá hạng), bán lại vé, bị check-in.

## Data model

```
Event {
  eventId
  name
  startTime
  organizer
  tierCount
}

Tier {
  tierId
  eventId
  name           // "Standard", "VIP"... chỉ để hiển thị
  price
  maxSupply
  minted
}

Ticket {
  ticketId
  eventId
  tierId
  owner
  originalPrice  // = price của tier tại thời điểm mint
  resalePrice
  forSale
  checkedIn
}
```

## Quy tắc (rule) — ai được làm gì, khi nào, giới hạn bao nhiêu, lỗi thì sao

### R1 — Tạo hạng vé
Chỉ địa chỉ Organizer của một event mới tạo được hạng vé (tier) cho event đó — đặt giá và tổng cung cố định. Người khác gọi `createTier()` → revert.

### R1b — Mint công khai
**Bất kỳ ai** cũng tự mint được vé của một hạng, miễn trả đúng giá hạng (`msg.value == tier.price`) và hạng chưa hết cung (`tier.minted < tier.maxSupply`). Không cần Organizer phát hành hộ từng vé.

### R2 — Quyền sở hữu duy nhất
Tại một thời điểm, một `ticketId` chỉ có đúng một `owner`. Chỉ owner hiện tại được thao tác trên vé của mình.

### R3 — Trần giá bán lại
`resalePrice` không được vượt quá 110% `originalPrice`.
```
maxResalePrice = originalPrice * 110 / 100
```
Đặt giá bán lại vượt trần → revert.

### R4 — Quyền bán lại
Chỉ owner hiện tại của vé được gọi `listForResale()` cho vé đó. Người khác gọi → revert.

### R5 — Check-in một lần
Chỉ Organizer của event được check-in vé thuộc event đó. Một vé chỉ check-in được khi: vé tồn tại và `checkedIn == false`. Check-in lần hai → revert. Sau khi check-in: `checkedIn = true` (không thể đặt lại `false`).

### R6 — Khóa vé sau check-in
Vé có `checkedIn == true` không được `listForResale()` hoặc `buyResaleTicket()`. Gọi → revert.

### R7 — Thời hạn bán lại *(chưa cài)*
Vé chỉ được `listForResale()` hoặc `buyResaleTicket()` khi `block.timestamp < event.startTime`. Sau thời điểm đó → revert.

### R8 — Không transfer ngoài hệ thống
Không cung cấp hàm transfer tự do (kiểu `transferFrom`/`safeTransferFrom` không kiểm soát). Thay đổi `owner` chỉ được thực hiện qua `mintTicket()` hoặc `buyResaleTicket()` do contract kiểm soát.

### R9 — Giới hạn tổng cung theo hạng
`tier.minted <= tier.maxSupply`. `maxSupply` xác định khi `createTier()` và không thể tăng sau đó. Mint vượt `maxSupply` → revert.

## Test case tối thiểu

Giả định: `originalPrice = 0.01 ETH`, trần resale = 110% → `maxResalePrice = 0.011 ETH`.

1. Bất kỳ ai `mintTicket(tierId)` đúng giá, hạng còn cung → PASS (R1b)
2. Mint sai giá → REVERT (IncorrectPayment)
3. Mint khi hạng đã hết cung → REVERT (R9)
4. Alice list giá `0.0105 ETH` → PASS (R3)
5. Alice list giá `0.012 ETH` → REVERT (R3)
6. Bob cố `listForResale()` vé của Alice → REVERT (R4)
7. Organizer check-in Ticket #1 lần 1 → `checkedIn = true` (R5)
8. Organizer check-in Ticket #1 lần 2 → REVERT (R5)
9. Alice cố bán vé đã `checkedIn = true` → REVERT (R6)
10. Người không phải Organizer gọi `checkIn()` → REVERT (R5)

## Function hiện có

```
Organizer: createEvent(), createTier(), checkIn(), withdrawProceeds()
Bất kỳ ai: mintTicket(tierId), listForResale(), buyResaleTicket(), withdrawProceeds()
```

## Ngoài phạm vi hiện tại

QR động (ký bằng ví, chống chụp màn hình chia sẻ — hiện dùng QR tĩnh chứa `ticketId`), KYC, hoàn tiền phức tạp, commission/royalty, đa tiền tệ/oracle, R7 (hạn bán lại theo thời gian). Giá vé dùng ETH/wei (`msg.value`) trên testnet Sepolia.
