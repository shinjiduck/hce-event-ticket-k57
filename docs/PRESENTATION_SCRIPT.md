# KỊCH BẢN THUYẾT TRÌNH — FairTicket

> 📌 **Mỗi người thuyết trình trọn bài — mỗi người một bản đầy đủ** (số liệu thực tế có nguồn, 6 kiểu vé giả, ai được lợi gì, demo, thử phá luật): **[SCRIPT_THAO.md](SCRIPT_THAO.md)** (kể từ số liệu → kinh tế → demo, ví dụ vé BLACKPINK 6,8 triệu) · **[SCRIPT_LINH.md](SCRIPT_LINH.md)** (kể theo "hành trình của một tấm vé", ví dụ vé 2 triệu). File này là bản chia vai 2 người cũ, giữ để tham khảo.

> Bản đầy đủ khoảng **13 phút + hỏi đáp**. Nếu bị giới hạn thời gian, dùng **bản rút gọn 7 phút** ở cuối file.
> Phân vai theo `docs/PROJECT_PLAN.md` (Lab 12–15): **Thảo** nói bài toán, kinh tế, hợp đồng, bảo mật; **Linh** demo giao diện và kiểm thử.
> Chữ thường là lời nói. Dòng bắt đầu bằng **[Thao tác]** là việc làm trên máy. Dòng **[Slide]** là nội dung nên có trên slide.

---

## 0. Chuẩn bị trước buổi (làm trước ít nhất 1 ngày)

### Ví cần có (đều trên Sepolia, mỗi ví ≥ 0.05 ETH test)

| Ký hiệu | Vai | Dùng để |
|---|---|---|
| **A** | Organizer | Tạo sự kiện, cấp quyền CTV, xem dashboard, rút tiền |
| **B** | Người mua 1 | Mua 2 vé, rao bán 1 vé |
| **C** | Người mua 2 | Mua lại vé trên chợ bán lại |
| **D** | CTV soát vé | Quét QR check-in bằng điện thoại |

### Dữ liệu dựng sẵn trên hợp đồng v4 `0x0845…9Fd0`

1. Ví A tạo sẵn sự kiện **"FairTicket Night 2026"**:
   - ngày diễn ra sau buổi thuyết trình, có ảnh bìa;
   - trần giá **120%**, tối đa **2 vé/ví**;
   - hạng Standard **0.01 ETH × 50 vé**.
2. Tạo thêm 1–2 sự kiện khác có ảnh, để trang chủ không trống.
3. Ví B mua sẵn **2 vé**, tức là đã chạm giới hạn ví. Phần demo "mua vé thứ 3 bị chặn" sẽ dùng chính ví này.
4. Ghi lại các mã giao dịch vào mục **Thông tin hợp đồng & Mã giao dịch demo** trong `PRESENTATION_PLAN.md`.

### Tab mở sẵn trên máy chiếu

1. Trang chủ DApp (ví B đang kết nối).
2. Trang sự kiện "FairTicket Night 2026".
3. Remix: đã biên dịch `ProjectCore.sol`, dùng **At Address** trỏ vào `0x0845…9Fd0`. Dùng để gọi thẳng hợp đồng, chứng minh luật nằm trên chain chứ không chỉ ở giao diện.
4. Etherscan của hợp đồng.
5. `evidence/lab-15-v4/ui-e2e-v4-log.txt` và `projectcore-v4-test-log.txt`.

### Phương án dự phòng

Sepolia đôi khi chậm 15–30 giây mỗi khối. Nên **quay sẵn video màn hình** cả luồng demo. Nếu mạng chậm quá 30 giây, nói: *"Trong lúc chờ khối xác nhận, mình chiếu đoạn đã quay sẵn"*, rồi quay lại màn hình thật khi giao dịch xong.

---

## 1. Mở đầu — Bài toán kinh tế (Thảo · 1 phút 30)

**[Slide]** Tiêu đề "FairTicket — Vé công bằng cho những sự kiện đáng nhớ", URL DApp, tên 2 thành viên.

