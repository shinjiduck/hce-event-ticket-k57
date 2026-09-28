# AI JOURNAL

Nhật ký sử dụng AI trong quá trình làm Lab 8, theo yêu cầu minh bạch của môn học.

## Lab 8

**Công cụ:** Claude (Claude Code)

**Mục đích sử dụng:**
- Soạn khung nội dung ban đầu cho `README.md`, `docs/PROJECT_PLAN.md`, `docs/SPEC.md`, `docs/ECONOMIC_RULES.md` dựa trên chủ đề nhóm đã chọn (vé sự kiện giới hạn bán lại) và cấu trúc Lab 8 trong giáo trình
- Chạy phản biện đối kháng (adversarial review) theo đúng prompt của Lab 8: "Bạn là người dùng thận trọng... nêu 5 cách một người có thể lạm dụng quy tắc..." để tìm lỗ hổng trong SPEC/ECONOMIC_RULES v0.1.

**Kết quả phản biện đã áp dụng:**
- Phát hiện thiếu quy tắc chặn transfer tự do ngoài cơ chế resale → bổ sung R8.
- Phát hiện thiếu giới hạn thời gian resale → bổ sung R7.
- Phát hiện thiếu giới hạn tổng cung vé → bổ sung R9.
- Rủi ro Organizer check-in tùy tiện: nhóm quyết định chấp nhận (Organizer là trusted party trong mô hình demo Lab 8), không thêm cơ chế phức tạp.

**Phần do nhóm tự quyết định (không phải AI đề xuất):**
- Chọn đề tài, câu giới thiệu sản phẩm, phân vai và lịch xoay vai giữa Mai Bá Linh và Nguyễn Hoàng Thảo.
- Quyết định chấp nhận rủi ro ở Abuse 2 thay vì sửa quy tắc.
- Review và chỉnh sửa nội dung SPEC/ECONOMIC_RULES trước khi commit.

**Giới hạn:** nội dung do AI soạn là bản nháp v0.1, nhóm đã đọc lại và chịu trách nhiệm về nội dung cuối cùng commit vào repo.

## Lab 9

**Công cụ:** Claude (Claude Code)

**Mục đích sử dụng:**
- Soạn `contracts/training/SPEC.md` (5 quy tắc R1–R5) cho `TimeLockVault` trước khi sinh mã, theo đúng thứ tự Bước 1 → Bước 2 của Lab 9.
- Giải thích lựa chọn thiết kế của `TimeLockVault.sol` trước khi chốt mã nguồn:
  - **Checks–Effects–Interactions** trong `withdraw()`: kiểm tra quyền/điều kiện → phát `event Withdrawn` → mới `call` chuyển tiền, để lỡ có gọi lại (reentrancy) thì trạng thái đã cập nhật xong.
  - **Lỗi tùy biến (`error NotOwner()`, `StillLocked(...)`, v.v.) thay cho `require` chuỗi dài** — rẻ hơn về gas và `StillLocked` mang theo dữ liệu (`unlockAt`, `currentTime`) để tra cứu.
  - **`call` thay cho `transfer`** khi chuyển tiền — `transfer` giới hạn cứng 2300 gas, dễ thất bại nếu `owner` là một hợp đồng khác.
  - **`indexed` trên địa chỉ trong `Deposited`/`Withdrawn`** — cho phép lọc lịch sử theo từng ví khi tra cứu on-chain.
- Đối chiếu với bản mẫu giảng viên chiếu ở Bước 3: mã do AI sinh khớp hoàn toàn với bản mẫu (cùng tên lỗi, cùng thứ tự CEI, cùng cách dùng `call`), nhóm không phải sửa lại.

**Phần do nhóm tự quyết định (không phải AI đề xuất):**
- Chọn `lockDurationSeconds = 120` khi triển khai thử để rút ngắn thời gian chờ trong buổi học.
- Review SPEC.md và mã nguồn trước khi coi là bản chốt cho `contracts/training/`.

**Giới hạn:** SPEC.md và phần giải thích thiết kế là bản nháp do AI soạn theo yêu cầu Bước 1–2, nhóm đã đọc và xác nhận đúng với hợp đồng trước khi commit.

## Lab 10

**Công cụ:** Claude (Claude Code) — vai trò kiểm toán viên hợp đồng thông minh (Bước 2/4 của Lab 10).

### Bảng phát hiện lỗi — `contracts/project/ProjectCore.sol`

