# Lab 15 — ProjectCore.sol v3 (CTV soát vé, chặn vé sai sự kiện, gỡ rao bán)

## Vì sao có v3

Khi làm màn hình check-in, nhóm cần **cộng tác viên (CTV)** soát vé bằng ví riêng thay vì dùng chung ví Organizer (lộ quyền rút tiền, tạo hạng vé). Vì phải deploy lại, gộp luôn 2 lỗ hổng đã ghi trong `docs/PROGRESS.md`:

| Thay đổi | Trước (v2) | Sau (v3) |
|---|---|---|
| Vai trò CTV | Chỉ Organizer check-in được | `setStaff(eventId, staff, allowed)`: Organizer cấp/thu hồi quyền soát vé theo từng sự kiện, có hiệu lực ngay. CTV **chỉ** check-in được |
| Vé sai sự kiện | `checkIn(ticketId)` không biết đang soát ở cổng nào → Organizer có 2 sự kiện có thể check-in nhầm vé của sự kiện kia (chỉ giao diện chặn) | `checkIn(eventId, ticketId)` → hợp đồng từ chối `TicketNotInEvent` |
| Gỡ rao bán | Không có hàm | `cancelResale(ticketId)` cho chủ vé |

Lỗi mới: `NotCheckInAuthorized`, `TicketNotInEvent`, `ZeroAddress`. Sự kiện mới: `StaffUpdated`, `TicketResaleCancelled`.

## Kiểm thử

Hardhat 2.29, Solidity 0.8.20 — **13/13 ca đạt** (`projectcore-v3.test.js`, log: `projectcore-v3-test-log.txt`):

- 7 ca giữ từ v2 (mint, sai giá, vượt cung, trần 110%, check-in, khoá sau check-in, reentrancy) — chỉnh theo chữ ký `checkIn` mới.
- CTV: chưa cấp quyền bị từ chối → cấp quyền check-in được → thu hồi bị từ chối ngay.
- CTV không tạo hạng vé, không cấp quyền, không rút tiền; tiền vẫn của Organizer.
- `setStaff` bởi người ngoài / địa chỉ 0 / sự kiện không tồn tại bị từ chối.
- Vé sự kiện B bị từ chối ở cổng sự kiện A (kể cả Organizer tổ chức cả 2); CTV sự kiện A không soát được sự kiện B.
- `cancelResale`: chỉ chủ vé, chỉ khi đang rao; gỡ xong không ai mua được; rao lại được.
- Vé đang rao bán bị CTV check-in → không mua được nữa (R6 vẫn giữ).

## Triển khai

- Deploy bằng Remix trên Sepolia ngày 27/10/2026 10:04 UTC, ví `0x4f99DacFdFec762beFe11F98E5bA0a229297a04e`.
- Địa chỉ: [`0x7c574216844854C04878B41D68d58F50a54cA0AF`](https://sepolia.etherscan.io/address/0x7c574216844854C04878B41D68d58F50a54cA0AF) · khối 12004406 · giao dịch [`0x30236210fe9f518f8d663745f10e02663490604481f4d3d5112c0ab7a1d62f4c`](https://sepolia.etherscan.io/tx/0x30236210fe9f518f8d663745f10e02663490604481f4d3d5112c0ab7a1d62f4c).
- Đã đối chiếu bytecode trên chain: có `setStaff`, `checkIn(uint256,uint256)`, `cancelResale`, `isStaff`; không còn `checkIn(uint256)` cũ.
- Kiểm thử giao diện đầu-cuối: chép **đúng bytecode trên Sepolia** sang chain Hardhat cục bộ (cùng địa chỉ, chainId 11155111, cùng số khối) rồi chạy 23 bước bằng 4 ví (Organizer, 2 người mua, CTV): tạo sự kiện → mua 2 vé → chặn giá 120% → rao bán / gỡ / rao lại → mua lại → cấp quyền CTV → CTV check-in → thu hồi → CTV bị từ chối → Organizer check-in → dashboard. 23/23 đạt. Hợp đồng v2 `0x0f96cafe4C603D706c786C503A5c903090706916` không dùng nữa (dữ liệu demo cũ nằm lại ở đó).

### Chạy lại test giao diện

1. `npx hardhat node` (cấu hình `networks.hardhat.chainId = 11155111`), rồi `node setup-local-chain.js` (đào tới khối 12004406, chép bytecode v3 từ Sepolia vào đúng địa chỉ).
2. `python -m http.server 8765` trong `web/`.
3. `node ui-e2e-v3.js` (cần `playwright-core` + Microsoft Edge). RPC công khai, Tenderly và `/api/metadata` được chuyển hướng về chain cục bộ / bộ nhớ trong lúc test.
