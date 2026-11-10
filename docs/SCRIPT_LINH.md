# KỊCH BẢN THUYẾT TRÌNH — PHẦN CỦA LINH

> **Người nói:** Mai Bá Linh (Giao diện + Kiểm thử, Lab 12–15)
> **Thời lượng phần Linh:** khoảng 6 phút, nói một lượt liền, ở giữa buổi.
> **Thứ tự cả buổi:** Thảo (mở đầu + kinh tế, 5 phút) → **Linh (demo + ca bị từ chối + kiểm thử, 6 phút)** → Thảo (bảo mật + giới hạn + kết, 2 phút) → hỏi đáp. Phần của Thảo: [SCRIPT_THAO.md](SCRIPT_THAO.md).
> Chữ thường là lời nói. **[Thao tác]** là việc làm trên máy. **[Slide]** là nội dung trên màn chiếu. **[Chuyển lời]** là câu chuyển sang Thảo.

---

## Trước buổi: Linh chuẩn bị (làm trước ít nhất 1 ngày)

### 4 ví trên Sepolia, mỗi ví ≥ 0.05 ETH test

| Ví | Vai | Mở ở đâu |
|---|---|---|
| **A** | Ban tổ chức | Trình duyệt Chrome, profile 1 |
| **B** | Người mua 1 (người bán lại) | Chrome, profile 2 |
| **C** | Người mua 2 (người mua lại) | Chrome, profile 3 |
| **D** | CTV soát vé | **Điện thoại**, app MetaMask |

### Dữ liệu dựng sẵn

1. Ví A tạo sự kiện **"FairTicket Night 2026"**:
   - có ảnh bìa, ngày diễn ra **sau** buổi thuyết trình;
   - trần **120%**, tối đa **2 vé/ví**;
   - hạng Standard **0.01 ETH × 50 vé**.
2. Ví A tạo thêm 1–2 sự kiện khác có ảnh, để trang chủ không trống.
3. Ví B mua sẵn **2 vé**, tức là đã chạm giới hạn ví.
4. Remix: biên dịch `ProjectCore.sol` → **At Address** `0x0845EEB1Ed93C373173680a859fB255f168b9Fd0`, chọn sẵn ví B.
5. **Quay sẵn video** toàn bộ phần demo để dự phòng.

### Ngay trước giờ lên

- [ ] Bấm Ctrl+F5 ở cả 3 profile Chrome.
- [ ] Ví D trên điện thoại: thử quét một mã QR bằng app camera.
- [ ] Mở sẵn tab Etherscan của hợp đồng và file `evidence/lab-15-v4/ui-e2e-v4-log.txt`.

---

## 1. Câu mở (10 giây)

**[Chuyển lời từ Thảo]** "Mời Linh demo trực tiếp trên DApp."

> Cảm ơn Thảo. Em sẽ demo trực tiếp trên DApp đã deploy công khai ở Vercel. Ứng dụng kết nối với hợp đồng thật trên mạng thử nghiệm Sepolia của Ethereum. Mọi thao tác mọi người sắp thấy đều là giao dịch thật, tra được trên Etherscan.

---

## 2. Demo luồng thành công (3 phút 30)

### 2.1 Trang chủ (20 giây)

**[Thao tác]** Profile B, mở trang chủ. Cuộn nhẹ để thấy hiệu ứng.

> Đây là trang chủ. Thẻ vé nổi bên phải là **sự kiện sắp diễn ra gần nhất, lấy trực tiếp từ blockchain**. Bên dưới là số sự kiện và số vé đã phát hành, **đọc thẳng từ hợp đồng**. Nhóm không đặt con số nào bằng tay.

### 2.2 Tạo sự kiện (40 giây)

**[Thao tác]** Profile A → **Tạo sự kiện**. Gõ tên, chọn danh mục, chọn ngày, chọn ảnh. Chỉ vào thẻ xem trước bên phải đang đổi theo khi gõ.

> Ban tổ chức tạo sự kiện qua 3 bước. Bên phải là **bản xem trước**, cập nhật ngay khi gõ.

**[Thao tác]** Sang bước 2. Chọn trần **120%**, số vé/ví **2**. Chỉ vào khung "Quy tắc ghi trên hợp đồng".