> Xin chào thầy cô và các bạn, nhóm em là Thảo và Linh. Đề tài của nhóm là **vé sự kiện giới hạn bán lại**.
>
> Bắt đầu bằng một tình huống quen thuộc: một concert mở bán lúc 10 giờ, 10 giờ 01 hết vé. Năm phút sau trên mạng có hàng trăm vé bán lại với giá gấp 3, gấp 5 lần. Fan thật không mua được. Ban tổ chức bán đúng giá niêm yết, còn phần chênh lệch thì rơi vào túi người đầu cơ.

**[Slide]** 3 vấn đề, mỗi vấn đề một biểu tượng.

> Thị trường vé đang có 3 vấn đề:
>
> 1. **Vé giả và vé dùng nhiều lần.** Người mua lại không có cách nào biết tấm vé mình nhận là thật, hay đã có người khác dùng.
> 2. **Đầu cơ.** Vé là hàng có nguồn cung cố định và cầu dồn vào một thời điểm. Ai gom được nhiều vé lúc mở bán sẽ có quyền định giá trên thị trường thứ cấp. Về kinh tế, **thặng dư bị chuyển từ người hâm mộ và ban tổ chức sang người đầu cơ**, dù người đầu cơ không tạo thêm giá trị nào.
> 3. **Bất cân xứng thông tin.** Người bán biết vé thật hay giả, đã dùng hay chưa; người mua thì không. Đây đúng là thị trường "quả chanh" (*market for lemons*): người mua sợ bị lừa nên trả giá thấp đi hoặc không dám mua lại, kể cả với người bán lại trung thực.
>
> FairTicket giải quyết bằng cách **ghi quyền sở hữu vé lên blockchain** và **đặt luật kinh tế ngay trong hợp đồng thông minh**. Không ai, kể cả nhóm làm web, sửa được các luật này.

---

## 2. Thiết kế kinh tế (Thảo · 2 phút 30)

### 2.1 Dòng tiền

**[Slide]** Sơ đồ 2 luồng tiền.

```
Mua lần đầu:  Người mua --giá vé--> Hợp đồng --(ghi nợ)--> Ban tổ chức tự rút
Bán lại:      Người mua lại --giá bán lại--> Hợp đồng --95%--> Người bán
                                                       --5%--> Ban tổ chức (phí bản quyền)
```

> Khi mua vé, tiền và vé đổi chủ **trong cùng một giao dịch**. Hoặc cả hai cùng xảy ra, hoặc không gì xảy ra, nên không có chuyện chuyển tiền mà không nhận được vé.
>
> Tiền không chuyển thẳng cho ai. Hợp đồng ghi lại số tiền mỗi người được nhận, và người đó tự bấm rút. Cách này gọi là **pull-payment**; phần bảo mật sẽ giải thích vì sao nó chống được tấn công.
>
> Mỗi lần vé được bán lại, **5% giá bán là phí bản quyền cho ban tổ chức**, 95% về người bán. Nền tảng FairTicket không thu phí.

### 2.2 Bốn luật chống đầu cơ, đều nằm trong hợp đồng

**[Slide]** Bảng 4 luật.

| Luật | Ai đặt | Hợp đồng làm gì |
|---|---|---|
| **Trần giá bán lại** | Ban tổ chức chọn khi tạo sự kiện, từ 100% đến 200% (mặc định 110%) | Từ chối mọi giá rao vượt trần (`ResalePriceTooHigh`) |
| **Số vé tối đa mỗi ví** | Ban tổ chức chọn, 0 nghĩa là không giới hạn | Từ chối mua mới quá giới hạn (`WalletLimitReached`) |
| **Ngừng bán vé mới khi sự kiện bắt đầu** | Cố định | `EventAlreadyStarted` |
| **Phí bản quyền 5%** | Cố định | Tự chia tiền mỗi lần bán lại |

> Trần giá và giới hạn ví **ghi vĩnh viễn khi tạo sự kiện**. Ban tổ chức cũng không sửa được sau đó, nên người mua biết trước luật chơi.

### 2.3 Vì sao các con số này làm đầu cơ không còn đáng làm

**[Slide]** Bảng dưới đây, tô đậm dòng 110% và 120%.

