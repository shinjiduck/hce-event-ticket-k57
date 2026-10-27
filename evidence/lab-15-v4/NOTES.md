# Lab 15 — ProjectCore.sol v4 (trần giá + giới hạn ví theo sự kiện, chặn mua sau giờ bắt đầu, phí bản quyền 5%)

## Vì sao có v4

v3 vẫn còn 3 điểm yếu về kinh tế:

- Trần 110% cố định cho mọi sự kiện, Organizer không chọn được.
- Một ví có thể gom hết vé.
- Hợp đồng không chặn mua vé sau giờ bắt đầu (chỉ giao diện chặn).

Nhóm cân nhắc bỏ hẳn trần giá vì đã có giới hạn ví. Tuy vậy, một người có thể dùng nhiều ví, nên nếu bỏ trần thì không còn gì chặn việc bán lại giá cao. Nhóm quyết định giữ trần nhưng để Organizer tự chọn.

| Thay đổi | Trước (v3) | Sau (v4) |
|---|---|---|
| Trần giá bán lại | Hằng số `MAX_RESALE_BPS = 11000` (110%) | `createEvent(..., maxResaleBps, ...)`: Organizer chọn 100–200% cho từng sự kiện (giao diện mặc định 110%). Ngoài khoảng này → `InvalidResaleCap` |
| Giới hạn vé mỗi ví | Không có | `createEvent(..., maxPerWallet)`: 0 = không giới hạn, tối đa 100. `mintedBy[eventId][ví]` cộng dồn mọi hạng vé. Vượt → `WalletLimitReached`. Vé mua lại không tính |
| Mua vé sau giờ bắt đầu | Hợp đồng cho phép | `mintTicket` revert `EventAlreadyStarted`. Rao bán, mua lại và check-in vẫn được |
| Phí bản quyền | 100% tiền bán lại về người bán | 5% (`ROYALTY_BPS = 500`, làm tròn xuống) vào `pendingWithdrawals` của Organizer, 95% về người bán. Sự kiện `TicketResold` có thêm trường `royalty` |

Hai tham số mới không sửa được sau khi tạo sự kiện. Mục đích là để người mua biết trước luật chơi.

## Kiểm thử hợp đồng

Hardhat 2.29, Solidity 0.8.20: **19/19 ca đạt** (`projectcore-v4.test.js`, log ở `projectcore-v4-test-log.txt`).

- 13 ca giữ từ v3, chỉnh theo chữ ký `createEvent` mới. `ReentrantOrganizer.sol` cũng được chỉnh: tấn công reentrancy vẫn thất bại.
- Trần 99.99% hoặc 200.01% bị từ chối; giới hạn 101 vé/ví bị từ chối; trần 200% với không giới hạn vé được chấp nhận.
- Hai sự kiện trần 150% và 100%: mỗi sự kiện áp đúng trần của nó.
- Giới hạn 2 vé/ví:
  - Vé thứ 3 bị từ chối, kể cả khi mua ở hạng khác.
  - Ví đã đủ vé vẫn mua lại được trên chợ bán lại.
  - Ví khác vẫn mua bình thường.
- Giới hạn 0: một ví mua 6 vé vẫn được.
- Sau giờ bắt đầu: không mua vé mới được, nhưng vẫn rao bán, mua lại và check-in được.
- Phí bản quyền:
  - Bán lại 1.1 ETH: Organizer nhận 0.055 ETH, người bán 1.045 ETH.
  - Giá 1099 wei: phí 54 wei, người bán 1045 wei, tổng khớp, không mất wei.
  - Người bán rút đúng số tiền.

## Triển khai

