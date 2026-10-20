# TIẾN ĐỘ DỰ ÁN — FairTicket

> Cập nhật: **20/10/2026** · Người cập nhật: Nguyễn Hoàng Thảo (soạn cùng Claude Code)
> Tài liệu này ghi trạng thái thật của dự án tại thời điểm cập nhật: cái gì đã chạy, bằng chứng ở đâu, cái gì còn thiếu. Khi làm thêm, cập nhật bảng ở mục 6 và 7.

## 1. Tóm tắt nhanh

| Mục | Trạng thái |
|---|---|
| DApp công khai | ✅ https://hce-event-ticket-k57-git-main-nguyenhoangthao.vercel.app |
| Hợp đồng | ✅ `ProjectCore.sol` v2 trên Sepolia — [`0x0f96cafe4C603D706c786C503A5c903090706916`](https://sepolia.etherscan.io/address/0x0f96cafe4C603D706c786C503A5c903090706916) |
| Mốc bắt buộc Lab 8 → 15 | ✅ Lab 8–14 xong · ⚠️ Lab 15 còn thiếu kế hoạch thuyết trình (tên người + mã giao dịch) và tag `v0.1-demo` |
| Giao diện V2 (8 phase theo master prompt) | ✅ Cả 8 phase đã có phần chạy được, đã deploy |
| Giao dịch thật trên chain | 13 giao dịch: tạo sự kiện, tạo hạng vé, mua vé, rút tiền. **Chưa có**: rao bán lại, mua lại, check-in |
| Việc gấp nhất | Test đầu-cuối bằng 2–3 ví MetaMask thật (mục 7) |

## 2. Mốc bắt buộc của môn học

| Lab | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|---|
| 8 | Khởi tạo repo, đặc tả v0.1 | ✅ | `docs/SPEC.md`, `docs/PROJECT_PLAN.md`, `docs/ECONOMIC_RULES.md` |
| 9 | Contract lõi biên dịch được | ✅ | `contracts/project/ProjectCore.sol`, `contracts/training/TimeLockVault.sol` |
| 10 | Audit và sửa lỗi có bằng chứng | ✅ | `docs/AI_JOURNAL.md` (Lab 10), `evidence/lab-10/` |
| 11 | Quy tắc kinh tế chạy đúng (trần 110%) | ✅ | `evidence/lab-11/resale.test.js`, `test-log.txt` |
| 12 | Gate Review 1 | ✅ | `docs/GATE_REVIEW_1.md`, `evidence/lab-12/` |
| 13 | Test ca tấn công / gian lận | ✅ | `evidence/lab-13/` (reentrancy + negative test). Hợp đồng luyện tập `VulnerableBank`, `Attacker` (commit `fbcb92d`, Linh) |
| 14 | Audit chéo | ✅ | `evidence/lab-14/`, `docs/AI_JOURNAL.md` (Lab 14) |
| 15 | URL DApp công khai + kế hoạch thuyết trình | ⚠️ | URL ✅ · `docs/PRESENTATION_PLAN.md` còn *(điền tên)* và chưa có mã giao dịch · chưa gắn tag `v0.1-demo` |

## 3. Hợp đồng `ProjectCore.sol` v2

Thiết kế lại ngày 13/10/2026 từ mô hình "Organizer phát hành từng vé" sang **public mint theo hạng vé** + check-in. Test Hardhat 7/7 ca đạt: `evidence/lab-15-v2/projectcore-v2-test-log.txt`.

| Quy tắc (SPEC) | Hàm | Trạng thái |
|---|---|---|
| R1 Organizer tạo hạng vé (giá + tổng cung) | `createEvent`, `createTier` | ✅ |
| R1b Ai cũng tự mua vé đúng giá, không vượt tổng cung | `mintTicket` | ✅ |
| R3/R4 Chủ vé rao bán lại, tối đa 110% giá gốc | `listForResale`, `buyResaleTicket` | ✅ (hợp đồng chặn bằng `ResalePriceTooHigh`) |
| R5 Check-in 1 lần, chỉ Organizer | `checkIn` | ✅ |
| R6 Vé đã check-in không bán lại được | `listForResale`, `buyResaleTicket` | ✅ |
| Rút tiền kiểu pull-payment, chống reentrancy | `withdrawProceeds` | ✅ (đã chạy lại kịch bản tấn công Lab 13) |
| R7 Hạn bán lại theo thời gian | — | ❌ chưa làm |
| R8 Cấm chuyển nhượng ngoài hệ thống | — | ✅ ngầm định: hợp đồng **không có hàm chuyển vé**, chỉ đổi chủ qua `buyResaleTicket` |

Địa chỉ cũ `0x09967aeeb595236e74BD5F283a9Ff1960e695AF2` (bản v1) **không dùng nữa**.

## 4. Giao diện FairTicket V2 (17–20/10/2026)

| Phase | Nội dung | Commit |
|---|---|---|
| 0 | Kiểm tra toàn bộ source, đối chiếu hợp đồng thật | — |
| 1 | Design system: màu xanh logo + navy + coral, font Be Vietnam Pro, header có tìm kiếm + menu ví, banner sai mạng có nút chuyển Sepolia | `38fe229` |
| 2 | Trang chủ kiểu marketplace: danh mục, carousel, sự kiện nổi bật, sắp diễn ra, vé bán lại, lợi ích | `38fe229` |
| 3 | Trang chi tiết sự kiện, chọn hạng vé + số lượng, mục xác minh blockchain, Organizer sửa thông tin | `f7c2a8c` |
| 4 | Thanh toán có kiểm tra trước (ví, mạng, số vé, số dư + gas) và theo dõi từng giao dịch; trang Vé của tôi dạng thẻ vé | `ecba7eb` |
| 5 | Chợ vé bán lại: lọc, sắp xếp, số lần đổi chủ | `6903674` |
| 6 | Dashboard Organizer: số liệu, bảng sự kiện, hoạt động gần đây | `6903674` |
| 7 | Check-in bằng mã QR ký số, hết hạn 5 phút; màn hình quét camera / tải ảnh / nhập tay | `6903674` |
| + | Nhãn danh mục trên thẻ vé · Google Maps khi tạo sự kiện và ở trang chi tiết · Ô địa chỉ kiểu TMĐT (Tỉnh/Thành → Phường/Xã, 34 tỉnh theo đơn vị hành chính mới) + lọc theo tỉnh | `f2ceaa3` → `15b0fcd` |

## 5. Kiến trúc hiện tại

```
Trình duyệt (web/index.html + app.js + styles.css, không cần build)
 ├─ Đọc chain  : ví MetaMask (nếu đúng Sepolia) hoặc RPC công khai publicnode
 ├─ Lịch sử    : Tenderly (sepolia.gateway.tenderly.co) — publicnode chỉ giữ log ~2–3 ngày
 ├─ Ghi chain  : ví MetaMask của người dùng (mọi giao dịch đều do người dùng ký)
 └─ Metadata   : /api/metadata (Vercel Function) ↔ Vercel Blob
                 ghi phải kèm chữ ký ví; server kiểm tra người ký = organizer trên chain
```

| Dữ liệu | Nằm ở đâu |
|---|---|
| Tên sự kiện, giờ bắt đầu, organizer, hạng vé, giá, tổng cung, chủ vé, trạng thái bán lại/check-in, tiền chờ rút | **Blockchain** (nguồn sự thật) |
| Ảnh bìa, mô tả, tên địa điểm, địa chỉ (tỉnh/phường/đường), danh mục | **Ngoài chain** — Vercel Blob qua `/api/metadata` |
| Danh sách 34 tỉnh / 3.321 phường-xã | `web/assets/vn-units.json` (lấy từ provinces.open-api.vn) |

Bí mật (`BLOB_READ_WRITE_TOKEN`) chỉ nằm trong `web/.env` (không commit) và cấu hình Vercel. Bản đồ Google Maps dùng kiểu nhúng không cần API key.

## 6. Lỗi thật đã phát hiện và sửa

| Ngày | Lỗi | Cách sửa | Commit |
|---|---|---|---|
| 13/10 | Bấm Rút tiền 1 lần gọi giao dịch 2–3 lần (gắn listener trùng) | Gắn listener 1 lần | `89e5caa` |
| 13/10 | Đổi ví/mạng tải lại trang, mất dữ liệu đang nhập | Cập nhật tại chỗ + lưu nháp | `89e5caa` |
| 15/10 | Ảnh/mô tả chỉ có trên máy người tạo | Backend metadata (Vercel Blob) + chữ ký ví | `3703c4d` |
| 15/10 | Trang Vé của tôi treo "Đang tải…" | Bắt lỗi từng phần; sửa `Object.assign` làm mất trường của ethers v6; `buyer` không indexed nên phải lọc bằng JS | `0c2ba93`, `a75acd7` |
| 17/10 | `buyResaleTicket` có trong hợp đồng nhưng giao diện chưa từng gọi | Làm luồng mua lại vé | `38fe229` |
| 17/10 | Vẫn mua được vé của sự kiện đã bắt đầu (hợp đồng không chặn) | Chặn ở giao diện: mua mới, mua lại, trang thanh toán | `38fe229` |
| 17/10 | Organizer có 2 sự kiện có thể check-in nhầm vé của sự kiện kia (hợp đồng không chặn) | Kiểm tra vé thuộc đúng sự kiện trước khi gửi | `f7c2a8c` |
| 17/10 | Sửa thông tin xong, người khác vẫn thấy bản cũ (CDN cache 1 tháng) | Đọc theo `uploadedAt`, cache 60s | `f7c2a8c` |
| 17/10 | Lịch sử giao dịch cũ không bao giờ hiện (RPC xoá log) | Đọc log qua Tenderly từ khối đầu tiên của hợp đồng | `ecba7eb` |
| 17/10 | Ảnh có thể chèn nội dung lạ vào trang (XSS) | Chỉ nhận ảnh base64, thoát ký tự trong thuộc tính HTML | `38fe229` |
| 20/10 | Mở form Sửa quá sớm rồi ký có thể xoá mất ảnh/mô tả cũ | Lấy bản mới nhất từ server trước khi mở form | `e60c3bd` |

## 7. Việc còn lại

| # | Việc | Ai | Ghi chú |
|---|---|---|---|
| 1 | **Test đầu-cuối bằng ví thật** trên Vercel: tạo sự kiện (ngày tương lai) → ví B mua 2 vé → B rao bán lại (thử giá > 110% phải bị chặn) → ví C mua lại → C tạo mã check-in → Organizer quét bằng điện thoại | Cả nhóm | Lưu mã giao dịch làm bằng chứng |
| 2 | Điền `docs/PRESENTATION_PLAN.md`: tên người từng phần, mã giao dịch demo, đổi URL GitHub Pages → URL Vercel | Cả nhóm | Lấy mã giao dịch từ bước 1 |
| 3 | Gán danh mục + địa chỉ cho sự kiện cũ (đang hiện "Khác") | Thảo: #0, #2 · Ví `0x82d0…19A7`: #1 | Nút "Sửa thông tin hiển thị", ký miễn phí |
| 4 | Ghi phần FairTicket V2 vào `docs/AI_JOURNAL.md` | Thảo | Môn học yêu cầu nhật ký dùng AI |
| 5 | Commit `lab-15: public dapp va presentation plan` + tag `v0.1-demo` | Thảo | Làm sau bước 1–2 |
| 6 | Quyết định stash `stash@{0}` (chú thích `@notice` cho `contracts/training`) | Linh/Thảo | Áp lại hoặc bỏ |
| 7 | (Tuỳ chọn) R7 — hạn bán lại theo thời gian | — | Cần sửa hợp đồng + deploy lại → đổi CA |

## 8. Giới hạn đã biết (nên nói rõ khi thuyết trình)

- **Vé không phải token ERC-721**: là bản ghi trong `mapping(tickets)` của ProjectCore. Ưu điểm: không có hàm chuyển vé nên không lách được trần 110%.
- **Hợp đồng không có hàm gỡ rao bán**: chủ vé chỉ đổi giá được.
- **Hợp đồng không chặn mua vé sau giờ bắt đầu và không kiểm tra vé thuộc sự kiện khi check-in**: giao diện chặn thay. Gọi thẳng hợp đồng (Remix/Etherscan) thì vẫn làm được.
- **Doanh thu Organizer chỉ từ lần bán đầu**: tiền bán lại đi thẳng cho người bán, Organizer không có phần trăm.
- **Check-in**: mã QR có hạn 5 phút. Nếu chủ vé tự gửi mã cho người khác trong 5 phút đó thì người kia vẫn vào được, nhưng hợp đồng chỉ cho check-in 1 lần.
- **Hợp đồng chỉ có giờ bắt đầu, không có giờ kết thúc**, nên check-in vẫn mở sau giờ bắt đầu.
- **Phụ thuộc dịch vụ ngoài**: Vercel (web + metadata), Tenderly (lịch sử), publicnode (đọc chain khi chưa có ví), Google Maps. Hỏng dịch vụ nào thì phần tương ứng báo lỗi kèm nút "Thử lại", không ảnh hưởng dữ liệu trên chain.
- **Sự kiện #3** (ví `0x8321…319c`, 20/10) có giá vé **0.000000000003 ETH** — có thể gõ nhầm. Không sửa được vì giá nằm trên hợp đồng.
- Dữ liệu tỉnh/thành lấy từ provinces.open-api.vn ghi Quảng Ninh, Bắc Ninh, Đồng Nai là "Thành phố" — chưa đối chiếu với văn bản chính thức.

## 9. Giao dịch thật trên Sepolia (bằng chứng on-chain)

| Thời gian (UTC) | Sự kiện | Chi tiết | Giao dịch |
|---|---|---|---|
| 13/10 06:54 | EventCreated | Sự kiện #0 (ví `0x4f99…`) | [`0xb8d2a868…`](https://sepolia.etherscan.io/tx/0xb8d2a8686e5443a73b5a7aaf550d0be9ddbf61bc3e00959fa1b4b499bbd85b20) |
| 13/10 06:54 | TierCreated | Hạng #0 Standard 0.002 ETH × 100 | [`0x2c6aaaaa…`](https://sepolia.etherscan.io/tx/0x2c6aaaaa2c0625417656bc08e314b81c34309e3cc351b6c98ddd8a6d7747461b) |
| 13/10 07:25 | EventCreated | Sự kiện #1 MUSIC WEEK (ví `0x82d0…`) | [`0xa565a7c7…`](https://sepolia.etherscan.io/tx/0xa565a7c77b3c125c0b034aa71ec703a862e899d4c5b663428a07d5f0f5fbc30b) |
| 13/10 07:27 | TierCreated | Hạng #1 Standard 0.0001 ETH × 100 | [`0xb81cec8a…`](https://sepolia.etherscan.io/tx/0xb81cec8a6a6f2e48058ecffccd6ecfc0d872198d7c042ad9b2c315f3c7f46af2) |
| 13/10 07:28 | TicketMinted | Vé #0 (sự kiện #1) cho ví `0x4f99…` | [`0xc9f64e9d…`](https://sepolia.etherscan.io/tx/0xc9f64e9d8694ce48246c6e722b6c500a1b34342abd2963a816dbbfe9b5007dc5) |
| 13/10 07:29 | ProceedsWithdrawn | Ví `0x82d0…` rút 0.0001 ETH | [`0x4ecfd995…`](https://sepolia.etherscan.io/tx/0x4ecfd995199f6a34ff0b35b07d947c1b85d71328d955ab3f78b580d48595cebd) |
| 15/10 07:00 | EventCreated | Sự kiện #2 (ví `0x4f99…`) | [`0x1d63350b…`](https://sepolia.etherscan.io/tx/0x1d63350b3de23737e388f6d5d000a458c2525f5b92f140f86fb2285d8eaf82cc) |
| 15/10 07:00 | TierCreated | Hạng #2 Standard 0.002 ETH × 110 | [`0xd28bb251…`](https://sepolia.etherscan.io/tx/0xd28bb251d4e6fb72cc10488a14214c1da14e7d0f3c7d6353e59a5f956119b477) |
| 15/10 07:01 | TierCreated | Hạng #3 Vip 0.005 ETH × 30 | [`0xc9b5df30…`](https://sepolia.etherscan.io/tx/0xc9b5df303236f89db9f530d07f4156afd477a9e9845674c140103bba623718f9) |
| 15/10 07:01 | TicketMinted | Vé #1 (sự kiện #2, Vip) cho ví `0x4f99…` | [`0xbc35c366…`](https://sepolia.etherscan.io/tx/0xbc35c366ddebc7189a553e3d5a81057289a6cc386454f7ddfc35539bd4e26ad7) |
| 20/10 06:04 | EventCreated | Sự kiện #3 (ví `0x8321…`) | [`0x5baf97fb…`](https://sepolia.etherscan.io/tx/0x5baf97fb2b28e1c461561bf1f818652ad3e4e0d05bea9114915d9401a68efa38) |
| 20/10 06:05 | TierCreated | Hạng #4 Standard 0.000000000003 ETH × 90 | [`0x4fb05005…`](https://sepolia.etherscan.io/tx/0x4fb0500599578041f4533841f64cf344bb0b9b2767ef769032ac5198f04c08c5) |
| 20/10 06:06 | ProceedsWithdrawn | Ví `0x4f99…` rút 0.005 ETH | [`0x16ec1fe7…`](https://sepolia.etherscan.io/tx/0x16ec1fe78434e16743d0d3824d50795327e3c1490035e1b67d4f68c5318b5e5a) |
