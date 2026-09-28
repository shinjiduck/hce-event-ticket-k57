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
