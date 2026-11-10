# KỊCH BẢN THUYẾT TRÌNH ĐẦY ĐỦ — BẢN CỦA THẢO

> **Người nói:** Nguyễn Hoàng Thảo — **thuyết trình một mình toàn bộ bài** (khoảng 13 phút + hỏi đáp).
> **Cách kể:** đi từ **số liệu thực tế → bài toán kinh tế → luật của FairTicket → demo chứng minh → bảo mật**. Ví dụ chính là concert BLACKPINK (vé 6,8 triệu). Bản của Linh ([SCRIPT_LINH.md](SCRIPT_LINH.md)) kể theo kiểu "hành trình của một tấm vé" với ví dụ khác, để hai bài không trùng nhau.
> Chữ thường là lời nói. **[Slide]** là nội dung trên màn chiếu. **[Thao tác]** là việc làm trên máy.
> Mọi số liệu đều có nguồn ở **mục cuối**. Giảng viên hỏi "số này ở đâu ra" thì đọc nguồn.

| # | Phần | Thời lượng |
|---|---|---|
| 1 | Mở đầu, số liệu, 6 kiểu lừa đảo | 2 phút |
| 2 | Bài toán kinh tế: ai được gì, luật của FairTicket, bảng lời/lỗ | 3 phút |
| 3 | Demo trên DApp | 3 phút 30 |
| 4 | Thử phá luật | 1 phút 30 |
| 5 | Bảo mật và kiểm thử | 1 phút 15 |
| 6 | Giới hạn và kết | 1 phút |

**Chuẩn bị trước buổi:** giống mục "Chuẩn bị trước buổi" trong [SCRIPT_LINH.md](SCRIPT_LINH.md):
- 4 ví A/B/C/D trên Sepolia;
- sự kiện "FairTicket Night 2026" (trần 120%, 2 vé/ví) và ví B đã mua sẵn 2 vé;
- Remix đã trỏ **At Address** tới hợp đồng;
- video demo quay sẵn để dự phòng.

---

## 1. Mở đầu: vé sự kiện đang có vấn đề gì (2 phút)

### 1.1 Câu mở (20 giây)

**[Slide 1]** Tên đề tài "FairTicket — vé sự kiện chống vé giả, hạn chế đầu cơ", URL DApp, tên 2 thành viên.

> Em chào thầy cô và các bạn. Nhóm em gồm em là Thảo và bạn Linh. Đề tài của nhóm là **vé sự kiện giới hạn bán lại**: một nền tảng bán vé trên blockchain, chống vé giả và làm cho việc đầu cơ vé không còn lời.
>
> Trước khi vào sản phẩm, em xin đưa ra vài con số để thấy vấn đề này lớn như thế nào.

### 1.2 Số liệu thực tế (50 giây)

**[Slide 2]** Ba khung số lớn. Mỗi khung ghi nguồn nhỏ ở góc.

| Con số | Ý nghĩa |
|---|---|
| **£9,79 triệu** · **9.826** vụ | Thiệt hại vì lừa đảo vé được báo cáo ở Anh năm 2024, tăng 47% so với 2023. **38%** số vụ liên quan vé concert |
| **≈ 3.000** nạn nhân · **> £1 triệu** | Ước tính chỉ riêng lừa đảo vé tour Taylor Swift tại Anh. Trung bình mỗi người mất **£332**; hơn **90%** vụ bắt đầu từ quảng cáo hoặc bài đăng giả trên Facebook |
| **246.407 vé** · **2.594** sự kiện | Số vé mà **chỉ 5** đầu mối bán lại gom được, theo đơn kiện của Ủy ban Thương mại Liên bang Mỹ (FTC) với Ticketmaster tháng 9/2025. FTC cáo buộc họ dùng nhiều tài khoản để vượt giới hạn mua |

