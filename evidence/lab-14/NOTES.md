# Bằng chứng — Lab 14 (Rà soát chéo giữa các nhóm)

Lab 14 là hoạt động **rà soát chéo thật giữa 2 nhóm trên lớp** (giảng viên ghép cặp theo vòng tròn) — phần này không làm thay được trước. Thư mục này chỉ chứa phần nhóm tự chuẩn bị được trước.

## Đã làm trước (chuẩn bị)

- [x] [`SELF_AUDIT_PREP.md`](SELF_AUDIT_PREP.md) — tự chạy đúng bộ 10 tiêu chí bắt buộc của đề lên `ProjectCore.sol` của chính nhóm. Tìm ra 1 lỗi thật (mục 9 — `listForResale()` không chặn giá 0) và đã sửa.
- [x] [`lab14-selfaudit.test.js`](lab14-selfaudit.test.js) + log [`self-audit-fix-log.txt`](self-audit-fix-log.txt) — bằng chứng lỗi đã vá, biên dịch và test lại không lỗi.

## Còn lại — chỉ làm được trên lớp (khi đã ghép cặp nhóm)

- [ ] **Bước 1 (45 phút):** rà soát `contracts/project/ProjectCore.sol` + `docs/SPEC.md` của **nhóm được ghép cặp** (không phải nhóm mình) bằng đúng bộ 10 tiêu chí — dùng được AI nhưng mọi phát hiện phải trích số dòng thật.
- [ ] **Bước 2 (20 phút):** viết `docs/AUDIT_REPORT.md` **trong repo của nhóm bị rà soát** theo đúng mẫu trong đề bài.
- [ ] **Bước 3 (10 phút):** nhận phản hồi từ nhóm kia về `ProjectCore.sol` của **nhóm mình**, sửa lỗi nghiêm trọng nhất có thể xử lý ngay, commit `lab-14: xu ly ket qua audit cheo`.

## Chia việc gợi ý cho buổi học thật

| Việc | Người |
|---|---|
| Rà soát mục 1-5 của nhóm bạn | Linh |
| Rà soát mục 6-10 của nhóm bạn | Thảo |
| Gộp lại, viết `docs/AUDIT_REPORT.md` theo mẫu | Cả 2, một người gõ một người soát số dòng |
| Nhận phản hồi về code mình, chọn lỗi nghiêm trọng nhất để sửa + commit cuối buổi | Cả 2 |
