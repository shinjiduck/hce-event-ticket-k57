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

| Mức độ | Dòng | Lỗ hổng | Khai thác thế nào | Cách sửa |
|---|---:|---|---|---|
| 🔴 **Critical** | 40–42 | **`setBalance()` không kiểm soát quyền** | Bất kỳ ai cũng gọi `setBalance(address, newBalance)` để tự ý sửa `balances` của mình hoặc người khác. Kẻ tấn công có thể tạo số dư giả rồi tìm cách rút ETH thật đang có trong vault. | Thêm `onlyOwner` hoặc kiểm tra `require(msg.sender == owner)`. |
| 🔴 **Critical** | 47–54 | **PIN `private` không thực sự bí mật** | `emergencyPin` dù khai báo `private` vẫn nằm trong storage blockchain. Người quan sát blockchain có thể đọc giá trị storage; biết PIN rồi có thể gọi `emergencyWithdraw()` và chuyển tiền về chính `msg.sender`. | Không dùng secret/PIN on-chain để xác thực. Dùng quyền owner, multisig hoặc cơ chế chữ ký. |
| 🔴 **High** | 25–32 | **Reentrancy trong `withdraw()`** | ETH được gửi bằng `call` ở dòng 28 **trước khi** số dư giảm ở dòng 31. Contract nhận tiền có thể dùng `receive()`/`fallback()` để gọi lại `withdraw()` trước khi trạng thái được cập nhật. | Theo Checks-Effects-Interactions: giảm `balances` **trước** khi `call`; có thể kết hợp `nonReentrant`. |
| 🟠 **High** | 36 | **Dùng `tx.origin` để xác thực owner** | Owner có thể bị dụ gọi một contract độc hại. Contract trung gian gọi `changeOwner()` nhưng `tx.origin` vẫn là địa chỉ owner ban đầu, nên kiểm tra có thể vượt qua. | Thay bằng `require(msg.sender == owner)` hoặc modifier `onlyOwner`. |
| 🟡 **Medium** | 35–40 | **Không kiểm tra `newOwner != address(0)`** | Owner có thể vô tình đặt owner thành `0x000...000`, khiến quyền quản trị bị mất/khóa tùy thiết kế. | Thêm `require(newOwner != address(0), "...")`. |
| 🟡 **Medium** | 46–54 | **Emergency withdrawal không gắn với owner và không cập nhật accounting** | Người có PIN có thể rút ETH mà không cần là owner; đồng thời `balances` của người gửi tiền không giảm, làm số liệu nội bộ không còn khớp với ETH thực tế. | Thiết kế lại emergency withdrawal với access control và xác định rõ cách cập nhật/trạng thái hóa số dư. |
| 🔵 **Low / thiết kế** | 20–23 | **Cho phép deposit 0 ETH** | `deposit()` không kiểm tra `msg.value > 0`, nên có thể tạo event `Deposited(..., 0)`. Không trực tiếp làm mất tiền nhưng tạo giao dịch/event vô nghĩa. | Thêm `require(msg.value > 0, "So tien phai > 0");`. |

*Ghi chú kỹ thuật (không phải nội dung audit của Linh): commit gốc đẩy `contracts/training/VaultBuggy.sol` lên bị rỗng (0 byte) — đã khôi phục lại đúng bản gốc gửi cho Linh. Số dòng trong bảng trên có thể lệch vài dòng so với bản khôi phục (khác định dạng/khoảng trắng ở bản Linh audit), nhưng tên hàm và mô tả lỗ hổng khớp chính xác.*

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

