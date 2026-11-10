# KỊCH BẢN THUYẾT TRÌNH ĐẦY ĐỦ — BẢN CỦA LINH

> **Người nói:** Mai Bá Linh — **thuyết trình một mình toàn bộ bài** (khoảng 13 phút + hỏi đáp).
> **Cách kể:** đi theo *"hành trình của một tấm vé"*: mỗi bước của tấm vé gắn với một kiểu gian lận mà FairTicket chặn được. Bản của Thảo ([SCRIPT_THAO.md](SCRIPT_THAO.md)) kể theo hướng khác để hai bài không trùng nhau.
> Chữ thường là lời nói. **[Slide]** là nội dung trên màn chiếu. **[Thao tác]** là việc làm trên máy.
> Mọi số liệu thực tế đều có nguồn ở **mục cuối**. Các ví dụ tính bằng tiền đồng là **phép tính minh họa** của nhóm và được ghi rõ.

---

## Phân bổ thời gian

| # | Phần | Thời lượng |
|---|---|---|
| 1 | Mở đầu: một tình huống và những con số | 1 phút 30 |
| 2 | Vì sao thị trường vé hỏng: 3 nguyên nhân kinh tế | 1 phút 30 |
| 3 | Ý tưởng FairTicket: 3 nguyên tắc | 1 phút |
| 4 | Ai được lợi, tính bằng tiền | 1 phút 30 |
| 5 | Demo: hành trình của một tấm vé | 4 phút |
| 6 | Thử phá luật | 1 phút 30 |
| 7 | Bảo mật và kiểm thử | 1 phút |
| 8 | Giới hạn, hướng phát triển, kết | 1 phút |

---

## Chuẩn bị trước buổi

**4 ví trên Sepolia, mỗi ví ≥ 0.05 ETH test.** Mỗi ví mở ở một profile Chrome riêng; ví D mở trên điện thoại.

| Ví | Vai |
|---|---|
| **A** | Ban tổ chức |
| **B** | Người mua 1, sẽ bán lại vé |
| **C** | Người mua 2, mua lại vé |
| **D** | CTV soát vé (điện thoại, app MetaMask) |

**Dữ liệu dựng sẵn trên hợp đồng v4 `0x0845…9Fd0`:**
1. Ví A tạo sự kiện **"FairTicket Night 2026"**:
   - có ảnh bìa, ngày diễn ra **sau** buổi thuyết trình;
   - trần **120%**, tối đa **2 vé/ví**;
   - hạng Standard 0.01 ETH × 50 vé.
2. Tạo thêm 1–2 sự kiện khác có ảnh, để trang chủ không trống.
3. Ví B mua sẵn **2 vé**.
4. Remix: biên dịch `ProjectCore.sol`, bấm **At Address** tới `0x0845EEB1Ed93C373173680a859fB255f168b9Fd0`, chọn ví B.
5. **Quay sẵn video demo** để dự phòng trường hợp Sepolia chậm.

**Ngay trước giờ lên:** Ctrl+F5 ở cả 3 profile; thử quét 1 mã QR bằng camera điện thoại; mở sẵn Etherscan và file `evidence/lab-15-v4/ui-e2e-v4-log.txt`.

---

## 1. Mở đầu: một tình huống và những con số (1 phút 30)

**[Slide 1]** Tên đề tài, URL DApp, tên 2 thành viên.

> Em chào thầy cô và các bạn. Em là Linh, nhóm em gồm em và bạn Thảo. Hôm nay em trình bày **FairTicket**: nền tảng vé sự kiện trên blockchain, chống vé giả và hạn chế đầu cơ.

**[Slide 2]** Một tin nhắn giả lập: *"Mình dư 2 vé, chuyển khoản trước mình gửi mã nhé"*. Ghi chú nhỏ: *tình huống minh họa*.

> Em bắt đầu bằng một tình huống mà chắc nhiều bạn đã gặp. Concert thần tượng mở bán, một phút sau hết vé. Bạn vào hội nhóm trên Facebook và thấy ai đó nhắn: *"Mình dư 2 vé, chuyển khoản trước mình gửi mã."* Bạn chuyển tiền, rồi người đó biến mất. Hoặc bạn nhận được mã vé, nhưng đến cửa thì người khác đã dùng mã đó trước.
>
> Đây không phải chuyện hiếm.

