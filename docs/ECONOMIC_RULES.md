# ECONOMIC RULES — KTX Trường Bia (Quy Tắc Kinh Tế & Thiết Kế Động Lực)

> **Môn học:** ECO2432 – Web3 Starter & Phân Tích Kinh Tế Số  
> **Dự án:** Hệ thống Ký quỹ Mua bán Đồ cũ KTX Trường Bia (`hce-escrow-k58`)  
> **Nguyên lý thiết kế:** Cơ chế kinh tế phải triệt tiêu động cơ gian lận, bảo đảm chi phí cho hành vi xấu luôn cao hơn lợi ích thu được (Incentive Compatibility).

---

## 1. Dòng tiền và Quyền lợi (Money Flow & Economic Incentives)

### 1.1. Bản đồ luân chuyển dòng tiền
Dòng tiền trong hợp đồng ký quỹ KTXEscrow dịch chuyển hoàn toàn minh bạch và khép kín qua các giai đoạn:
1. **Nạp tiền ký quỹ (Deposit):**
   - Người mua gửi đúng $100\%$ số tiền giá trị món hàng (`price`) vào hợp đồng thông minh.
   - Trạng thái hợp đồng chuyển từ `Created` sang `Funded`. Tiền được giam giữ an toàn trong tài khoản của hợp đồng (on-chain vault), không ai có quyền đơn phương rút tiền.
2. **Giải ngân thành công (Success Payout):**
   - Khi người mua xác nhận đã nhận hàng hợp lệ (`confirmReceived()`), hoặc khi đã quá thời hạn kiểm tra mà không có tranh chấp (`claimPaymentAfterDeadline()`):
     - **$99\%$ số tiền giao dịch** ($9.900$ basis points) được chuyển thẳng vào ví người bán (`seller`).
     - **$1\%$ phí nền tảng** ($100$ basis points) được tự động trích vào ví Quỹ Hoạt Động Sinh Viên KTX (`platformFeeAddress`) để duy trì hạ tầng hosting giao diện và tài trợ các hoạt động cộng đồng.
3. **Hoàn tiền bảo hộ (Protection Refund):**
   - Khi giao dịch bị hủy hợp lệ trước khi giao đồ hoặc khi trọng tài ra phán quyết bảo vệ người mua bị lừa đảo (`resolveDispute(REFUND)`):
     - **$100\%$ số tiền ký quỹ** được hoàn trả nguyên vẹn cho người mua (`buyer`).
     - Nền tảng **không thu phí** của nạn nhân bị lừa đảo để bảo đảm đạo đức kinh tế và trách nhiệm xã hội.

### 1.2. Động lực kinh tế của các bên tham gia (Incentive Structure)
- **Đối với người bán (Seller):**
  - *Động lực tích cực:* Giao hàng đúng hẹn, đúng chất lượng mô tả để người mua bấm xác nhận sớm, nhận $99\%$ tiền mặt ngay lập tức và tích lũy điểm uy tín trong KTX.
  - *Răn đe kinh tế:* Nếu giao hàng gian lận hoặc đồ hỏng, người mua sẽ mở tranh chấp (`raiseDispute`), người bán có nguy cơ bị trọng tài phán quyết tịch thu hàng và mất trắng tiền cọc, đồng thời bị công khai danh tính trên diễn đàn sinh viên.
- **Đối với người mua (Buyer):**
  - *Động lực tích cực:* Yên tâm chuyển tiền cọc vì tiền không rơi thẳng vào túi người lạ mà được khóa trong Smart Contract; chỉ cần món hàng đúng mô tả là giao dịch hoàn tất nhanh chóng.
  - *Răn đe kinh tế:* Người mua không thể "ngâm" tiền mãi mãi. Nếu đã nhận hàng mà cố tình không bấm xác nhận, sau thời hạn quy định (`deadline`), cơ chế `claimPaymentAfterDeadline` sẽ tự động chuyển tiền cho người bán.
- **Đối với Ban quản trị / Trọng tài KTX (Arbiter & Platform):**
  - Nhận $1\%$ phí giao dịch để trang trải chi phí vận hành và gas hỗ trợ cộng đồng.
  - Động lực giữ uy tín: Ban đại diện KTX hoạt động minh bạch, mọi phán quyết đều ghi nhận vĩnh viễn trên chuỗi khối (on-chain immutable log).