> Ở Anh năm 2024, người dân báo cáo gần **9.800 vụ lừa đảo vé**, mất gần **10 triệu bảng**, và cứ 10 vụ thì gần 4 vụ là vé concert. Riêng tour Taylor Swift, ngân hàng Lloyds ước tính khoảng **3.000 người bị lừa**, trung bình mỗi người mất hơn 300 bảng.
>
> Còn ở Mỹ, đơn kiện của FTC cho thấy chỉ **5 đầu mối** đã gom được gần **250 nghìn vé**, bằng cách dùng nhiều tài khoản để lách giới hạn số vé mỗi người. Hãy nhớ chi tiết "dùng nhiều tài khoản để lách giới hạn" này, vì lát nữa nó giải thích một lựa chọn thiết kế quan trọng của nhóm.

**[Slide 3]** Ảnh chụp 2–3 tiêu đề báo Việt Nam (VnExpress, Znews, Nhân Dân).

> Ở Việt Nam cũng không khác:
> - Concert BLACKPINK ở Hà Nội năm 2023: vé hạng Cat1 ban tổ chức bán **6,8 triệu đồng**, trên chợ đen ghế đẹp được rao tới **10 triệu**.
> - Với concert "Anh trai vượt ngàn chông gai", một fanpage xác nhận **144 vé bị lừa, khoảng 300 triệu đồng**.
> - Tại Hà Nội, một nhóm người chuyển **hơn 50 triệu đồng** cho đối tượng tự xưng là người trong ban tổ chức. Công an quận Hai Bà Trưng đã vào cuộc.

### 1.3 Danh sách các kiểu vé giả và lừa đảo (50 giây)

**[Slide 4]** Bảng 6 kiểu lừa đảo. Cột cuối để trống, lát nữa quay lại điền.

| # | Kiểu lừa đảo | Diễn ra thế nào |
|---|---|---|
| 1 | **Vé giả** | Ảnh vé hoặc mã vé bị làm giả hay chỉnh sửa; đến cửa mới biết |
| 2 | **Một vé bán cho nhiều người** | Chụp màn hình mã QR rồi bán cho 5 người; người đến cửa trước thì vào được |
| 3 | **Vé đã dùng hoặc đã bị huỷ** | Bán lại vé đã check-in, hoặc vé đã bị hoàn hay huỷ |
| 4 | **Giả danh ban tổ chức / admin hội nhóm** | "Em làm trong BTC, chuyển khoản trước em gửi vé sau", rồi biến mất (vụ 50 triệu, vụ 144 vé) |
| 5 | **"Pass vé bán lỗ"** | Đăng bán rẻ hơn giá gốc để dụ người mua chuyển khoản nhanh |
| 6 | **Gom vé rồi thổi giá** | Dùng nhiều tài khoản hoặc bot mua sạch vé lúc mở bán, rồi bán lại gấp nhiều lần |

> Có thể gom các kiểu lừa đảo này thành **sáu kiểu**. Năm kiểu đầu là **lừa đảo**: người mua mất tiền mà không có vé thật. Kiểu thứ sáu là **đầu cơ**: không phạm luật, nhưng thặng dư bị chuyển sang tay người không tạo ra giá trị.
>
> Điểm chung của tất cả là **người mua không có cách nào tự kiểm tra**: vé này có thật không, ai đang giữ nó, đã dùng chưa, và tiền mình chuyển có chắc đổi được vé không.

---

## 2. Bài toán kinh tế (3 phút)

### 2.1 Mỗi bên được gì, mất gì trong thị trường vé hiện nay (50 giây)

**[Slide 5]** Sơ đồ 4 bên: Ban tổ chức · Fan · Phe vé · Nền tảng bán vé. Mũi tên tiền đi về đâu.

> Lấy chính ví dụ BLACKPINK: vé 6,8 triệu bán lại 10 triệu. Khoản chênh **3,2 triệu đồng mỗi vé** đi về đâu?
> - **Ban tổ chức** bỏ tiền thuê nghệ sĩ, thuê sân, chịu rủi ro, nhưng chỉ thu đúng 6,8 triệu. Phần chênh trên thị trường thứ cấp, ban tổ chức **không nhận được đồng nào**.
> - **Fan** trả thêm 3,2 triệu, hoặc không mua được.
> - **Phe vé** nhận 3,2 triệu, gần 47% lợi nhuận, mà không tạo ra giá trị gì cho buổi diễn.
>
> Về mặt kinh tế, **thặng dư bị chuyển từ người tiêu dùng và nhà sản xuất sang người trung gian đầu cơ**.
>
> Nhưng đầu cơ cũng không phải lúc nào cũng thắng. Cũng ở concert đó, báo chí ghi nhận các hạng VIP và Platinum khó bán, phe vé phải **bán lỗ 40–50%**. Đầu cơ vé là một canh bạc: lãi có thể lớn, lỗ cũng có thể lớn. Nhóm em tận dụng chính đặc điểm này.

