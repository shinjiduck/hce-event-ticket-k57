# FairTicket

DApp quản lý vé sự kiện chống vé giả và hạn chế đầu cơ.

## Giới thiệu sản phẩm

> Nhóm xây nền tảng vé sự kiện cho người tham dự và ban tổ chức để chống vé giả, hạn chế đầu cơ và đảm bảo mỗi vé chỉ được check-in một lần.

## Chủ đề

Vé sự kiện giới hạn bán lại.

## Thành viên

- Mai Bá Linh
- Nguyễn Hoàng Thảo

## Tài liệu

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) — vai trò, mốc bắt buộc
- [docs/SPEC.md](docs/SPEC.md) — đặc tả v0.1
- [docs/ECONOMIC_RULES.md](docs/ECONOMIC_RULES.md) — quy tắc kinh tế
- [docs/AI_JOURNAL.md](docs/AI_JOURNAL.md) — nhật ký sử dụng AI

## Cách chạy

Contract chính: [contracts/project/ProjectCore.sol](contracts/project/ProjectCore.sol) (Solidity `^0.8.20`).

**Cách 1 — Remix (dùng trong lớp):**
1. Mở [remix.ethereum.org](https://remix.ethereum.org), tạo file mới, dán nội dung `ProjectCore.sol`.
2. Tab Solidity Compiler → chọn phiên bản `0.8.20` trở lên → Compile.
3. Tab Deploy & Run → môi trường "Remix VM" (thử nhanh, miễn phí) hoặc "Injected Provider - MetaMask" (Sepolia, để có bằng chứng on-chain thật) → Deploy.
4. Gọi lần lượt: `createEvent(name, startTime, maxSupply)` → `mintTicket(eventId, originalPrice)` → `buyTicket(ticketId)` kèm `value` đúng giá vé → `listForResale(ticketId, price)` / `buyResaleTicket(ticketId)` nếu muốn thử luồng bán lại.

**Cách 2 — biên dịch nhanh bằng dòng lệnh (kiểm tra không lỗi cú pháp, không deploy):**
```
npx solc --bin --abi contracts/project/ProjectCore.sol
```

**Kiểm thử tự động (ca hợp lệ + ca vi phạm quy tắc R3):** xem [evidence/lab-11/resale.test.js](evidence/lab-11/resale.test.js) và log kết quả tại [evidence/lab-11/test-log.txt](evidence/lab-11/test-log.txt).