---

## 2. Giới hạn chống lạm dụng (Abuse Prevention & Economic Guardrails)

Hệ thống thiết lập các "hàng rào kinh tế" nhằm ngăn chặn các hành vi trục lợi và tấn công:

- **G1 — Chống giam vốn người bán (Anti-Seller Hold-up):**
  - Quy định thời hạn kiểm tra cố định: Mặc định $3\text{ ngày}$ ($259.200\text{ giây}$) kể từ khi người mua nạp cọc.
  - Nếu sau $3\text{ ngày}$ người mua không bấm xác nhận và cũng **không bấm khiếu nại**, hợp đồng cho phép người bán kích hoạt quyền tự động giải ngân `claimPaymentAfterDeadline()`. Người mua không thể dùng chiêu bài chây ì để ép người bán bớt tiền sau khi đã cầm đồ.
- **G2 — Chống bẫy thời gian ngắn của người bán (Minimum Inspection Window):**
  - Người bán không được tùy tiện đặt thời gian kiểm tra quá ngắn để "úp sọt" người mua.
  - Hợp đồng quy định chặn dưới cứng: `inspectionDays >= 1` (tối thiểu 24 giờ). Mọi tham số nhỏ hơn 24 giờ sẽ bị hợp đồng từ chối khi khởi tạo (`InvalidInspectionWindow`).
- **G3 — Chống tự tạo đơn giả (Anti-Wash Trading):**
  - Khóa chặt logic: `require(msg.sender != seller, "SellerCannotBeBuyer")`.
  - Người bán không thể tự dùng ví của mình nạp tiền để tự xác nhận nhằm "thổi phồng" số lượng đơn hàng hoặc tạo uy tín giả mạo.
- **G4 — Giới hạn giá trị giao dịch tối đa (Transaction Ceiling):**
  - Hạn mức tối đa cho 1 món đồ cũ KTX: $1.0\text{ ETH}$ ($\approx 70.000.000\text{ VNĐ}$).
  - Mục đích kinh tế: Giới hạn phạm vi đúng với giao dịch sinh viên, ngăn chặn tội phạm lợi dụng hợp đồng làm kênh rửa tiền hoặc rửa tài sản đánh cắp.
- **G5 — Chống tấn công từ chối nhận tiền (Anti-Reentrancy & Pull-over-Push):**
  - Áp dụng nghiêm ngặt mẫu thiết kế **Checks-Effects-Interactions (CEI)**.
  - Chuyển trạng thái hợp đồng sang `Completed` hoặc `Refunded` trước khi gọi lệnh chuyển ETH ra bên ngoài.
  - Sử dụng cú pháp an toàn `call{value: amount}("")` kèm kiểm tra kết quả trả về `require(ok)`.

---

## 3. Quyền quản trị và Giới hạn đặc quyền (Governance Boundaries)

Một trong những rủi ro lớn nhất của các ứng dụng Web3 là sự lạm quyền của Admin (Centralization Risk). Hợp đồng KTXEscrow thiết kế quyền quản trị tối giản và bị kiềm tỏa chặt chẽ:

- **Admin / Trọng tài KHÔNG CÓ cửa sau rút tiền (No Backdoor / No Rug-pull):**
  - Trong toàn bộ mã nguồn hợp đồng, **hoàn toàn không có bất kỳ hàm rút tiền khẩn cấp (`emergencyWithdraw`) hay hàm chuyển số dư về ví Admin**.
  - Tiền ký quỹ chỉ có đúng 2 lối thoát duy nhất theo logic nghiệp vụ: Về ví người bán (`seller`) hoặc về ví người mua (`buyer`).
- **Phân xử tranh chấp có điều kiện (Conditional Arbitration):**
  - Trọng tài (`arbiter`) **không thể tự ý can thiệp** vào hợp đồng nếu giao dịch đang diễn ra bình thường. Trọng tài chỉ được kích hoạt quyền phân xử khi một trong hai bên (người mua hoặc người bán) chủ động gọi hàm `raiseDispute()`.
  - Quyền phán quyết của trọng tài bị giới hạn nhị phân (`uint8 decision`):
    - `decision = 1`: Chuyển tiền cho người bán (nếu xác định người mua vu khống, hàng đã giao chuẩn).
    - `decision = 2`: Hoàn tiền cho người mua (nếu xác định người bán gian lận, hàng hỏng/không giao).
    - Mọi mã phán quyết khác đều bị revert.