### 2.2 FairTicket thay đổi luật chơi thế nào (40 giây)

**[Slide 6]** Dòng tiền của FairTicket.

```
Mua lần đầu:  Fan --giá vé--> Hợp đồng --> Ban tổ chức (tự rút)
Bán lại:      Người mua lại --giá bán lại--> Hợp đồng --95%--> Người bán
                                                       --5%--> Ban tổ chức (phí bản quyền)
```

> Trên FairTicket có ba luật, đều nằm trong hợp đồng thông minh, không ai sửa được kể cả nhóm em:
> 1. **Trần giá bán lại**: ban tổ chức chọn từ 100% đến 200% giá gốc khi tạo sự kiện, mặc định 110%.
> 2. **Số vé tối đa mỗi ví**: ví dụ mỗi ví chỉ được mua 2 vé.
> 3. **Phí bản quyền 5%**: mỗi lần vé đổi chủ, 5% về ban tổ chức, 95% về người bán. Nền tảng không lấy phí.
>
> Thêm nữa, tiền và vé đổi chủ **trong cùng một giao dịch**: hoặc cả hai cùng xảy ra, hoặc không gì xảy ra. Người mua không cần tin người bán, vì không có bước "chuyển khoản trước rồi chờ gửi vé".

### 2.3 Phe vé còn lời bao nhiêu? (50 giây)

**[Slide 7]** Bảng lời/lỗ, tô đậm dòng 110%.

> Lấy lại vé 6,8 triệu. Nếu bán lại đúng bằng mức trần, sau khi trừ 5% phí bản quyền, người bán nhận về:

| Trần giá | Bán lại tối đa | Người bán thực nhận (95%) | Lời/lỗ của người bán | Ban tổ chức nhận thêm |
|---|---|---|---|---|
| *Chợ đen hiện nay* | *10.000.000đ* | *10.000.000đ* | ***+3.200.000đ (+47%)*** | ***0đ*** |
| 100% | 6.800.000đ | 6.460.000đ | **−340.000đ (−5%)** | 340.000đ |
| **110% (mặc định)** | **7.480.000đ** | **7.106.000đ** | **+306.000đ (+4,5%)** | **374.000đ** |
| 120% | 8.160.000đ | 7.752.000đ | +952.000đ (+14%) | 408.000đ |
| 200% | 13.600.000đ | 12.920.000đ | +6.120.000đ (+90%) | 680.000đ |

> Ở mức mặc định 110%, phe vé lời tối đa **4,5%, chưa trừ phí giao dịch**, thay vì 47% như chợ đen. Còn ban tổ chức, từ chỗ **0 đồng**, nay nhận thêm **374 nghìn mỗi lần vé đổi chủ**.
>
> Quan trọng hơn là **cấu trúc rủi ro**. Trước đây phe vé cược: lãi tối đa 47% hoặc hơn, lỗ có thể 50%. Trên FairTicket, **lãi bị chặn ở 4,5%**, còn **lỗ vẫn có thể tới 100%** nếu không bán được. Khi lãi bị chặn còn lỗ không bị chặn, **kỳ vọng lợi nhuận của việc đầu cơ là âm**, nên người lý trí sẽ không gom vé nữa.
>
> Còn người mua thật nhưng bận đột xuất? Bán lại ở khoảng **105%** là gần hòa vốn. Nhờ vậy thị trường thứ cấp vẫn phục vụ nhu cầu thật, chỉ có hành vi đầu cơ bị loại bỏ.