| Lỗi | Mô tả | Ai phát hiện | Cách khắc phục |
|---|---|---|---|
| 1 | `buyTicket()` "đẩy" tiền thẳng cho `organizer` bằng `call()` ngay trong giao dịch mua vé. Nếu địa chỉ `organizer` không nhận được ETH (hợp đồng không có `receive`/`fallback`, hoặc cố tình từ chối), `call()` thất bại → cả giao dịch revert → vé của event đó **không ai mua được nữa vĩnh viễn** (tự-DoS). | AI | Đổi sang mô hình pull-payment: `buyTicket()` chỉ ghi nhận `pendingWithdrawals[organizer] += msg.value`; thêm hàm `withdrawProceeds()` để Organizer tự rút, tách khỏi luồng mua vé của người khác. |
| 2 | `mintTicket()` không kiểm tra `originalPrice > 0` và `createEvent()` không kiểm tra `maxSupply > 0` — Organizer có thể vô tình (hoặc cố ý) tạo vé giá 0 hoặc event không bao giờ bán được vé nào, mà không có tín hiệu nào trên chain cho biết đó là lỗi hay chủ ý. | AI | Thêm `error InvalidPrice()` / `error InvalidMaxSupply()`; `mintTicket()` revert nếu `originalPrice == 0`, `createEvent()` revert nếu `maxSupply == 0`. |

**Đã sửa:** cả 2 lỗi trên — xem `contracts/project/ProjectCore.sol` (hàm `buyTicket()`, `withdrawProceeds()` mới, và các dòng kiểm tra đầu `createEvent()`/`mintTicket()`). Biên dịch lại thành công bằng `solc 0.8.37` (`npx solc --bin --abi contracts/project/ProjectCore.sol`), không phát sinh lỗi hay warning mới.

**Lưu ý minh bạch:** cả 2 phát hiện trên đều do AI quét ra khi được giao vai kiểm toán viên (Bước 2), nhóm chưa có phát hiện độc lập nào ở Bước 1 (đọc thủ công) tại thời điểm ghi bảng này — nhóm cần bổ sung cột "Sinh viên" nếu buổi học trên lớp tự tìm ra thêm lỗi trước khi chạy AI.

### Bảng phát hiện lỗi — `contracts/training/VaultBuggy.sol` (bài luyện)

| Lỗi | Mô tả | Ai phát hiện | Cách khắc phục |
|---|---|---|---|
| 1 | *(chưa điền — cần chạy Bước 1–2 trên `VaultBuggy.sol` khi có mã nguồn)* | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |

**Bằng chứng thực nghiệm (Bước 3):** *(chưa có — cần triển khai `VaultBuggy` với `_pin = 123456` và đọc `eth_getStorageAt` slot `0x2`, lưu ảnh vào `evidence/lab-10/`)*.

## Lab 11

**Công cụ:** Claude (Claude Code)

**Mục đích sử dụng:**
- Chọn 1 quy tắc trong `docs/ECONOMIC_RULES.md` để cài vào `contracts/project/ProjectCore.sol`: **R3 — trần giá bán lại 110%** (mục II.1), vì đây là quy tắc "về tiền" rõ ràng nhất và đã có sẵn field `resalePrice`/`forSale` trong `docs/SPEC.md` từ Lab 8.
- Thêm hằng số `MAX_RESALE_BPS = 11_000` (basis point, 10_000 = 100%) theo đúng gợi ý bài mẫu `ClassPoint` — tránh số thập phân trong Solidity.
- Cài 2 hàm mới: `listForResale()` (kiểm tra `price <= originalPrice * 11000 / 10000`, chỉ chủ vé hiện tại được gọi) và `buyResaleTicket()` (đổi chủ, trả tiền cho người bán qua `pendingWithdrawals` — tái dùng pattern pull-payment đã sửa ở Lab 10 để nhất quán và an toàn hơn `call` trực tiếp).
- Không cài R4/R7/R8 (quyền bán lại nâng cao, hạn resale theo `startTime`, cấm transfer tự do) — đúng phạm vi "chỉ một quy tắc" của Bước 3.

**Kiểm thử (Bước 4):** viết 2 ca kiểm thử chạy thật trên EVM (Hardhat local network, không phải mock) — xem `evidence/lab-11/resale.test.js` và log `evidence/lab-11/test-log.txt`:
- Ca hợp lệ: list giá đúng 110% gốc → thành công, event `TicketListedForResale`; mua lại thành công, đổi chủ.
- Ca vi phạm: list giá 120% gốc → revert đúng `ResalePriceTooHigh(attempted, limit)`.

Biên dịch lại bằng `solc 0.8.37` (`npx solc --bin --abi`) không lỗi/warning mới.

**Phần do nhóm tự quyết định (không phải AI đề xuất):**
- Chọn đúng quy tắc R3 (không phải phí hay tiền cọc) vì phù hợp nhất với sản phẩm vé sự kiện.
- Quyết định không làm phần "Mở rộng tùy chọn" (ClassPoint/token) vì sản phẩm nhóm không phải đề tài token.

**Giới hạn:** `docs/SPEC.md` đã có sẵn `resalePrice`/`forSale` trong data model và tên hàm `listForResale()`/`buyResaleTicket()` từ trước (Lab 8) nên không cần sửa SPEC.md lần này; nhóm đã đối chiếu để xác nhận khớp.