- **Địa chỉ ví trọng tài công khai:** Địa chỉ ví `arbiter` được chỉ định minh bạch ngay từ khi khởi tạo hợp đồng và lưu trữ bất biến (immutable), không thể bị bên bán đơn phương hoán đổi sang ví "chim mồi".

---

## 4. Tình huống người dùng bị thiệt và Cơ chế bảo hộ (Adverse Scenarios)

| Tình huống rủi ro | Đối tượng bị thiệt hại | Nguyên nhân gốc rễ | Cơ chế bảo hộ và giảm thiểu |
| :--- | :--- | :--- | :--- |
| **Kịch bản A:** Người mua mua phải món đồ hỏng ngầm nhưng quên bấm khiếu nại trước hạn 3 ngày. | Người mua (Buyer) | Sự bất cẩn / Quên thời gian của người mua khiến tiền tự động chuyển cho người bán. | Giao diện DApp hiển thị đồng hồ đếm ngược trực quan cảnh báo màu đỏ; khuyến khích sinh viên kiểm tra ngay khi nhận đồ tại sảnh KTX. |
| **Kịch bản B:** Người bán mang đồ cồng kềnh tới điểm hẹn nhưng người mua không đến và chưa nạp cọc. | Người bán (Seller) | Chi phí cơ hội và công sức vận chuyển bị lãng phí. | **Quy tắc vàng:** Người bán chỉ xuất kho và mang đồ đi giao KHI VÀ CHỈ KHI hợp đồng đã ở trạng thái `Funded` (người mua đã nạp cọc on-chain). |
| **Kịch bản C:** Hàng xảy ra tranh chấp, hai bên bất đồng ý kiến sâu sắc. | Cả hai bên | Dòng tiền bị đóng băng tạm thời trong hợp đồng. | Hợp đồng cho phép mở `raiseDispute()` để trọng tài can thiệp. Quy chế KTX quy định trọng tài phải ra phán quyết trong vòng tối đa $48\text{ giờ}$ kể từ khi nhận đủ bằng chứng. |
| **Kịch bản D:** Trọng tài có hành vi tiêu cực hoặc thiên vị người quen. | Người bị xử ép | Rủi ro con người trong cơ chế trọng tài tập trung. | Mọi phiên xử đều phải công khai bằng chứng và biên bản trên nhóm sinh viên KTX. Nếu trọng tài có dấu hiệu vi phạm đạo đức, cộng đồng sẽ tẩy chay và cập nhật địa chỉ ví trọng tài mới cho các giao dịch sau. |

---

## 5. Phản biện kinh tế và Lời giải trình của Nhóm (5 Counter-Arguments & Resolutions)

> **Prompt phản biện áp dụng:**  
> *"Bạn là người dùng thận trọng. Chỉ dựa trên SPEC và ECONOMIC_RULES dưới đây, hãy nêu 5 cách một người có thể lạm dụng quy tắc hoặc làm người khác bị thiệt. Với mỗi cách, chỉ rõ quy tắc nào chưa đủ chặt. Không viết mã."*

Dưới đây là 5 kịch bản tấn công kinh tế do phản biện đưa ra và giải pháp điều chỉnh quy tắc của nhóm:

### Phản biện 1: Người mua đã nhận hàng tốt nhưng bấm khiếu nại giả mạo (`raiseDispute`) để "tống tiền" ép người bán giảm giá off-chain.
- **Điểm quy tắc chưa chặt:** Quy tắc R4 cho phép người mua đơn phương gọi `raiseDispute()` mà không đòi hỏi bất kỳ khoản đặt cọc trách nhiệm nào, khiến chi phí thực hiện hành vi vu khống bằng 0.
- **Giải trình và Điều chỉnh của nhóm:**  
  - *Giải pháp thắt chặt:* Khi mở tranh chấp, hệ thống yêu cầu bên khiếu nại phải cung cấp mã hash bằng chứng (`bytes32 evidenceHash` - ảnh/video hàng hỏng).
  - *Chế tài rủi ro:* Nếu trọng tài thẩm định phát hiện người mua cố tình vu khống, người mua sẽ bị trừ toàn bộ điểm tín nhiệm trong hệ thống KTX và toàn bộ số tiền thanh toán lập tức được giải ngân cho người bán kèm việc cấm địa chỉ ví người mua tham gia chợ KTX.