### 2.4 Vì sao ban tổ chức muốn dùng, và vì sao lại thiết kế như vậy (40 giây)

**[Slide 8]** Bốn bên, mỗi bên một dòng "được gì".

| Bên | Được gì khi dùng FairTicket |
|---|---|
| **Ban tổ chức** | 5% mỗi lần vé đổi chủ (trước đây 0đ); không có vé giả nên bớt khiếu nại; tự đặt luật cho từng sự kiện; cấp quyền soát vé cho CTV mà không phải đưa ví của mình |
| **Fan** | Mua đúng giá, kiểm chứng được vé thật, tiền và vé đổi chủ cùng lúc, bán lại được nếu bận |
| **Phe vé** | Không còn lời đáng kể, nên không còn động cơ |
| **Nền tảng** | Không thu phí. Uy tín đến từ luật minh bạch, ai cũng kiểm tra được trên Etherscan |

> Vậy vì sao ban tổ chức muốn dùng? Vì đây là lần đầu họ **được chia phần từ thị trường bán lại**, thay vì nhìn phe vé hưởng hết.
>
> Có hai câu hỏi thiết kế mà nhóm đã tranh luận:
>
> **Một: đã giới hạn số vé mỗi ví rồi, sao còn cần trần giá?** Ban đầu nhóm cũng định bỏ trần. Nhưng như vụ FTC lúc nãy, 5 đầu mối dùng **nhiều tài khoản** gom được 246 nghìn vé. Trên blockchain, tạo ví mới còn dễ hơn tạo tài khoản. Vì vậy giới hạn ví chỉ làm việc gom vé **tốn công hơn**; **trần giá mới là thứ chặn lợi nhuận**. Nhóm giữ cả hai.
>
> **Hai: sao không cố định trần 110% cho mọi sự kiện?** Mỗi sự kiện có độ "nóng" khác nhau. Hội thảo học thuật có thể đặt 100%, để không ai lời được. Concert lớn đặt 110–120%, để người bận việc dễ bán lại. **Quyền chọn thuộc về ban tổ chức, quyền thực thi thuộc về hợp đồng.**

### 2.5 Quay lại 6 kiểu lừa đảo (20 giây)

**[Slide 9]** Bảng ở slide 4, giờ điền thêm cột "FairTicket chặn bằng gì".

| # | Kiểu | FairTicket chặn bằng |
|---|---|---|
| 1 | Vé giả | Vé là bản ghi duy nhất trên hợp đồng; tra được ai đang giữ |
| 2 | Một vé bán nhiều người | Mã QR **ký bằng ví chủ vé**, hết hạn sau 5 phút; một vé chỉ check-in được **1 lần** |
| 3 | Vé đã dùng | Vé đã check-in thì **không rao bán, không mua lại được** |
| 4 | Giả danh BTC, chuyển khoản trước | Không có bước chuyển khoản trước: **tiền và vé đổi chủ cùng lúc** trong hợp đồng |
| 5 | "Pass vé bán lỗ" | Như trên: muốn mua phải mua qua chợ bán lại của hợp đồng |
| 6 | Gom vé, thổi giá | **Trần giá + giới hạn ví + phí 5%**: lãi bị chặn ở mức thấp |

> Để chứng minh những luật này chạy thật trên blockchain, em demo trực tiếp.

---

## 3. Demo trên DApp (3 phút 30)

> Đây là DApp đã deploy công khai ở Vercel, kết nối với hợp đồng thật trên mạng thử nghiệm Sepolia. Mọi thao tác đều là giao dịch thật, tra được trên Etherscan.

### 3.1 Trang chủ (15 giây)

**[Thao tác]** Profile B, mở trang chủ.

> Thẻ vé nổi và các con số ở đầu trang (số sự kiện, số vé đã phát hành) đều **đọc thẳng từ hợp đồng**. Không có số nào đặt bằng tay.

### 3.2 Ban tổ chức đặt luật (40 giây)

**[Thao tác]** Profile A → **Tạo sự kiện** → điền nhanh tên, ảnh, ngày → bước 2: trần **120%**, **2 vé/ví** → chỉ khung "Quy tắc ghi trên hợp đồng" → sang bước 3 rồi dừng → mở sự kiện "FairTicket Night 2026" đã tạo sẵn.