> Bước 2 là phần kinh tế mà Thảo vừa trình bày. Ban tổ chức chọn **trần giá bán lại** và **số vé tối đa mỗi ví**. Khung bên phải tự tính luôn: giá bán lại tối đa, phí bản quyền 5%, và doanh thu nếu bán hết. Hai quy tắc này **ghi vĩnh viễn** lên hợp đồng.

**[Thao tác]** Sang bước 3 "Xem lại", **không bấm Deploy** để tiết kiệm thời gian. Mở sự kiện "FairTicket Night 2026" đã tạo sẵn.

> Bấm Deploy sẽ gửi 2 giao dịch. Để tiết kiệm thời gian, em dùng sự kiện đã tạo sẵn với đúng cấu hình này.

### 2.3 Mua vé (40 giây)

**[Thao tác]** Profile C → trang sự kiện. Chỉ dòng "Mỗi ví được mua mới tối đa 2 vé" và thông tin "trần 120%". Chọn 2 vé → **Mua vé**.

> Người mua thấy rõ luật của sự kiện ngay trên trang: bán lại tối đa 120%, mỗi ví tối đa 2 vé.

**[Thao tác]** Trang thanh toán, chỉ vào danh sách kiểm tra.

> Trước khi bấm thanh toán, hệ thống **kiểm tra sẵn mọi thứ**: ví đã kết nối chưa, có đúng mạng không, còn đủ vé không, ví đã mua bao nhiêu so với giới hạn, số dư có đủ cả tiền vé lẫn phí gas không.

**[Thao tác]** Bấm **Xác nhận & thanh toán** → xác nhận trong MetaMask.

> Nếu MetaMask hỗ trợ gộp giao dịch thì **mua 2 vé chỉ cần ký 1 lần**; nếu không, web tự chuyển sang ký từng vé. Mỗi vé đều có link Etherscan để kiểm chứng.

### 2.4 Rao bán và mua lại, kèm phí bản quyền (50 giây)

**[Thao tác]** Profile B → **Vé của tôi** → mở vé #X → **Tạo mã check-in** → **chụp màn hình mã QR** (dùng cho ca bị từ chối số 3) → đóng hộp thoại → **Rao bán lại**.

> Giả sử bạn B bận đột xuất và muốn bán lại vé. Hộp rao bán ghi rõ: giá gốc 0.01 ETH, **tối đa 0.012 ETH** theo trần 120%, và nếu bán được thì **B nhận 95%**. Em rao đúng 0.012.

**[Thao tác]** Profile C → **Vé bán lại** → **Mua lại**. Dừng ở hộp xác nhận vài giây.

> Phía người mua cũng minh bạch: trả 0.012 ETH, **trong đó 0.0006 ETH là phí bản quyền về ban tổ chức**. Em xác nhận.

**[Thao tác]** Profile A → **Sự kiện của tôi**. Chỉ vào dòng "+ phí bản quyền bán lại: 0.0006 ETH" và mục hoạt động "Vé #X đổi chủ · 0.012 ETH (phí bản quyền 0.0006 ETH)".

> Đây đúng là điều Thảo nói: **lần đầu tiên ban tổ chức nhận được phần từ thị trường bán lại**, và số liệu hiện ngay trên dashboard.

### 2.5 Cấp quyền CTV và check-in bằng điện thoại (50 giây)

**[Thao tác]** Profile A → trang sự kiện → **Quản lý CTV** → dán địa chỉ ví D → **Cấp quyền**.

> Ở cửa, ban tổ chức không cần đưa ví của mình cho người soát vé, chỉ cần **cấp quyền cho ví CTV**. CTV **chỉ check-in được**: không rút được tiền, không tạo được hạng vé, và bị thu hồi là mất quyền ngay.

**[Thao tác]** Profile C → **Vé của tôi** → **Tạo mã check-in** → hướng màn hình về phía điện thoại.

> Mã QR này được **ký bằng ví của chủ vé** và **chỉ có hạn 5 phút**. Chụp lại gửi người khác thì quá 5 phút là vô dụng.

