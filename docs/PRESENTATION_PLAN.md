# Presentation Plan — FairTicket (Lab 15)

> Đề bài tham chiếu "khung ở Phần C" nhưng không có trong đề đã đưa cho repo này — khung dưới đây là bản mặc định hợp lý (thời lượng, vai trò, mỗi người phụ trách đúng 1 artifact). Nếu có bản khung chính thức khác từ giảng viên, thay nội dung bảng theo đúng khung đó, giữ nguyên cấu trúc file.

## Phân vai — mỗi người phụ trách đúng 1 artifact

Theo phân vai Lab 12–15 trong `docs/PROJECT_PLAN.md` (Mai Bá Linh: Giao diện + Kiểm thử; Nguyễn Hoàng Thảo: Đặc tả + Hợp đồng):

| Thời lượng | Nội dung | Người nói | Artifact phụ trách |
|---|---|---|---|
| 1 phút | Giới thiệu bài toán + đối tượng dùng (vé giả, đầu cơ, không xác định được chủ vé) | **Nguyễn Hoàng Thảo** | `README.md` / `docs/PROJECT_PLAN.md` |
| 2 phút | Demo trực tiếp trên URL công khai: kết nối ví, chạy luồng thành công (tạo sự kiện → tạo hạng vé → mint vé → xem QR) | **Mai Bá Linh** | `web/` (DApp frontend đã deploy) |
| 1.5 phút | Demo ca bị từ chối (rao bán vượt trần của sự kiện revert `ResalePriceTooHigh`, mua quá số vé/ví revert `WalletLimitReached`, người lạ check-in revert `NotCheckInAuthorized`, CTV bị thu hồi quyền quét vé bị từ chối) | **Mai Bá Linh** & **Nguyễn Hoàng Thảo** | `contracts/project/ProjectCore.sol` (quy tắc R3/R5) |
| 1 phút | Hành trình audit/vá lỗi bảo mật đã làm (Lab 10, 13, 14) — phòng chống Reentrancy bằng Pull-Payment | **Nguyễn Hoàng Thảo** | `docs/AI_JOURNAL.md` + `evidence/lab-13/`, `evidence/lab-14/` |
| 1 phút | Hướng phát triển tiếp theo (QR động chống chụp màn hình, phí bản quyền) + câu hỏi thảo luận | **Cả 2** (Linh & Thảo) | `docs/ECONOMIC_RULES.md` |

**Tổng thời lượng:** 6.5 phút — nếu đề bài quy định đúng khung thời gian khác, giãn/co lại các mục trên.

## Thông tin hợp đồng & Mã giao dịch demo

- Contract **v4** trên Sepolia (đang dùng): [`0x0845EEB1Ed93C373173680a859fB255f168b9Fd0`](https://sepolia.etherscan.io/address/0x0845EEB1Ed93C373173680a859fB255f168b9Fd0) — deploy: [`0x69af8ed8…`](https://sepolia.etherscan.io/tx/0x69af8ed83e21fd2ffba929d63ec7d3f64c413082814831921765558b916fc2b2)
- Contract v2 (lịch sử, các mã giao dịch bên dưới thuộc hợp đồng này): [`0x0f96cafe4C603D706c786C503A5c903090706916`](https://sepolia.etherscan.io/address/0x0f96cafe4C603D706c786C503A5c903090706916)
- URL DApp công khai (Vercel): [https://hce-event-ticket-k57-git-main-nguyenhoangthao.vercel.app](https://hce-event-ticket-k57-git-main-nguyenhoangthao.vercel.app)
- Transaction hash (ca thành công — Mint vé #0): [`0xc9f64e9d8694ce48246c6e722b6c500a1b34342abd2963a816dbbfe9b5007dc5`](https://sepolia.etherscan.io/tx/0xc9f64e9d8694ce48246c6e722b6c500a1b34342abd2963a816dbbfe9b5007dc5)
- Transaction hash (ca thành công — Rút tiền Organizer): [`0x4ecfd995199f6a34ff0b35b07d947c1b85d71328d955ab3f78b580d48595cebd`](https://sepolia.etherscan.io/tx/0x4ecfd995199f6a34ff0b35b07d947c1b85d71328d955ab3f78b580d48595cebd)
- ⚠️ Cần bổ sung mã giao dịch demo trên **v4** sau khi tạo lại dữ liệu (tạo sự kiện có trần/giới hạn ví, mua vé, rao bán, mua lại có phí 5%, cấp quyền CTV, CTV check-in).
- Ca bị từ chối demo trực tiếp: Rao bán lại vé giá vượt trần của sự kiện revert `ResalePriceTooHigh` (quy tắc R3); ví đã mua đủ số vé tối đa revert `WalletLimitReached` (R1c); ví không có quyền check-in revert `NotCheckInAuthorized`; vé sự kiện khác revert `TicketNotInEvent` (quy tắc R5).

## Checklist trước khi trình bày

- [ ] URL mở được trên điện thoại (không chỉ máy tính nhóm).
- [ ] Ví kết nối được, không cần cài thêm gì ngoài MetaMask có sẵn.
- [ ] Chạy thử kịch bản đúng 1 lần theo đồng hồ bấm giờ trước buổi thật.
- [ ] Mỗi người thuộc đúng phần mình nói, không đọc lại phần người khác.