> Đây chính là hai luật em vừa trình bày. Ban tổ chức chọn trần giá và số vé tối đa mỗi ví, và khung bên phải tính sẵn giá bán lại tối đa cùng phí bản quyền. Hai luật này **ghi vĩnh viễn** lên hợp đồng. Em dùng sự kiện đã tạo sẵn với đúng cấu hình đó để tiết kiệm thời gian.

### 3.3 Mua vé: tiền và vé đổi chủ cùng lúc (40 giây)

**[Thao tác]** Profile C → trang sự kiện → chọn 2 vé → **Mua vé** → chỉ danh sách kiểm tra → **Xác nhận & thanh toán**.

> Trang thanh toán kiểm tra trước mọi thứ: đúng mạng chưa, còn vé không, ví đã mua bao nhiêu trên giới hạn, đủ tiền chưa. Bấm thanh toán thì tiền vào hợp đồng và vé về ví **trong cùng một giao dịch**. Đây là thứ chặn kiểu lừa "chuyển khoản trước, gửi vé sau".

### 3.4 Bán lại có trần và phí bản quyền (50 giây)

**[Thao tác]** Profile B → **Vé của tôi** → mở vé #X → **Tạo mã check-in** → **chụp màn hình QR** (dùng cho phần "thử phá luật") → đóng → **Rao bán lại** 0.012.

> Hộp rao bán ghi rõ: tối đa 0.012 ETH theo trần 120%, người bán nhận 95%.

**[Thao tác]** Profile C → **Vé bán lại** → **Mua lại** → dừng ở hộp xác nhận → xác nhận.

> Người mua lại thấy rõ **0.0006 ETH là phí bản quyền** về ban tổ chức.

**[Thao tác]** Profile A → **Sự kiện của tôi**, chỉ dòng "+ phí bản quyền bán lại".

> Đây là điều em nói ở phần kinh tế: lần đầu tiên ban tổ chức **có phần trong thị trường bán lại**, và con số hiện ngay trên dashboard.

### 3.5 Soát vé bằng CTV (50 giây)

**[Thao tác]** Profile A → **Quản lý CTV** → dán ví D → **Cấp quyền**. Profile C → **Tạo mã check-in**. Điện thoại D: app camera quét → trang Check-in mở với mã điền sẵn → xác nhận → "✓ đã ghi".

> Ban tổ chức cấp quyền cho ví CTV thay vì đưa ví của mình. CTV chỉ check-in được, không rút được tiền.
>
> Mã QR được **ký bằng ví chủ vé**, **hết hạn sau 5 phút**. Hệ thống kiểm tra người ký đúng là **chủ hiện tại** của vé rồi mới ghi check-in. Kiểu lừa "chụp mã gửi nhiều người" không qua được.

### 3.6 Rút tiền (15 giây)

**[Thao tác]** Profile A → **Rút tiền**.

> Ban tổ chức rút cả tiền bán vé lẫn phí bản quyền trong một giao dịch.

> 💡 **Nếu Sepolia chậm quá 30 giây:** *"Trong lúc chờ khối xác nhận, em chiếu đoạn đã quay sẵn."*

---

## 4. Thử phá luật (1 phút 30)

> Hệ thống chống gian lận phải được kiểm tra ở **lúc nó từ chối**. Em thử phá luật cả trên web, lẫn **gọi thẳng hợp đồng qua Remix**, tức là bỏ qua giao diện.

**[Slide 10]** Bảng 5 ca.

| # | Thử phá | Kết quả |
|---|---|---|
| 1 | Ví B rao giá **0.0121** (121%), rồi gọi thẳng `listForResale(<id>, 12100000000000000)` trên Remix | Web chặn; hợp đồng báo **`ResalePriceTooHigh`** |
| 2 | Ví B (đã mua 2 vé) mua vé thứ 3, rồi gọi thẳng `mintTicket(<tierId>)` kèm 0.01 ETH | Nút bị khoá; hợp đồng báo **`WalletLimitReached`** |
| 3 | Ví A → **Check-in** → **Tải ảnh** QR mà B chụp ở bước 3.4 | "Mã QR không do chủ vé hiện tại ký" |
| 4 | Quét lại mã của C | "Vé đã được check-in trước đó" |
| 5 | Ví A **thu hồi** quyền D, rồi D quét vé khác | "Ví này không có quyền soát vé" |