**[Slide 3]** Bốn con số lớn, mỗi con số có nguồn ở góc.

> - Ở **Anh, năm 2024**, người dân báo cáo **9.826 vụ** lừa đảo vé, thiệt hại **9,79 triệu bảng**, tăng **47%** so với năm trước. Gần **4 trên 10 vụ** là vé concert.
> - Chỉ riêng tour **Taylor Swift**, ngân hàng Lloyds ước tính khoảng **3.000 người** bị lừa ở Anh, trung bình mỗi người mất **332 bảng**. Hơn **90%** bắt đầu từ bài đăng giả trên Facebook, giống hệt tình huống em vừa kể.
> - Ở **Việt Nam**, với concert "Anh trai vượt ngàn chông gai", một fanpage xác nhận **144 vé bị lừa, khoảng 300 triệu đồng**.
> - Còn chuyện **gom vé**: tháng 9/2025, Ủy ban Thương mại Liên bang Mỹ (FTC) kiện Ticketmaster, cáo buộc **chỉ 5 đầu mối** đã gom **246.407 vé** bằng cách **dùng nhiều tài khoản** để vượt giới hạn mua.

---

## 2. Vì sao thị trường vé hỏng: 3 nguyên nhân kinh tế (1 phút 30)

**[Slide 4]** Ba ô, mỗi ô một nguyên nhân.

> Em nghĩ vấn đề không nằm ở việc người bán vé xấu hay tốt, mà nằm ở **cấu trúc của thị trường**. Có ba nguyên nhân.
>
> **Thứ nhất: cung cố định, cầu dồn vào một lúc.** Sân vận động chỉ có từng ấy ghế, và ai cũng muốn mua đúng lúc mở bán. Giá niêm yết thường thấp hơn giá mà người hâm mộ sẵn sàng trả, nên ai **giữ được vé** thì giữ được phần chênh lệch đó. Đó là động cơ của phe vé. Ví dụ concert BLACKPINK ở Hà Nội năm 2023: vé hạng Cat1 giá **6,8 triệu**, chợ đen rao ghế đẹp tới **10 triệu**.
>
> **Thứ hai: bất cân xứng thông tin.** Người bán biết vé thật hay giả, đã dùng hay chưa; người mua thì không. Kinh tế học gọi đây là *thị trường quả chanh* (*market for lemons*): vì không phân biệt được hàng tốt và hàng xấu, người mua mất lòng tin, và kẻ lừa đảo lợi dụng đúng khoảng trống đó.
>
> **Thứ ba: ban tổ chức không có phần ở thị trường bán lại.** Vé bán lại giá gấp đôi thì phần chênh vào túi người bán lại, ban tổ chức không được đồng nào. Vì vậy họ cũng **không có công cụ và không có động lực** để kiểm soát thị trường này.

**[Slide 5]** Bảng 6 kiểu gian lận.

> Từ ba nguyên nhân đó sinh ra **sáu kiểu gian lận** phổ biến:

| # | Kiểu | Ví dụ |
|---|---|---|
| 1 | Vé giả | Ảnh vé, mã vé bị chỉnh sửa |
| 2 | Một vé bán cho nhiều người | Chụp mã QR gửi cho 5 người |
| 3 | Vé đã dùng | Bán lại vé đã qua cửa |
| 4 | Giả danh ban tổ chức | "Em làm trong BTC, chuyển khoản trước". Ở Hà Nội, một nhóm người đã chuyển **hơn 50 triệu** theo cách này |
| 5 | "Pass vé bán lỗ" | Rao rẻ hơn giá gốc để dụ chuyển khoản nhanh |
| 6 | Gom vé, thổi giá | Nhiều tài khoản hoặc bot mua sạch vé rồi bán lại giá cao |

> Lát nữa trong phần demo, em sẽ chỉ ra **từng kiểu bị chặn ở bước nào**.

---

## 3. Ý tưởng FairTicket: 3 nguyên tắc (1 phút)

**[Slide 6]** Ba nguyên tắc lớn.

