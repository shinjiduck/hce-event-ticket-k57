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

### R3 — Trần giá bán lại (theo từng sự kiện, v4)
Organizer đặt `maxResaleBps` khi `createEvent()` — từ 10000 (100%) đến 20000 (200%), giao diện gợi ý 11000 (110%). Không sửa được sau khi tạo.
```
maxResalePrice = originalPrice * maxResaleBps / 10000
```
Đặt giá bán lại vượt trần → revert `ResalePriceTooHigh`. Trần ngoài khoảng 100–200% → revert `InvalidResaleCap`.

### R3b — Phí bản quyền khi bán lại (v4)
Mỗi lần `buyResaleTicket()`, 5% giá bán (`ROYALTY_BPS = 500`, làm tròn xuống) cộng vào số dư chờ rút của Organizer, phần còn lại cho người bán. Tổng hai phần luôn bằng đúng số tiền người mua trả.

### R1c — Giới hạn vé mỗi ví (v4)
Organizer đặt `maxPerWallet` khi `createEvent()` (0 = không giới hạn, tối đa 100). Mỗi ví chỉ `mintTicket()` được tối đa `maxPerWallet` vé của sự kiện (cộng dồn mọi hạng vé, đếm bằng `mintedBy[eventId][ví]`). Vượt → revert `WalletLimitReached`. Vé mua lại trên chợ bán lại **không tính** (đã có trần giá chặn lời).

### R1d — Ngừng bán vé mới khi sự kiện bắt đầu (v4)
`mintTicket()` revert `EventAlreadyStarted` khi `block.timestamp >= startTime`. Rao bán, mua lại và check-in vẫn được.

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

Giả định: `originalPrice = 0.01 ETH`, sự kiện đặt trần 110% (`maxResaleBps = 11000`) → `maxResalePrice = 0.011 ETH`.

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
11. Sự kiện giới hạn 2 vé/ví: ví mua vé thứ 3 → REVERT `WalletLimitReached` (R1c)
12. Mua vé sau giờ bắt đầu → REVERT `EventAlreadyStarted` (R1d)
13. Mua lại vé 0.011 ETH → Organizer +0.00055 ETH, người bán +0.01045 ETH (R3b)

## Function hiện có

```
Organizer: createEvent(name, startTime, maxResaleBps, maxPerWallet), createTier(), setStaff(), checkIn(), withdrawProceeds()
CTV (được cấp quyền): checkIn(eventId, ticketId)
Bất kỳ ai: mintTicket(tierId), listForResale(), cancelResale(), buyResaleTicket(), withdrawProceeds()
```

## Ngoài phạm vi hiện tại

QR động (ký bằng ví, chống chụp màn hình chia sẻ — hiện dùng QR tĩnh chứa `ticketId`), KYC, hoàn tiền phức tạp, commission/royalty, đa tiền tệ/oracle, R7 (hạn bán lại theo thời gian). Giá vé dùng ETH/wei (`msg.value`) trên testnet Sepolia.