> Đây là phần nhóm em muốn nhấn mạnh nhất. Giả sử vé giá gốc 0.01 ETH, và người đầu cơ bán lại đúng bằng trần. Sau khi trừ 5% phí bản quyền, họ nhận về:

| Trần giá | Giá bán tối đa | Người bán thực nhận (95%) | Lời/lỗ so với giá gốc |
|---|---|---|---|
| 100% | 0.0100 ETH | 0.00950 ETH | **−5%** (lỗ) |
| 105% | 0.0105 ETH | 0.009975 ETH | −0.25% (hòa vốn ở khoảng 105,3%) |
| **110%** (mặc định) | 0.0110 ETH | 0.01045 ETH | **+4.5%** |
| **120%** | 0.0120 ETH | 0.01140 ETH | **+14%** |
| 150% | 0.0150 ETH | 0.01425 ETH | +42.5% |
| 200% | 0.0200 ETH | 0.01900 ETH | +90% |

> Ở mức trần mặc định 110%, người đầu cơ lời tối đa **4.5% mỗi vé, chưa trừ phí gas**. Nếu sự kiện giới hạn 2 vé/ví thì mỗi ví lời tối đa khoảng 0.0009 ETH, trong khi phải trả gas cho cả lúc mua lẫn lúc rao bán. **Lợi nhuận kỳ vọng gần bằng 0**, nên không còn động cơ gom vé.
>
> Với người mua vé thật nhưng bận không đi được, bán lại ở mức 105% thì gần như hòa vốn. Nhờ vậy **thị trường thứ cấp vẫn hoạt động** cho nhu cầu thật, chỉ có hành vi đầu cơ bị loại.
>
> Còn ban tổ chức có thêm nguồn thu từ mỗi lần vé đổi chủ. Ví dụ 100 vé giá 0.01 ETH, có 30 vé được bán lại ở mức 0.011 ETH: ban tổ chức nhận thêm 30 × 0.00055 = **0.0165 ETH**, ngoài 1 ETH bán lần đầu. Ban tổ chức **hưởng lợi từ thị trường thứ cấp** thay vì để người đầu cơ hưởng hết.

### 2.4 Vì sao để ban tổ chức tự chọn trần, mà không bỏ hẳn trần

> Trong quá trình làm, nhóm từng đề xuất bỏ trần giá, vì đã có giới hạn số vé mỗi ví. Sau khi phản biện, nhóm giữ trần, vì **một người có thể tạo nhiều ví** (tấn công Sybil). Giới hạn ví chỉ làm việc gom vé tốn công hơn; trần giá mới là thứ chặn được lợi nhuận.
>
> Nhóm cũng không cố định trần ở 110%, vì mỗi loại sự kiện có độ "nóng" khác nhau. Hội thảo học thuật có thể đặt 100% để không ai lời được. Concert lớn có thể đặt 110–120% để người bận việc dễ bán lại. **Quyền chọn thuộc về ban tổ chức, quyền thực thi thuộc về hợp đồng.**

---

## 3. Demo luồng thành công (Linh · 3 phút 30)

> Giờ em demo trực tiếp trên DApp đã deploy công khai ở Vercel, kết nối hợp đồng thật trên mạng thử nghiệm Sepolia.

### 3.1 Trang chủ (20 giây)

**[Thao tác]** Mở trang chủ.

> Hero ở trang chủ có một **thẻ vé nổi**: đó là sự kiện sắp diễn ra gần nhất, lấy thẳng từ blockchain. Bên dưới là **số liệu thật đọc từ hợp đồng**: số sự kiện, số vé đã phát hành. Nhóm không đặt con số nào bằng tay.

### 3.2 Tạo sự kiện (40 giây)

**[Thao tác]** Ví A → **Tạo sự kiện**. Điền tên, chọn danh mục, chọn ngày, chọn ảnh. Chỉ vào thẻ xem trước bên phải đang đổi theo khi gõ.

> Bước 2 là phần kinh tế. Ban tổ chức chọn **trần giá bán lại**, ví dụ 120%, và **số vé tối đa mỗi ví**, ví dụ 2. Khung bên phải tự tính luôn: giá bán lại tối đa 0.012 ETH, phí bản quyền 5%, doanh thu nếu bán hết.