**[Thao tác]** Điện thoại D: mở app camera → quét → link mở trang Check-in (nếu mở bằng Chrome thì bấm "Mở bằng ứng dụng MetaMask") → xác nhận → hiện "✓ đã ghi".

> Chỉ cần quét bằng app camera là trang check-in mở ra với mã đã điền sẵn. Hệ thống kiểm tra trên blockchain rằng **người ký đúng là chủ hiện tại** của vé, vé đúng sự kiện và chưa dùng lần nào, rồi mới ghi check-in.

### 2.6 Rút tiền (10 giây)

**[Thao tác]** Profile A → **Rút tiền** → xác nhận.

> Ban tổ chức rút cả tiền bán vé lẫn phí bản quyền trong một giao dịch.

> 💡 **Nếu Sepolia chậm quá 30 giây:** nói *"Trong lúc chờ khối xác nhận, em chiếu đoạn đã quay sẵn"*, rồi quay lại màn hình thật khi giao dịch xong.

---

## 3. Demo các ca bị từ chối (2 phút)

> Với một hệ thống chống gian lận, phần quan trọng nhất là **lúc nó từ chối đúng**. Em sẽ thử phá luật theo hai cách: trên web, và **gọi thẳng hợp đồng qua Remix**, tức là bỏ qua hoàn toàn giao diện.

**[Slide 10]** Bảng 5 ca. Đánh dấu ✓ từng ca sau khi demo xong.

### Ca 1 — Rao giá vượt trần (30 giây)

**[Thao tác]** Profile B → rao vé còn lại với giá **0.0121** ETH (121%) → web báo "Giá vượt trần 120%".
**[Thao tác]** Remix (ví B) → `listForResale(<id>, 12100000000000000)` → MetaMask báo lỗi **`ResalePriceTooHigh`**.

> Web chặn ngay. Nhưng người rành kỹ thuật có thể bỏ qua web và gọi thẳng hợp đồng. Em làm đúng như vậy trên Remix, và **hợp đồng vẫn từ chối**. Trần giá không phải quy định hiển thị, mà là **luật trên blockchain**.

### Ca 2 — Mua vé thứ 3 khi đã đủ 2 vé (30 giây)

**[Thao tác]** Profile B → trang sự kiện → nút đã đổi thành "Đã mua đủ 2 vé/ví" và bị khoá.
**[Thao tác]** Remix (ví B) → `mintTicket(<tierId>)` kèm value 0.01 ETH → **`WalletLimitReached`**.

> Ví B đã mua đủ 2 vé. Vé B vừa bán lại cho C vẫn được tính, vì **giới hạn tính theo vé mua mới**, nên bán đi rồi cũng không mua thêm được. Gọi thẳng hợp đồng cũng bị từ chối.

### Ca 3 — Quét mã QR của chủ cũ (25 giây) ⚠️ trong vòng 5 phút kể từ bước 2.4

**[Thao tác]** Profile A → **Check-in** → **Tải ảnh mã QR** → chọn ảnh B đã chụp ở bước 2.4 → web báo "Mã QR không do chủ vé hiện tại ký".

> Đây là mánh "bán vé rồi vẫn giữ ảnh QR để vào cửa". Mã do B ký, nhưng vé giờ thuộc về C, nên **mọi mã của chủ cũ mất hiệu lực**.
>
> *(Nếu quá 5 phút, trang báo "Mã QR đã hết hạn". Khi đó nói: "Mã đã hết hạn nên bị chặn ngay ở lớp đầu tiên; kể cả còn hạn thì lớp thứ hai cũng chặn, vì người ký không còn là chủ vé.")*

### Ca 4 — Check-in lần 2 (15 giây)

**[Thao tác]** Điện thoại D → quét lại mã của C → "Vé đã được check-in trước đó".

> Một vé chỉ vào cửa đúng **một lần**.

### Ca 5 — CTV bị thu hồi quyền (20 giây)

**[Thao tác]** Profile A → **Quản lý CTV** → **Thu hồi** ví D. Điện thoại D → quét một vé khác → "Ví này không có quyền soát vé".