> FairTicket dựa trên ba nguyên tắc:
>
> 1. **Mỗi vé là một bản ghi duy nhất trên blockchain.** Ai đang giữ vé, vé đã dùng chưa, ai cũng tra được. Không làm giả được, không nhân bản được.
> 2. **Tiền và vé đổi chủ trong cùng một giao dịch.** Hoặc cả hai cùng xảy ra, hoặc không gì xảy ra. Không còn bước "chuyển khoản trước, gửi vé sau", nên các kiểu 4 và 5 không còn chỗ.
> 3. **Luật kinh tế nằm trong hợp đồng thông minh.** Khi tạo sự kiện, ban tổ chức đặt:
>    - **trần giá bán lại**, từ 100% đến 200% giá gốc, mặc định 110%;
>    - **số vé tối đa mỗi ví**.
>
>    Mỗi lần vé đổi chủ, **5% là phí bản quyền** về ban tổ chức. Nhóm em làm web cũng không sửa được các luật này.

---

## 4. Ai được lợi, tính bằng tiền (1 phút 30)

**[Slide 7]** Bảng, tô đậm dòng 110%. Ghi chú: *ví dụ minh họa, vé giá 2.000.000đ*.

> Em lấy một vé giá **2 triệu đồng** làm ví dụ. Giả sử người bán lại bán đúng bằng mức trần, rồi trừ 5% phí bản quyền:

| | Bán lại tối đa | Người bán nhận | Người bán lời/lỗ | Ban tổ chức nhận thêm |
|---|---|---|---|---|
| *Chợ đen, giả sử bán gấp đôi* | *4.000.000đ* | *4.000.000đ* | ***+2.000.000đ (+100%)*** | ***0đ*** |
| Trần 100% | 2.000.000đ | 1.900.000đ | −100.000đ (−5%) | 100.000đ |
| **Trần 110% (mặc định)** | **2.200.000đ** | **2.090.000đ** | **+90.000đ (+4,5%)** | **110.000đ** |
| Trần 120% | 2.400.000đ | 2.280.000đ | +280.000đ (+14%) | 120.000đ |
| Trần 150% | 3.000.000đ | 2.850.000đ | +850.000đ (+42,5%) | 150.000đ |

> Nhìn từng bên:
> - **Phe vé:** ở mức mặc định, lời tối đa **90 nghìn mỗi vé, chưa trừ phí giao dịch**. Lấy luôn bài toán gom vé bằng nhiều tài khoản như vụ FTC: một người tạo **100 ví**, mỗi ví mua 2 vé. Họ phải ôm **400 triệu đồng tiền vốn** để kiếm tối đa **18 triệu**, mà chỉ cần ế vài chục vé là lỗ. **Lãi bị chặn, còn lỗ thì không**, nên đầu cơ không còn đáng làm.
> - **Người mua thật nhưng bận đột xuất:** bán lại ở khoảng **105%** là gần hòa vốn. Thị trường bán lại vẫn mở cho nhu cầu thật.
> - **Ban tổ chức:** từ chỗ **0 đồng**, nay nhận thêm **110 nghìn** mỗi lần vé đổi chủ. Đây là lý do ban tổ chức **muốn** dùng FairTicket: lần đầu tiên họ có phần trong thị trường bán lại, nên cũng có động lực giữ thị trường đó minh bạch.
> - **Nền tảng:** không thu phí. Uy tín đến từ việc ai cũng kiểm tra được luật trên Etherscan.
>
> Vì sao không bỏ trần giá, khi đã có giới hạn ví? Vì như vụ FTC, **tài khoản thì lách được**; trên blockchain, tạo ví mới còn dễ hơn. Giới hạn ví chỉ làm việc gom vé tốn công hơn; **trần giá mới là thứ chặn lợi nhuận**. Và vì sao không cố định 110%? Vì hội thảo học thuật có thể muốn 100%, còn concert lớn muốn 110–120%. **Ban tổ chức chọn luật, hợp đồng thực thi luật.**

---

## 5. Demo: hành trình của một tấm vé (4 phút)

> Giờ em đi theo **một tấm vé**, từ lúc được tạo ra đến lúc qua cửa, trên DApp thật đã deploy ở Vercel, kết nối hợp đồng thật trên mạng Sepolia.