**[Thao tác]** Sang bước 3 "Xem lại". Có 2 cách tuỳ thời gian:
- **Ít thời gian:** dừng ở đây và chuyển sang sự kiện "FairTicket Night 2026" đã tạo sẵn.
- **Còn dư thời gian:** bấm Deploy, gồm 2 giao dịch và 1 chữ ký miễn phí.

> Web cũng chặn sớm các lỗi nhập: giờ bắt đầu đã qua, số vé lẻ, giá sai định dạng. Nếu ví từ chối giao dịch thứ 2, bấm Deploy lại sẽ **dùng lại sự kiện vừa tạo**, không tạo trùng.

### 3.3 Mua vé (40 giây)

**[Thao tác]** Ví C → trang sự kiện. Chỉ dòng "Mỗi ví được mua mới tối đa 2 vé". Chọn 2 vé → **Mua vé**.

> Trang thanh toán **kiểm tra trước mọi thứ** trước khi người dùng bấm: đúng mạng chưa, còn đủ vé không, ví đã mua bao nhiêu trên giới hạn, số dư có đủ cả tiền vé lẫn gas không.
>
> Nếu MetaMask hỗ trợ gộp giao dịch, **mua 2 vé chỉ cần ký 1 lần**. Nếu không, web tự quay về ký từng vé.

**[Thao tác]** Thanh toán, chỉ vào danh sách theo dõi từng vé và link Etherscan.

### 3.4 Rao bán và mua lại, kèm phí bản quyền (50 giây)

**[Thao tác]** Ví B → **Vé của tôi** → mở vé #X → **Tạo mã check-in**, rồi chụp màn hình mã QR lại (dùng cho ca bị từ chối số 3). Đóng hộp thoại → **Rao bán lại** vé #X.

> Hộp rao bán ghi rõ giá gốc 0.01 ETH, tối đa 0.012 ETH theo trần 120%, và nếu bán được thì người bán nhận 95%. Em rao đúng 0.012.

**[Thao tác]** Ví C → **Vé bán lại** → **Mua lại**.

> Hộp xác nhận của người mua cũng ghi rõ: trả 0.012 ETH, **trong đó 0.0006 ETH là phí bản quyền về ban tổ chức**. Minh bạch với cả hai bên.

**[Thao tác]** Ví A → **Sự kiện của tôi** (dashboard). Chỉ vào ba chỗ: dòng "+ phí bản quyền bán lại", mục hoạt động "Vé #X đổi chủ · 0.012 ETH (phí bản quyền 0.0006 ETH)", và ô "Tiền chờ rút".

### 3.5 Check-in bằng CTV (50 giây)

**[Thao tác]** Ví A → trang sự kiện → **Quản lý CTV** → dán địa chỉ ví D → **Cấp quyền**.

> Ban tổ chức không cần đưa ví của mình cho người soát vé ở cửa. Chỉ cần cấp quyền cho ví CTV. **CTV chỉ check-in được**: không rút được tiền, không tạo được hạng vé, và bị thu hồi quyền là mất hiệu lực ngay.

**[Thao tác]** Ví C (chủ vé mới) → **Vé của tôi** → **Tạo mã check-in**. Đưa màn hình ra.

> Mã QR này được **ký bằng ví của chủ vé** và **hết hạn sau 5 phút**. Chụp màn hình gửi cho người khác thì quá 5 phút là vô dụng.

**[Thao tác]** Điện thoại của ví D: dùng app camera quét QR. Link mở trang Check-in với mã đã điền sẵn → xác nhận → hiện "✓ đã ghi".

> Trước khi gửi giao dịch, hệ thống kiểm tra trên chain rằng người ký mã đúng là **chủ hiện tại** của vé, vé thuộc đúng sự kiện và chưa check-in lần nào.

### 3.6 Rút tiền (10 giây)

**[Thao tác]** Ví A → **Rút tiền** → xác nhận.

> Ban tổ chức rút cả tiền bán lần đầu lẫn phí bản quyền trong một giao dịch.

---

## 4. Demo các ca bị từ chối (Linh làm, Thảo giải thích · 2 phút)