> Ca 1 và 2 là quan trọng nhất: kể cả **bỏ qua web để gọi thẳng hợp đồng**, luật vẫn đứng vững. Trần giá và giới hạn ví không phải quy định hiển thị, mà là **luật trên blockchain**. Ca 3 là mánh "bán vé rồi vẫn giữ ảnh QR để vào cửa": vé đã sang tay người khác nên mã cũ mất hiệu lực.

> ⚠️ **Ca 3 phải làm trong vòng 5 phút** kể từ bước 3.4. Quá giờ thì trang báo "Mã QR đã hết hạn". Khi đó nói: *"Bị chặn ngay ở lớp đầu là hạn 5 phút; kể cả còn hạn thì lớp sau cũng chặn, vì người ký không còn là chủ vé."*
> 💡 **Thiếu thời gian:** làm trực tiếp ca 1 và 2, các ca 3–5 nói qua bằng slide.

---

## 5. Bảo mật và kiểm thử (1 phút 15)

**[Slide 11]** Ba cột: Tấn công · Cách chặn · Bằng chứng.

> Lỗi nổi tiếng nhất của hợp đồng giữ tiền là **reentrancy**: hợp đồng gửi tiền trước rồi mới cập nhật số dư, nên kẻ tấn công gọi rút tiền lặp đi lặp lại trước khi số dư kịp về 0. Ở Lab 13, nhóm viết hẳn một hợp đồng tấn công để thử.
>
> FairTicket chặn bằng hai lớp:
> - **Pull-payment**: hợp đồng không tự gửi tiền cho ai, mà ghi nợ và để người nhận tự rút.
> - Thứ tự **Kiểm tra → Ghi trạng thái → Gửi tiền**: số dư được đặt về 0 **trước khi** gửi.
>
> Hợp đồng tấn công thất bại, và kịch bản này được chạy lại cho bản v4. Bản v4 có **19 ca test**, gồm cả ca làm tròn phí: bán 1.099 wei thì phí 54 wei, người bán nhận 1.045 wei, **tổng khớp, không mất một wei nào**.
>
> Ngoài ra, nhóm **chép đúng bytecode đang chạy trên Sepolia** sang một blockchain chạy trên máy, rồi cho trình duyệt tự động điều khiển 4 ví chạy **55 bước test giao diện**, gồm tất cả các ca em vừa demo. **55 trên 55 đạt.** Bộ test còn bắt được lỗi thật, ví dụ tạo sự kiện bị trùng khi ví từ chối giao dịch thứ 2. Lỗi này đã được sửa.
>
> Trước khi nộp, nhóm rà lại toàn bộ dự án. Kết luận: **không có lỗi làm mất tiền hay mất vé**.

---

## 6. Giới hạn và hướng phát triển (40 giây)

**[Slide 12]** 4 giới hạn.

> Nhóm muốn nói thẳng những gì hệ thống **chưa làm được**:
> 1. **Giới hạn vé tính theo ví, không theo người.** Tạo nhiều ví vẫn gom được, chỉ là bị trần giá chặn lợi nhuận. Hướng tiếp theo: định danh mỗi người một ví.
> 2. **Chưa có hạn bán lại theo thời gian.** Web đã ẩn nút mua với sự kiện đã diễn ra, nhưng gọi thẳng hợp đồng thì vẫn mua lại được.
> 3. **Ban tổ chức và CTV được coi là đáng tin.** Chữ ký QR được kiểm tra trên web chứ chưa kiểm tra trong hợp đồng, nên về lý thuyết họ có thể check-in vé của người khác.
> 4. **Thỏa thuận ngoài chuỗi:** người mua đưa thêm tiền mặt, rồi người bán rao đúng giá trần. Không chặn tuyệt đối được. Nhưng tin rao là công khai, ai cũng có thể mua trước, nên kiểu thỏa thuận này **rủi ro cho chính hai bên**.