**[Slide 8]** Thanh tiến trình 6 chặng: *Ra đời → Mua → Bán lại → Mua lại → Qua cửa → Ban tổ chức nhận tiền*.

### Chặng 1: Tấm vé ra đời (40 giây)

**[Thao tác]** Profile A → **Tạo sự kiện**. Gõ tên, chọn ảnh, chọn ngày. Chỉ thẻ xem trước bên phải đang đổi theo. Sang bước 2, chọn trần **120%**, tối đa **2 vé/ví**. Chỉ khung "Quy tắc ghi trên hợp đồng". Sang bước 3 rồi dừng lại.

> Ban tổ chức tạo sự kiện và đặt luật: trần 120%, tối đa 2 vé mỗi ví. Khung bên phải tính sẵn giá bán lại tối đa và doanh thu nếu bán hết. Hai quy tắc này **ghi vĩnh viễn**: ban tổ chức cũng không đổi được sau đó, nên người mua biết trước luật chơi.
>
> Để tiết kiệm thời gian, em dùng sự kiện đã tạo sẵn với đúng cấu hình này.

**[Thao tác]** Mở sự kiện "FairTicket Night 2026".

### Chặng 2: Có người mua (40 giây) → chặn **kiểu 1, 4, 5**

**[Thao tác]** Profile C → trang sự kiện → chọn 2 vé → **Mua vé**. Chỉ danh sách kiểm tra → **Xác nhận & thanh toán**.

> Người mua thấy luật ngay trên trang. Trước khi thanh toán, hệ thống kiểm tra trước: đúng mạng chưa, còn vé không, ví đã mua bao nhiêu trên giới hạn, đủ tiền không. MetaMask hỗ trợ gộp giao dịch thì 2 vé chỉ cần ký 1 lần.
>
> Tiền đi vào hợp đồng và vé về ví người mua **cùng một lúc**. Không có ai đứng giữa để "chuyển khoản trước", nên **kiểu 4 và 5 không có chỗ**. Vé là bản ghi trên chain nên **kiểu 1, vé giả, cũng không có**.

### Chặng 3: Chủ vé bận, muốn bán lại (40 giây) → chặn **kiểu 6**

**[Thao tác]** Profile B → **Vé của tôi** → mở vé #X → **Tạo mã check-in** → chụp màn hình mã QR (dùng cho phần "thử phá luật") → đóng → **Rao bán lại**, nhập 0.012.

> Bạn B có vé nhưng bận. Hộp rao bán ghi rõ: tối đa **0.012 ETH** theo trần 120%, và **B nhận 95%**. Muốn rao cao hơn là không được. Lát nữa em sẽ thử. Đây là chỗ **kiểu 6, thổi giá**, bị chặn.

### Chặng 4: Tấm vé đổi chủ (30 giây)

**[Thao tác]** Profile C → **Vé bán lại** → **Mua lại**. Dừng ở hộp xác nhận → xác nhận.

> Người mua lại thấy rõ: trả 0.012 ETH, **trong đó 0.0006 ETH là phí bản quyền về ban tổ chức**. Vé chuyển sang C, tiền chia đúng 95/5, tất cả trong một giao dịch.

### Chặng 5: Qua cửa (60 giây) → chặn **kiểu 2, 3**

**[Thao tác]** Profile A → trang sự kiện → **Quản lý CTV** → dán ví D → **Cấp quyền**.

> Ở cửa, ban tổ chức cấp quyền soát vé cho **ví của CTV**. CTV chỉ check-in được: không rút tiền, không tạo vé, và bị thu hồi là mất quyền ngay.

**[Thao tác]** Profile C → **Tạo mã check-in** → đưa màn hình. Điện thoại D: dùng **app camera** quét mã → trang Check-in mở ra với mã đã điền sẵn (nếu mở bằng Chrome thì bấm "Mở bằng ứng dụng MetaMask") → xác nhận → "✓ đã ghi".