**Phần kiểm thử bổ sung của Linh (R4):**
- Account B (không phải chủ vé #0) gọi `listForResale()` → revert đúng `NotTicketOwner`, xem `evidence/lab-11/04-resale-not-owner-reverted.png`.

Biên dịch lại bằng `solc 0.8.37` (`npx solc --bin --abi`) không lỗi/warning mới.

**Phần do nhóm tự quyết định (không phải AI đề xuất):**
- Chọn đúng quy tắc R3 (không phải phí hay tiền cọc) vì phù hợp nhất với sản phẩm vé sự kiện.
- Quyết định không làm phần "Mở rộng tùy chọn" (ClassPoint/token) vì sản phẩm nhóm không phải đề tài token.

**Giới hạn:** `docs/SPEC.md` đã có sẵn `resalePrice`/`forSale` trong data model và tên hàm `listForResale()`/`buyResaleTicket()` từ trước (Lab 8) nên không cần sửa SPEC.md lần này; nhóm đã đối chiếu để xác nhận khớp.

## Lab 13

**Công cụ:** Claude (Claude Code)

**Bài luyện — `VulnerableBank.sol` + `Attacker.sol`:**
- Soạn `VulnerableBank.sol` (lỗi reentrancy cố ý: `withdraw()` gọi `call` chuyển tiền trước khi `balances[msg.sender] = 0`), `Attacker.sol` (khai thác qua `receive()` gọi lại `withdraw()` liên tục), và `VulnerableBank_Fixed.sol` (Cách 1 — chỉ đổi thứ tự 2 dòng, không đổi tên hàm/không thêm từ khóa).
- Chạy thử trên Hardhat local EVM trước khi giao cho Linh/Thảo làm lại thủ công trên Remix VM (theo đúng yêu cầu đề — Remix VM mới tính là bằng chứng chính thức): 3 tài khoản deposit 2 ETH → `bankBalance() = 6 ETH`; `Attacker.attack()` 1 ETH → rút cạn `7 ETH`; chạy lại trên bản đã vá → `attack()` revert toàn bộ, 6 ETH của người khác an toàn. Log ở `evidence/lab-13/reentrancy-log.txt`.

**Ba câu giải thích vì sao THỨ TỰ dòng lệnh (không phải một từ khóa) là thứ chặn được tấn công:**
1. Cuộc tấn công dựa vào việc `withdraw()` còn "tin" số dư cũ trong lúc tiền đã rời khỏi hợp đồng — nó không khai thác một từ khóa bị thiếu, mà khai thác một khoảng thời gian giữa "trả tiền" và "ghi sổ" vẫn còn tồn tại.
2. Khi đổi `balances[msg.sender] = 0` lên **trước** dòng `call{value: bal}("")`, lần gọi lại (reentrant call) trong `receive()` của kẻ tấn công đọc thấy số dư đã là 0 và tự revert — không có `nonReentrant`, không có thư viện nào tham gia, chỉ có thứ tự 2 dòng lệnh thay đổi.
3. Nếu thêm `nonReentrant` (Cách 2) mà vẫn giữ nguyên thứ tự cũ (trả tiền trước, ghi sổ sau) thì cũng chặn được tấn công, nhưng đó là chặn bằng một lớp khóa bên ngoài — bản chất lỗi (thứ tự Effects sau Interactions) vẫn còn nguyên trong hàm, chỉ là bị khóa che lại; hiểu rõ Cách 1 mới là hiểu đúng gốc rễ.

**Mục tiêu thật — negative test cho `ProjectCore.sol`:**
- Soi toàn bộ nơi có chuyển tiền/gọi hợp đồng khác trong `ProjectCore.sol`: `buyTicket()`, `buyResaleTicket()`, `withdrawProceeds()` (đều đã qua pull-payment từ Lab 10, không còn `call` trực tiếp trong luồng mua/bán).
- Viết 2 ca kiểm thử thất bại (yêu cầu tối thiểu 1): (1) `buyTicket()` sai số tiền → `IncorrectPayment`; (2) dựng `ReentrantOrganizer.sol` cố gọi lại `withdrawProceeds()` ngay trong `receive()` — bị chặn đúng như thiết kế, không rút được lần 2. Xem `evidence/lab-13/projectcore-negative-log.txt`.
- **Quyết định:** không phát hiện hành vi sai `SPEC.md`, không cần sửa `ProjectCore.sol` thêm — cơ chế pull-payment vá ở Lab 10 đã đứng vững trước phép thử reentrancy chủ đề Lab 13.

**Phần do nhóm tự quyết định (không phải AI đề xuất):**
- Chọn kiểm thử reentrancy cho `withdrawProceeds()` thay vì chỉ lặp lại các ca "sai người/sai số tiền" đã có từ Lab 11, vì đây là chỗ duy nhất trong `ProjectCore.sol` còn chuyển ETH ra ngoài bằng `call`.

**Giới hạn:** log Hardhat trong `evidence/lab-13/` là bằng chứng kỹ thuật bổ sung do AI chạy được ngay, **không thay thế** yêu cầu "ảnh/ảnh động chụp Remix VM" của đề — phần đó cần Linh/Thảo tự tay làm lại và chụp lại.