> Phần quan trọng nhất của một hệ thống chống gian lận không phải lúc nó chạy đúng, mà là **lúc nó từ chối đúng**. Nhóm em sẽ thử phá luật ở cả trên web lẫn bằng cách **gọi thẳng hợp đồng qua Remix**, tức là bỏ qua hoàn toàn giao diện.

| # | Thử phá luật | Trên web | Gọi thẳng hợp đồng (Remix) | Lời giải thích |
|---|---|---|---|---|
| 1 | Ví B rao vé giá **0.0121 ETH** (121%) | Báo ngay "Giá vượt trần 120%" | `listForResale(id, 12100000000000000)` → **`ResalePriceTooHigh`** | "Trần giá không phải quy định hiển thị, mà là luật trên hợp đồng." |
| 2 | Ví B (đã có 2 vé) mua **vé thứ 3** | Nút đổi thành "Đã mua đủ 2 vé/ví" và bị khoá | `mintTicket(tierId)` kèm 0.01 ETH → **`WalletLimitReached`** | "Kể cả người rành kỹ thuật cũng không lách được bằng cách bỏ qua web." |
| 3 | Ví A mở **Check-in**, quét **ảnh QR ví B chụp ở bước 3.4** (trước khi bán vé cho C) | "Mã QR không do chủ vé hiện tại ký" | — | "Vé đã đổi chủ thì mọi mã của chủ cũ mất hiệu lực, chống đúng bài bán vé rồi vẫn cầm ảnh QR đi vào." |
| 4 | Quét lại mã của C sau khi đã check-in | "Vé đã được check-in trước đó" | `checkIn(eventId, id)` → **`TicketAlreadyCheckedIn`** | "Một vé chỉ vào cửa đúng một lần." |
| 5 | Ví A **thu hồi quyền** CTV D, rồi D quét vé khác | "Ví này không có quyền soát vé" | → **`NotCheckInAuthorized`** | "Thu hồi có hiệu lực ngay, không cần đợi gì." |

**[Thao tác]** Nếu thời gian ít, làm trực tiếp ca 1 và ca 2 (có Remix), các ca còn lại nói qua bằng slide.

> ⚠️ **Ca 3 phải làm trong vòng 5 phút** kể từ lúc ví B tạo mã ở bước 3.4. Web kiểm tra hạn của mã **trước** khi kiểm tra chủ vé. Quá 5 phút thì trang báo "Mã QR đã hết hạn": vẫn là bị từ chối, nhưng không minh họa được ý "chủ cũ". Nếu lỡ quá giờ, nói: *"Mã đã hết hạn nên bị chặn ngay ở lớp đầu tiên; kể cả còn hạn thì lớp thứ hai cũng chặn, vì người ký không còn là chủ vé."* Nếu thời gian sát, có thể làm ca 3 ngay sau khi C mua lại ở bước 3.4.

---

## 5. Bảo mật và kiểm thử (Thảo · 1 phút 30)

**[Slide]** Ba cột: Tấn công · Cách chặn · Bằng chứng.

> **Reentrancy.** Đây là kiểu tấn công kinh điển: hợp đồng gửi tiền trước, cập nhật số dư sau, nên kẻ tấn công gọi rút tiền lặp đi lặp lại. Ở Lab 13, nhóm viết hợp đồng tấn công thật để thử. FairTicket chặn bằng hai lớp: **pull-payment** (người nhận tự rút) và thứ tự **Checks → Effects → Interactions**: số dư được đưa về 0 *trước khi* gửi tiền. Hợp đồng tấn công thất bại; bằng chứng ở `evidence/lab-13/` và được chạy lại cho bản v4.
>
> **Kiểm thử.** Hợp đồng v4 có **19 ca test Hardhat**, gồm cả ca làm tròn phí bản quyền: giá 1099 wei thì phí là 54 wei, người bán nhận 1045 wei, tổng khớp đúng, không mất wei nào.
>
> Ngoài ra, nhóm **chép đúng bytecode đang chạy trên Sepolia** sang một chain cục bộ để chạy **55 bước test giao diện tự động** với 4 ví giả lập. Bài test này còn bắt được một số lỗi thật, ví dụ dashboard không cập nhật số vé đã bán, hoặc tạo sự kiện bị trùng khi ví từ chối giao dịch thứ 2. Tất cả đã sửa.
>
> **Audit.** Nhóm có audit chéo ở Lab 14 và một lần rà lại toàn bộ trước khi nộp. Kết luận: không có lỗi làm mất tiền hay mất vé.