> Mã QR được **ký bằng ví chủ vé** và **hết hạn sau 5 phút**. Hệ thống kiểm tra trên blockchain rằng người ký đúng là **chủ hiện tại** của vé và vé chưa dùng, rồi mới ghi check-in.
>
> Vì vậy **kiểu 2**, chụp mã gửi nhiều người, không qua được: mã hết hạn, và mỗi vé chỉ vào được một lần. **Kiểu 3**, vé đã dùng, cũng vậy: vé đã check-in thì không rao bán hay mua lại được nữa.

### Chặng 6: Ban tổ chức nhận tiền (30 giây)

**[Thao tác]** Profile A → **Sự kiện của tôi**. Chỉ dòng "+ phí bản quyền bán lại" và mục hoạt động "đổi chủ · phí bản quyền". Bấm **Rút tiền**.

> Dashboard hiện cả doanh thu bán lần đầu lẫn **phí bản quyền từ thị trường bán lại**, đúng con số em tính ở phần trước. Ban tổ chức rút tất cả trong một giao dịch.

> 💡 **Nếu Sepolia chậm quá 30 giây:** *"Trong lúc chờ khối xác nhận, em chiếu đoạn đã quay sẵn."*

---

## 6. Thử phá luật (1 phút 30)

> Một hệ thống chống gian lận cần được kiểm tra ở **lúc nó từ chối**. Em thử phá luật cả trên web, lẫn **gọi thẳng hợp đồng qua Remix** để bỏ qua giao diện.

**[Slide 9]** Bảng 5 ca, đánh dấu ✓ khi demo xong.

| # | Em thử | Kết quả |
|---|---|---|
| 1 | Profile B rao vé giá **0.0121** (121%) → web chặn. Remix: `listForResale(<id>, 12100000000000000)` | **`ResalePriceTooHigh`**: hợp đồng từ chối |
| 2 | Profile B (đã mua 2 vé) mua vé thứ 3: nút bị khoá. Remix: `mintTicket(<tierId>)` kèm 0.01 ETH | **`WalletLimitReached`** |
| 3 | Profile A → **Check-in** → **Tải ảnh** QR mà B chụp ở chặng 3 | "Mã QR không do chủ vé hiện tại ký" |
| 4 | Điện thoại D quét lại mã của C | "Vé đã được check-in trước đó" |
| 5 | Profile A **thu hồi** quyền D, rồi D quét vé khác | "Ví này không có quyền soát vé" (`NotCheckInAuthorized`) |

> - Ca 1 và 2: em bỏ qua web, gọi thẳng hợp đồng, **vẫn bị từ chối**. Luật không nằm ở giao diện mà nằm trên blockchain.
> - Ca 2: B đã bán một vé cho C nhưng vẫn không mua thêm được, vì giới hạn **tính theo số vé mua mới**.
> - Ca 3: mánh "bán vé rồi vẫn giữ ảnh QR để vào cửa". Vé đã sang tay C nên mã của B mất hiệu lực.

> ⚠️ **Ca 3 phải làm trong vòng 5 phút** kể từ chặng 3. Quá 5 phút thì trang báo "Mã QR đã hết hạn". Khi đó nói: *"Mã bị chặn ngay ở lớp đầu là hạn 5 phút; kể cả còn hạn thì lớp sau cũng chặn, vì người ký không còn là chủ vé."*
> 💡 **Thiếu thời gian:** làm trực tiếp ca 1 và 2, các ca 3–5 nói qua bằng slide.

---

## 7. Bảo mật và kiểm thử (1 phút)

**[Slide 10]** Trái: sơ đồ tấn công reentrancy. Phải: hai số lớn, **19** test hợp đồng và **53** bước test giao diện.

