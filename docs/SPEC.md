# SPEC v0.1 — FairTicket

## Actor

- **Organizer** — tạo sự kiện, phát hành (mint) vé, check-in vé tại sự kiện.
- **Ticket Owner** — mua vé, bán lại vé, bị check-in.

## Data model

```
Event {
  eventId
  name
  startTime
  maxSupply
  ticketsMinted
  organizer
}

Ticket {
  ticketId
  eventId
  owner
  originalPrice
  resalePrice
  forSale
  checkedIn
}
```

## Quy tắc (rule) — ai được làm gì, khi nào, giới hạn bao nhiêu, lỗi thì sao

### R1 — Phát hành vé
Chỉ địa chỉ Organizer của một event mới được mint vé cho event đó. Người dùng thường gọi mint → revert.

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

### R7 — Thời hạn bán lại
Vé chỉ được `listForResale()` hoặc `buyResaleTicket()` khi `block.timestamp < event.startTime`. Sau thời điểm đó → revert.

### R8 — Không transfer ngoài hệ thống
Không cung cấp hàm transfer tự do (kiểu `transferFrom`/`safeTransferFrom` không kiểm soát). Thay đổi `owner` chỉ được thực hiện qua `buyTicket()` hoặc `buyResaleTicket()` do contract kiểm soát và kiểm tra đủ R3, R6, R7 trước khi đổi chủ.

### R9 — Giới hạn tổng cung
`ticketsMinted <= event.maxSupply`. `maxSupply` được xác định khi `createEvent()` và không thể tăng sau đó. Mint vượt `maxSupply` → revert.

## Test case tối thiểu (Lab 13 sẽ tự động hoá)

Giả định: `originalPrice = 0.01 ETH`, trần resale = 110% → `maxResalePrice = 0.011 ETH`.

1. Alice list giá `0.0105 ETH` → PASS
2. Alice list giá `0.011 ETH` → PASS
3. Alice list giá `0.012 ETH` → REVERT (R3)
4. Bob cố `listForResale()` vé của Alice → REVERT (R4)
5. Organizer check-in Ticket #1 lần 1 → `checkedIn = true` (R5)
6. Organizer check-in Ticket #1 lần 2 → REVERT (R5)
7. Alice cố bán vé đã `checkedIn = true` → REVERT (R6)
8. Alice cố `listForResale()` sau `event.startTime` → REVERT (R7)
9. Organizer mint vé thứ `maxSupply + 1` → REVERT (R9)

## Function tối thiểu (định hướng cho Lab 9)

```
Organizer: createEvent(), mintTicket(), checkIn()
User:      buyTicket(), listForResale(), buyResaleTicket()
```

## Ngoài phạm vi Lab 8

QR động, KYC, nhiều loại vé trong cùng sự kiện, hoàn tiền phức tạp, commission/royalty, đa tiền tệ/oracle. Giá vé dùng ETH/wei (`msg.value`) trên testnet Sepolia.