- Deploy bằng Remix trên Sepolia lúc 10:47 UTC ngày 27/10/2026, từ ví `0x4f99DacFdFec762beFe11F98E5bA0a229297a04e`.
- Địa chỉ: [`0x0845EEB1Ed93C373173680a859fB255f168b9Fd0`](https://sepolia.etherscan.io/address/0x0845EEB1Ed93C373173680a859fB255f168b9Fd0), khối 12004619.
- Giao dịch deploy: [`0x69af8ed83e21fd2ffba929d63ec7d3f64c413082814831921765558b916fc2b2`](https://sepolia.etherscan.io/tx/0x69af8ed83e21fd2ffba929d63ec7d3f64c413082814831921765558b916fc2b2).
- Đã đối chiếu bytecode trên chain:
  - Có `createEvent(string,uint256,uint256,uint256)`, `mintedBy`, `ROYALTY_BPS` = 500 và `DEFAULT_RESALE_BPS` = 11000.
  - Có `setStaff`, `checkIn(uint256,uint256)` và `cancelResale`.
  - Không còn `createEvent(string,uint256)` cũ.
- Hợp đồng v3 `0x7c574216844854C04878B41D68d58F50a54cA0AF` không dùng nữa và chưa có giao dịch nghiệp vụ nào.

## Kiểm thử giao diện đầu-cuối

Nhóm chép **đúng bytecode đang chạy trên Sepolia** sang một chain Hardhat cục bộ (cùng địa chỉ, chainId 11155111, cùng số khối, đồng hồ chain khớp giờ thật). Bài test dùng 4 ví (Organizer, 2 người mua, CTV) và **28/28 bước đạt**, không có lỗi trang (log ở `ui-e2e-v4-log.txt`, ảnh dashboard ở `v4-dashboard.png`).

1. Tạo sự kiện:
   - Wizard có ô trần giá (mặc định 110%) và ô số vé/ví (mặc định 4).
   - Nhập 101 vé/ví bị chặn.
   - Tạo sự kiện với trần 120% và 2 vé/ví; trên chain lưu `12000 / 2`.
2. Giới hạn ví:
   - Trang sự kiện và trang thanh toán hiện "đã mua 0/2".
   - Nút + dừng ở 2.
   - Mua đủ 2 vé thì nút đổi thành "Đã mua đủ 2 vé/ví" và bị khoá.
   - Vào thẳng trang thanh toán thì bị chặn.
   - Gọi thẳng hợp đồng thì nhận `WalletLimitReached`.
3. Rao bán:
   - Hộp rao bán ghi "tối đa 0.012 ETH (trần 120%)" và "nhận 95%".
   - Giá 121% bị chặn trên giao diện; gọi thẳng hợp đồng thì nhận `ResalePriceTooHigh`.
   - Rao đúng 120% thì thành công.
4. Mua lại:
   - Hộp xác nhận ghi "phí bản quyền 5%: 0.0006 ETH".
   - Trên chain, Organizer nhận thêm 0.0006 ETH và người bán nhận 0.0114 ETH.
   - Vé mua lại không tính vào giới hạn ví.
5. Check-in: cấp quyền CTV, CTV quét mã QR, check-in được ghi lên chain.
6. Dashboard: có dòng "phí bản quyền bán lại: 0.0006 ETH", và mục hoạt động đổi chủ ghi kèm phí.
7. Sau giờ bắt đầu (tua giờ chain):
   - Mua vé mới thì nhận `EventAlreadyStarted`.
   - Rao bán và mua lại vẫn được.
   - Tạo sự kiện với trần 99.99% thì nhận `InvalidResaleCap`.

Ảnh chụp dashboard của lần chạy đầu cho thấy thêm một lỗi có từ trước v4. Tab Organizer mở từ trước khi người mua mua vé vẫn hiện "0/10 vé đã bán, doanh thu 0 ETH", vì cache hạng vé không bao giờ hết hạn. Nhóm đã sửa để cache hết hạn sau 15 giây và dashboard luôn đọc mới, rồi thêm một bước kiểm tra vào bài test.

Trong lúc test còn phát hiện một vấn đề của môi trường test. `hardhat_mine` mặc định cộng 1 giây cho mỗi khối, nên đào 12 triệu khối đẩy đồng hồ chain đi khoảng 139 ngày. Khi đó v4 báo đúng `EventAlreadyStarted` cho sự kiện ngày 20/12, và trang thanh toán cũng hiện đúng lỗi này. Cách xử lý là đào với khoảng cách 0 giây giữa các khối.

### Chạy lại

1. Chạy `npx hardhat node` (cấu hình `networks.hardhat.chainId = 11155111`).
2. Chạy `node setup-local-chain.js`. Script này đào tới khối 12004619 và chép bytecode v4 từ Sepolia vào đúng địa chỉ.
3. Chạy `python -m http.server 8765` trong thư mục `web/`.
4. Chạy `node ui-e2e-v4.js`. Cần `playwright-core`, `ethers` v6 và Microsoft Edge. Trong lúc test, RPC công khai, Tenderly và `/api/metadata` được chuyển hướng về chain cục bộ hoặc bộ nhớ.