> Hợp đồng giữ tiền của nhiều người nên phải chống được lỗi kinh điển **reentrancy**: kẻ tấn công gọi rút tiền lặp đi lặp lại trước khi số dư kịp về 0. Ở Lab 13 nhóm viết hẳn hợp đồng tấn công để thử. FairTicket chặn bằng hai cách:
> - **người nhận tự rút tiền** (pull-payment);
> - **số dư được đặt về 0 trước khi gửi tiền**.
>
> Hợp đồng tấn công thất bại.
>
> Về kiểm thử:
> - Hợp đồng có **19 ca test**, gồm cả ca làm tròn phí: bán 1.099 wei thì phí 54 wei, người bán nhận 1.045 wei, **không mất một wei nào**.
> - Nhóm còn **chép đúng bytecode đang chạy trên Sepolia** sang một blockchain chạy trên máy, rồi cho trình duyệt tự động điều khiển **4 ví** chạy **53 bước**, gồm tất cả các ca em vừa demo. **53 trên 53 đạt.**
> - Bộ test bắt được cả **lỗi thật**, ví dụ: ví từ chối giao dịch thứ 2 thì bấm lại sẽ tạo **sự kiện trùng**, hoặc dashboard không cập nhật số vé đã bán. Tất cả đã sửa.

---

## 8. Giới hạn, hướng phát triển, kết (1 phút)

**[Slide 11]** 4 giới hạn.

> Em muốn nói thẳng những gì hệ thống **chưa làm được**:
> 1. **Giới hạn tính theo ví, không theo người.** Nhiều ví vẫn gom được vé, nhưng trần giá đã chặn lợi nhuận. Hướng tiếp theo: định danh mỗi người một ví.
> 2. **Chưa có hạn bán lại theo thời gian.** Web đã ẩn nút mua với sự kiện đã diễn ra, nhưng gọi thẳng hợp đồng vẫn mua lại được.
> 3. **Ban tổ chức và CTV được coi là đáng tin.** Chữ ký QR được kiểm tra ở web, chưa kiểm tra trong hợp đồng.
> 4. **Thỏa thuận ngoài chuỗi:** người mua đưa thêm tiền mặt, rồi người bán rao đúng giá trần. Không chặn tuyệt đối được, nhưng tin rao là công khai, ai cũng mua trước được, nên **rủi ro cho chính hai bên**.

**[Slide 12]** Một câu lớn: *"Không cấm bán lại — làm cho đầu cơ không còn lời."*

> Quay lại tình huống lúc đầu: trên FairTicket, bạn **không cần tin người bán**. Bạn chỉ cần tin hợp đồng, và ai cũng đọc được hợp đồng. FairTicket không cấm bán lại: nó làm cho đầu cơ không còn lời, giữ thị trường bán lại cho người có nhu cầu thật, và chia một phần lợi ích đó về cho người làm ra sự kiện.
>
> Em cảm ơn thầy cô và các bạn đã lắng nghe. Em xin nhận câu hỏi.

---

## Câu hỏi dự kiến

**Sao không cấm bán lại hẳn?**
Cấm hẳn thì người bận việc mất trắng tiền vé, và chợ đen ngoài chuỗi lại mọc lên, nơi không có trần giá và không kiểm tra được vé. Có trần thì nhu cầu thật vẫn được đáp ứng mà đầu cơ không lời.

**Sao phí là 5%?**
Với 5%, điểm hòa vốn khi bán lại là khoảng 105%, nên ở trần 110% phe vé gần như không lời, còn người bán vì lý do thật chỉ thiệt nhẹ. Nếu 10% thì bán lại ở 110% vẫn lỗ khoảng 1%, quá nặng cho người bận việc.

**Tạo 100 ví thì sao?**
Như ví dụ ở phần 4: ôm 400 triệu vốn để lời tối đa 18 triệu, chưa trừ phí giao dịch, và lỗ không bị chặn. Trần giá là lớp chặn chính; muốn chặn tuyệt đối thì cần định danh người dùng.

**Ban tổ chức gian lận được không?**
Không đổi được giá, tổng số vé, trần giá hay giới hạn ví sau khi tạo; không chuyển vé của người khác; không "un-check-in" được vé. Ban tổ chức **có thể** check-in vé của người khác. Đây là giả định "ban tổ chức đáng tin" đã nêu ở phần giới hạn.

**Sao không dùng NFT chuẩn ERC-721?**
ERC-721 bắt buộc có hàm chuyển vé tự do. Khi đó người bán nhận tiền ngoài chuỗi rồi chuyển thẳng vé, bỏ qua trần giá. Vé FairTicket chỉ đổi chủ qua chợ bán lại có kiểm tra trần.