### Phản biện 2: Người mua nhận hàng rồi cố tình "im lặng", chờ đợi người bán không biết dùng hàm `claimPaymentAfterDeadline` để tiền bị treo vĩnh viễn.
- **Điểm quy tắc chưa chặt:** Nếu quy tắc chỉ cho phép người bán rút tiền thì trường hợp người bán mất khóa ví hoặc không am hiểu công nghệ sẽ khiến tiền bị kẹt.
- **Giải trình và Điều chỉnh của nhóm:**  
  - Quy tắc R3 đã quy định hàm `claimPaymentAfterDeadline()` là `external` mở cho **bất kỳ ai** (kể cả ban quản lý KTX hoặc bạn bè của người bán) cũng có thể kích hoạt giùm để giải ngân tiền về thẳng địa chỉ ví `seller`. Điều này loại bỏ hoàn toàn khả năng người mua giam vốn người bán.

### Phản biện 3: Người bán tự đặt thời hạn kiểm tra cực ngắn (ví dụ 10 giây) để rút tiền ngay khi người mua vừa nạp cọc.
- **Điểm quy tắc chưa chặt:** Trong mẫu Ký quỹ M.1 ban đầu, tham số `_daysToConfirm` không có giới hạn dưới, người bán có thể nạp giá trị bằng 0.
- **Giải trình và Điều chỉnh của nhóm:**  
  - Nhóm đã bổ sung ràng buộc kinh tế G2 trong Smart Contract:
    $$\text{inspectionDays} \ge 1 \quad (\ge 24\text{ giờ})$$
  - Bất kỳ hợp đồng nào cố tình thiết lập thời gian ngắn hơn 1 ngày đều bị revert ngay từ hàm khởi tạo `constructor`.

### Phản biện 4: Trọng tài bị người mua hoặc người bán mua chuộc để ra phán quyết sai lệch.
- **Điểm quy tắc chưa chặt:** Trọng tài nắm quyền phân xử 100% dòng tiền mà không có cơ chế ký quỹ trách nhiệm hay đa chữ ký (multi-sig).
- **Giải trình và Chấp nhận rủi ro:**  
  - *Lý do chấp nhận rủi ro ở v0.1:* Trong phạm vi đồ dùng cũ sinh viên giá trị nhỏ (dưới 1 triệu VNĐ), chi phí triển khai hội đồng trọng tài đa chữ ký (3-of-5 multisig) là quá cao và phức tạp.
  - *Cơ chế kiềm tỏa:* Nhóm sử dụng mô hình danh tiếng xã hội (Social Reputation) tại KTX: Trọng tài là Ban chấp hành Chi hội sinh viên KTX có danh tính thực. Mọi phán quyết đều phát ra sự kiện on-chain `DisputeResolved` có lưu lại địa chỉ ví và lý do, chịu sự giám sát công khai của toàn trường.

### Phản biện 5: Người mua nạp cọc xong nhưng người bán không chịu đi giao hàng và cũng không phản hồi, khiến tiền người mua bị kẹt.
- **Điểm quy tắc chưa chặt:** Nếu chỉ có cơ chế tự động giải ngân cho người bán sau deadline, người mua sẽ bị kẹt tiền nếu người bán "bỏ trốn" không giao đồ.
- **Giải trình và Điều chỉnh của nhóm:**  
  - Nhóm bổ sung quy tắc: Trong vòng 24 giờ kể từ khi nạp cọc, nếu người bán không xác nhận giao hàng hoặc người mua không nhận được đồ, người mua có quyền kích hoạt `raiseDispute()` để thông báo "Người bán không giao hàng". Trọng tài sẽ liên hệ người bán, nếu sau 24h người bán không chứng minh được đã giao đồ, trọng tài sẽ hoàn tiền 100% cho người mua.