---

## 7. Kết (20 giây)

**[Slide 13]** Một câu lớn: "Không cấm bán lại — làm cho đầu cơ không còn lời."

> Tóm lại, FairTicket **không cấm bán lại**. Nó làm cho đầu cơ không còn lời, giữ thị trường bán lại cho người có nhu cầu thật, và lần đầu tiên chia một phần lợi ích của thị trường đó về cho người làm ra sự kiện. Mọi luật đều nằm trong hợp đồng, và ai cũng kiểm chứng được.
>
> Cảm ơn thầy cô và các bạn đã lắng nghe. Nhóm em xin nhận câu hỏi.

---

## Câu hỏi dự kiến

**Sao không cấm bán lại cho đơn giản?**
Cấm hẳn thì người bận việc sẽ mất trắng tiền vé, và chợ đen ngoài chuỗi lại mọc lên, nơi không có trần giá và không kiểm tra được vé. Cho bán lại có trần thì nhu cầu thật vẫn được đáp ứng, còn đầu cơ không có lời.

**Sao phí bản quyền là 5% mà không phải 10%?**
5% đặt điểm hòa vốn khi bán lại ở khoảng 105%, nên với trần mặc định 110% phe vé gần như không lời, mà người bán vì lý do thật cũng không thiệt nhiều. Nếu là 10% thì bán lại ở mức 110% vẫn lỗ khoảng 1%, quá nặng cho người bận việc. 5% là hằng số trong hợp đồng; muốn cho ban tổ chức tự chọn thì phải deploy phiên bản mới.

**Một người tạo 100 ví thì sao?**
Họ phải nạp tiền và trả phí giao dịch cho từng ví, rồi lãi mỗi vé vẫn bị chặn ở 4,5% (với trần 110%), trong khi lỗ thì không bị chặn. Đúng như vụ FTC: giới hạn tài khoản thì bị lách được. Vì vậy **trần giá mới là lớp chặn chính**.

**Ban tổ chức có gian lận được không?**
Không đổi được giá hay tổng số vé sau khi tạo, không chuyển vé của người khác, không sửa được trần giá hay giới hạn ví, không đặt lại trạng thái "chưa check-in". Ban tổ chức **có thể** check-in vé của người khác: đây là giả định "ban tổ chức đáng tin" đã nêu ở phần giới hạn.

**Sao không dùng NFT chuẩn ERC-721?**
ERC-721 bắt buộc có hàm chuyển vé tự do (`transferFrom`). Khi đó người bán nhận tiền ngoài chuỗi rồi chuyển thẳng vé, bỏ qua trần giá. Vé của FairTicket chỉ đổi chủ qua chợ bán lại có kiểm tra trần.

**Số liệu ở Anh và Mỹ có liên quan gì Việt Nam?**
Ở Việt Nam chưa có thống kê tổng hợp công khai về lừa đảo vé, nên nhóm dùng số liệu chính thức của Anh và Mỹ để thấy quy mô vấn đề. Các vụ ở Việt Nam (BLACKPINK, "Anh trai") cho thấy cùng các kiểu lừa đảo đó đang diễn ra ở đây.

**Ai trả phí gas?**
Ai thao tác thì người đó trả: ban tổ chức khi tạo sự kiện, người mua khi mua, CTV khi check-in. Ký mã QR chỉ là chữ ký, không phải giao dịch, nên **miễn phí**. Trên Sepolia, ETH dùng để test nên không mất tiền thật.

**Ảnh và mô tả lưu ở đâu? Vercel sập thì sao?**
Lưu trên Vercel để khỏi tốn gas; muốn sửa phải ký bằng ví ban tổ chức. Vercel sập thì chỉ mất phần hiển thị. Vé, tiền và check-in vẫn trên blockchain, thao tác được qua Remix hoặc Etherscan.