---

## 6. Giới hạn và hướng phát triển (cả 2 · 1 phút)

> Nhóm muốn nói thẳng những gì hệ thống **chưa làm được**:

**[Slide]** 5 giới hạn và hướng xử lý tương ứng.

| Giới hạn | Hệ quả | Hướng tiếp theo |
|---|---|---|
| Giới hạn vé tính **theo ví, không theo người** | Một người nhiều ví vẫn gom được, chỉ tốn công hơn | Định danh một người một ví (proof of personhood, KYC nhẹ) |
| **Chưa có hạn bán lại (R7)** | Gọi thẳng hợp đồng vẫn mua lại được vé của sự kiện đã diễn ra. Web đã ẩn nút mua | Chặn bán lại từ giờ bắt đầu ngay trong hợp đồng |
| **Chữ ký QR chỉ được kiểm tra trên web** | Ban tổ chức hoặc CTV có thể check-in bất kỳ vé nào mà không cần khách có mặt. Đây là giả định "ban tổ chức đáng tin" | Đưa việc kiểm tra chữ ký vào hợp đồng |
| **Thỏa thuận ngoài chuỗi**: người mua trả thêm tiền mặt, rồi người bán rao đúng giá trần | Không chặn tuyệt đối được. Nhưng tin rao là công khai, ai cũng mua trước được, nên kiểu thỏa thuận này rủi ro cho chính hai bên | Rao bán riêng cho một ví chỉ định, có giới hạn |
| Ảnh và mô tả lưu ngoài chuỗi (Vercel) | Mất dịch vụ thì mất phần trang trí, **không ảnh hưởng vé và tiền** | Lưu trên IPFS |

> Hợp đồng không có hàm chuyển vé tự do, nên **mọi lần đổi chủ đều phải qua chợ bán lại có trần giá**. Đây là lý do nhóm cố ý không dùng chuẩn ERC-721, vì chuẩn đó luôn có hàm `transferFrom`.

---

## 7. Kết (Thảo · 20 giây)

> Tóm lại, FairTicket không cấm bán lại. Nó **làm cho việc đầu cơ không còn lời**, giữ thị trường thứ cấp cho người có nhu cầu thật, và chia một phần lợi ích của thị trường đó về cho ban tổ chức. Mọi luật đều nằm trong hợp đồng và ai cũng kiểm chứng được trên Etherscan.
>
> Cảm ơn thầy cô và các bạn đã lắng nghe, nhóm em sẵn sàng nhận câu hỏi.

---

## 8. Câu hỏi dự kiến và gợi ý trả lời

**H1. Sao không cấm bán lại hẳn cho đơn giản?**
Cấm hẳn thì người mua thật mà bận không đi được sẽ mất trắng tiền, và chợ đen ngoài chuỗi sẽ mọc lên, nơi không có trần giá, không xác minh được vé. Cho bán lại có trần thì nhu cầu thật vẫn được đáp ứng mà đầu cơ không có lời.

**H2. Sao phí bản quyền là 5%?**
Đủ để mức hòa vốn khi bán lại rơi vào khoảng 105%, nên với trần mặc định 110% người đầu cơ gần như không lời. Đồng thời mức này vẫn đủ thấp để người bán lại vì lý do thật không bị thiệt nhiều. 5% là hằng số trong hợp đồng; muốn cho ban tổ chức tự chọn thì phải deploy phiên bản mới.

**H3. Một người tạo 100 ví thì sao?**
Họ phải nạp ETH và trả gas cho từng ví, rồi vẫn bị trần giá giới hạn lợi nhuận. Ở trần 110% thì lời 4.5% mỗi vé trước gas, nhân lên 100 ví vẫn rất nhỏ. Giới hạn ví làm việc gom vé tốn công hơn; **trần giá mới là lớp chặn chính**. Muốn chặn tuyệt đối thì cần định danh người dùng, đã ghi ở hướng phát triển.