> Thu hồi có hiệu lực **ngay lập tức**. Nếu CTV làm sai hoặc nghỉ giữa chừng, ban tổ chức tắt quyền chỉ bằng một nút.

> 💡 **Nếu thiếu thời gian:** demo trực tiếp ca 1 và ca 2 (có Remix), ca 3–5 nói qua bằng slide.

---

## 4. Kiểm thử (30 giây)

**[Slide 15]** Hai khối số lớn: **19** test hợp đồng · **45** bước test giao diện. Bên dưới là ảnh chụp file log.

**[Thao tác]** Mở `evidence/lab-15-v4/ui-e2e-v4-log.txt`, cuộn qua các dòng `PASS`.

> Phần em phụ trách còn có kiểm thử. Ngoài 19 test cho hợp đồng, nhóm **chép đúng bytecode đang chạy trên Sepolia** sang một blockchain chạy trên máy, rồi cho một trình duyệt tự động điều khiển **4 ví giả lập** chạy **45 bước**: tạo sự kiện, mua vé, rao bán, mua lại, check-in, thu hồi quyền, và tất cả các ca bị từ chối mọi người vừa xem. **45 trên 45 đạt.**
>
> Bộ test này còn bắt được **lỗi thật** mà mắt thường khó thấy. Ví dụ:
> - dashboard không cập nhật số vé đã bán khi tab mở sẵn;
> - ví từ chối giao dịch thứ 2 thì bấm lại sẽ tạo **sự kiện trùng**;
> - hộp thoại vé vẫn đè lên trang mới khi bấm nút Back.
>
> Tất cả đã được sửa.

**[Chuyển lời]** "Phần bảo mật của hợp đồng, mời Thảo trình bày."

---

## Câu hỏi Linh trả lời (giao diện, kỹ thuật, kiểm thử)

**Ai trả phí gas?**
Ai thao tác thì người đó trả: ban tổ chức trả khi tạo sự kiện và hạng vé, người mua trả khi mua, CTV trả khi check-in. Ký mã QR và ký lưu thông tin sự kiện thì **miễn phí**, vì đó chỉ là chữ ký, không phải giao dịch. Trên Sepolia, ETH dùng để test nên không mất tiền thật.

**Ảnh và mô tả sự kiện lưu ở đâu? Vercel sập thì sao?**
Ảnh, mô tả và địa điểm lưu trên Vercel Blob để khỏi tốn gas. Muốn sửa phải **ký bằng ví ban tổ chức**, và server kiểm tra chữ ký khớp với ban tổ chức ghi trên hợp đồng. Vercel sập thì chỉ mất phần hiển thị; vé, tiền và check-in vẫn nằm trên blockchain, vẫn thao tác được qua Remix hay Etherscan.

**Không có mạng ở cửa thì check-in thế nào?**
Check-in cần ghi lên blockchain nên cần mạng. Mã QR thì tạo được khi khách có mạng, và có hạn 5 phút. Hướng tiếp theo là cho phép soát vé ngoại tuyến rồi ghi lên chain sau.

**Sao mua nhiều vé có lúc phải ký nhiều lần?**
Hợp đồng v4 mua mỗi lần một vé. Nếu MetaMask đã bật tài khoản thông minh và hỗ trợ gộp giao dịch (chuẩn EIP-5792), web gửi tất cả trong **một lần ký**; nếu không thì quay về ký từng vé. Nhóm chọn sửa ở web thay vì deploy lại hợp đồng.

**Kiểm thử với ví giả lập có đáng tin không?**
Ví giả lập chỉ thay phần bấm xác nhận của MetaMask. Mọi giao dịch vẫn chạy trên **đúng bytecode hợp đồng đang chạy trên Sepolia**, cùng địa chỉ và cùng chainId. Ngoài ra nhóm đã chạy các luồng chính bằng ví thật trên Sepolia, mã giao dịch có trong `docs/PRESENTATION_PLAN.md`.

**Web dùng công nghệ gì?**
HTML, CSS và JavaScript thuần, không cần build; ethers.js để nói chuyện với hợp đồng; thư viện tạo và đọc mã QR; Vercel cho web và API lưu ảnh. Không có khoá bí mật nào nằm trên giao diện.