**Test bằng ví giả lập có đáng tin không?**
Ví giả lập chỉ thay phần bấm xác nhận của MetaMask. Giao dịch vẫn chạy trên **đúng bytecode hợp đồng đang chạy trên Sepolia**.

**Có hoàn tiền không?**
Chưa có. Người mua lấy lại tiền bằng cách rao bán lại, tối đa bằng mức trần. Hoàn tiền khi sự kiện bị huỷ là hướng phát triển tiếp theo.

---

## Nguồn số liệu (đọc khi được hỏi)

- **£9,79 triệu · 9.826 vụ · tăng 47% · 38% là vé concert** (Anh, 2024, số liệu của Action Fraud): [Bitdefender — Action Fraud Urges Vigilance as Ticket Fraud Losses Surge to £9.7 Million](https://www.bitdefender.com/en-gb/blog/hotforsecurity/action-fraud-urges-vigilance-as-ticket-fraud-losses-surge-to-9-7-million) · [Durham Police — Stay vigilant for ticket fraud](https://www.durham.police.uk/news/durham/news2/2025/april/stay-vigilant-for-ticket-fraud-ahead-of-top-events-and-concerts-this-summer/)
- **Taylor Swift: ≈ 3.000 nạn nhân, > £1 triệu, trung bình £332, > 90% từ Facebook** (Lloyds Bank, 4/2024): [STV News](https://news.stv.tv/west-central/taylor-swift-fans-targeted-by-surge-in-concert-ticket-scams-major-bank-warns) · [Yahoo Finance UK](https://uk.finance.yahoo.com/news/taylor-swift-fans-lose-1m-050100886.html)
- **5 đầu mối gom 246.407 vé cho 2.594 sự kiện; dùng nhiều tài khoản lách giới hạn** (FTC kiện Live Nation/Ticketmaster, 9/2025): [Digital Music News](https://www.digitalmusicnews.com/2025/09/18/ftc-lawsuit-live-nation-ticketmaster-ticket-resale/) · [Engadget](https://www.engadget.com/entertainment/the-ftc-sues-ticketmaster-for-allegedly-colluding-with-resellers-191337586.html)
- **Taylor Swift Eras Tour: 3,5 tỷ lượt truy cập hệ thống lúc mở bán, bot tấn công** (Ticketmaster, 11/2022), có thể dùng nếu cần thêm ví dụ về bot: [Ticketmaster — The Eras Tour Onsale Explained](https://business.ticketmaster.com/press-release/taylor-swift-the-eras-tour-onsale-explained/)
- **BLACKPINK Hà Nội 2023: Cat1 6,8 triệu, chợ đen 5–6 triệu ghế xa, 10 triệu ghế đẹp**: [VnExpress — Loạn vé xem show Blackpink](https://vnexpress.net/loan-ve-xem-show-blackpink-4630134.html)
- **BLACKPINK: phe vé phải bán lỗ hạng VIP/Platinum**: [PLO — Vỡ mộng vì ôm vé concert BlackPink bán kiếm lời](https://plo.vn/vo-mong-vi-om-ve-concert-blackpink-ban-kiem-loi-post741797.html)
- **"Anh trai vượt ngàn chông gai": fanpage xác nhận 144 vé bị lừa ≈ 300 triệu đồng**: [Znews](https://znews.vn/fanpage-bi-to-lua-300-trieu-tien-ve-chong-gai-lam-viec-voi-cong-an-post1559958.html)
- **Nhóm người chuyển > 50 triệu cho đối tượng tự xưng người trong BTC; Công an quận Hai Bà Trưng điều tra**: [Nhân Dân](https://nhandan.vn/post-848181.html) · [Báo Quốc tế](https://baoquocte.vn/tranh-mat-tien-oan-khi-mua-ve-anh-trai-say-hi-va-anh-trai-vuot-ngan-chong-gai-295837.html)

> **Lưu ý:** bảng lời/lỗ ở mục 2.3 là **phép tính minh họa** của nhóm, lấy giá Cat1 6,8 triệu làm ví dụ. Đây không phải số liệu thống kê. Trên DApp, giá tính bằng ETH testnet.