**H4. Ban tổ chức có gian lận được không?**
Không đổi được giá hay tổng số vé sau khi tạo, không chuyển vé của người khác, không đặt lại trạng thái "chưa check-in", không sửa trần giá hay giới hạn ví. Ban tổ chức **có thể** check-in vé của người khác mà không cần họ có mặt, vì nhóm coi ban tổ chức là bên đáng tin. Đây là giới hạn đã nêu ở phần 6.

**H5. Sao không dùng NFT chuẩn ERC-721?**
ERC-721 bắt buộc phải có `transferFrom`, tức là chuyển vé tự do. Khi đó người bán nhận tiền ngoài chuỗi rồi chuyển thẳng vé, bỏ qua trần giá. Vé của FairTicket chỉ đổi chủ qua `buyResaleTicket` có kiểm tra trần.

**H6. Ai trả phí gas?**
Người thực hiện thao tác trả: ban tổ chức trả khi tạo sự kiện và hạng vé, người mua trả khi mua, CTV trả khi check-in. Ký mã QR và ký metadata thì miễn phí vì không phải giao dịch. Trên Sepolia, ETH dùng để test nên miễn phí.

**H7. Có hoàn tiền không?**
Chưa có. Muốn lấy lại tiền thì người mua rao bán lại trên chợ (tối đa bằng trần). Hoàn tiền khi sự kiện bị huỷ là hướng phát triển tiếp theo.

**H8. Nếu Vercel sập thì sao?**
Chỉ mất ảnh, mô tả và địa điểm hiển thị. Vé, quyền sở hữu, tiền và check-in đều nằm trên blockchain. Có thể tương tác trực tiếp với hợp đồng qua Remix hoặc Etherscan.

**H9. AI giúp được gì trong dự án?**
AI hỗ trợ viết code, viết test và phản biện thiết kế. Ví dụ ở v4, AI phản biện đề xuất bỏ trần giá của nhóm. Các quyết định thiết kế kinh tế do nhóm chọn: trần do ban tổ chức đặt, giới hạn ví, chỉ chặn mua mới sau giờ bắt đầu. Toàn bộ được ghi lại trong `docs/AI_JOURNAL.md`, có mục riêng "Phần do nhóm tự quyết định".

---

## 9. Bản rút gọn 7 phút

| Thời lượng | Phần | Người nói | Giữ lại |
|---|---|---|---|
| 1 phút | Bài toán | Thảo | Tình huống concert + 3 vấn đề (bỏ "market for lemons" nếu gấp) |
| 1 phút 30 | Kinh tế | Thảo | Dòng tiền 95/5 + **bảng lời/lỗ theo trần** (chỉ đọc dòng 100%, 110%, 120%) |
| 2 phút 30 | Demo thành công | Linh | Trang sự kiện có sẵn → mua → rao bán → mua lại có phí 5% → dashboard → quét QR check-in |
| 1 phút | Demo từ chối | Linh + Thảo | Ca 1 (vượt trần, có Remix) + ca 2 (vé thứ 3) |
| 1 phút | Bảo mật + giới hạn + kết | Thảo | Reentrancy, 19 + 45 test, 2 giới hạn chính (nhiều ví, R7), câu kết |

---

## 10. Checklist ngay trước giờ trình bày

- [ ] Cả 4 ví đều ở mạng Sepolia và có đủ ETH test.
- [ ] Sự kiện demo **chưa diễn ra** (đã qua giờ bắt đầu thì không mua được vé mới).
- [ ] Ví B đã có đúng 2 vé (ảnh QR cho ca 3 sẽ chụp ngay trong lúc demo ở bước 3.4).
- [ ] Remix đã trỏ "At Address" tới `0x0845EEB1Ed93C373173680a859fB255f168b9Fd0`.
- [ ] Đã quay sẵn video dự phòng.
- [ ] Đã bấm Ctrl+F5 để trình duyệt tải bản web mới nhất.
- [ ] Điện thoại của ví D: đã thử quét QR bằng app camera ít nhất 1 lần.
- [ ] Chạy thử toàn bộ kịch bản theo đồng hồ bấm giờ ít nhất 1 lần.
