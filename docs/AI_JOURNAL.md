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