**Ai trả phí gas?**
Ai thao tác thì người đó trả: ban tổ chức khi tạo sự kiện, người mua khi mua, CTV khi check-in. Ký mã QR là chữ ký, không phải giao dịch, nên **miễn phí**. Trên Sepolia, ETH dùng để test nên không mất tiền thật.

**Ảnh và mô tả lưu ở đâu? Vercel sập thì sao?**
Lưu trên Vercel để khỏi tốn gas; muốn sửa phải ký bằng ví ban tổ chức. Vercel sập thì chỉ mất phần hiển thị. Vé, tiền và check-in vẫn trên blockchain, thao tác được qua Remix hoặc Etherscan.

**Vì sao số liệu chủ yếu của Anh và Mỹ?**
Việt Nam chưa có thống kê tổng hợp công khai về lừa đảo vé. Số liệu chính thức của Anh và Mỹ cho thấy quy mô vấn đề; các vụ ở Việt Nam (BLACKPINK, "Anh trai") cho thấy cùng các kiểu gian lận đó đang diễn ra ở đây.

**Test bằng ví giả lập có đáng tin không?**
Ví giả lập chỉ thay phần bấm xác nhận của MetaMask. Giao dịch vẫn chạy trên **đúng bytecode hợp đồng đang chạy trên Sepolia**. Các luồng chính cũng đã chạy bằng ví thật trên Sepolia, mã giao dịch ghi trong `docs/PRESENTATION_PLAN.md`.

**Có hoàn tiền không?**
Chưa có. Người mua lấy lại tiền bằng cách rao bán lại, tối đa bằng mức trần. Hoàn tiền khi sự kiện bị huỷ là hướng phát triển tiếp theo.

---

## Nguồn số liệu

- **Anh, 2024: 9.826 vụ, £9,79 triệu, tăng 47%, 38% là vé concert** (số liệu Action Fraud): [Bitdefender](https://www.bitdefender.com/en-gb/blog/hotforsecurity/action-fraud-urges-vigilance-as-ticket-fraud-losses-surge-to-9-7-million) · [Durham Police](https://www.durham.police.uk/news/durham/news2/2025/april/stay-vigilant-for-ticket-fraud-ahead-of-top-events-and-concerts-this-summer/)
- **Taylor Swift: ≈ 3.000 nạn nhân, > £1 triệu, trung bình £332, > 90% từ Facebook** (Lloyds Bank, 4/2024): [STV News](https://news.stv.tv/west-central/taylor-swift-fans-targeted-by-surge-in-concert-ticket-scams-major-bank-warns) · [Yahoo Finance UK](https://uk.finance.yahoo.com/news/taylor-swift-fans-lose-1m-050100886.html)
- **FTC kiện Ticketmaster (9/2025): 5 đầu mối gom 246.407 vé cho 2.594 sự kiện bằng nhiều tài khoản**: [Digital Music News](https://www.digitalmusicnews.com/2025/09/18/ftc-lawsuit-live-nation-ticketmaster-ticket-resale/) · [Engadget](https://www.engadget.com/entertainment/the-ftc-sues-ticketmaster-for-allegedly-colluding-with-resellers-191337586.html)
- **BLACKPINK Hà Nội 2023: Cat1 6,8 triệu, chợ đen tới 10 triệu**: [VnExpress](https://vnexpress.net/loan-ve-xem-show-blackpink-4630134.html)
- **"Anh trai vượt ngàn chông gai": 144 vé bị lừa ≈ 300 triệu**: [Znews](https://znews.vn/fanpage-bi-to-lua-300-trieu-tien-ve-chong-gai-lam-viec-voi-cong-an-post1559958.html)
- **> 50 triệu chuyển cho đối tượng tự xưng người trong BTC; Công an quận Hai Bà Trưng điều tra**: [Nhân Dân](https://nhandan.vn/post-848181.html) · [Báo Quốc tế](https://baoquocte.vn/tranh-mat-tien-oan-khi-mua-ve-anh-trai-say-hi-va-anh-trai-vuot-ngan-chong-gai-295837.html)

> Bảng ở phần 4 và ví dụ "100 ví" là **phép tính minh họa** của nhóm (vé giả định 2.000.000đ), không phải số liệu thống kê. Trên DApp, giá tính bằng ETH testnet.
