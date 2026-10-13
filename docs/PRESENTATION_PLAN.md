# KỊCH BẢN TRÌNH BÀY ĐỒ ÁN 5 PHÚT (PRESENTATION PLAN — LAB 15)
## BẢO VỆ ĐỒ ÁN DAPP KÝ QUỸ KTX TRƯỜNG BIA ESCROW

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Dự án:** KTX Trường Bia Escrow (`hce-escrow-k58`)  
> **Thời lượng chuẩn:** 5 phút (300 giây) — Trình bày trực tiếp trên Artifact, không dùng slide tĩnh  
> **Quy chuẩn:** Bám sát tuyệt đối Mục C.4 của Sổ tay thực hành ECO2432  

---

## 1. BẢNG PHÂN VAI & THỜI LƯỢNG TRÌNH DIỄN (5 PHÚT)

| Mốc thời gian | Nội dung trình bày | Bằng chứng on-chain / Artifact bắt buộc mở | Thành viên phụ trách |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:30**<br>(30 giây) | **Người dùng và vấn đề:**<br>Sinh viên KTX mua bán đồ cũ qua MXH hay bị lừa/bùng cọc. DApp KTX Escrow giải quyết nghịch lý niềm tin. | Mở câu giới thiệu cốt lõi trong [`README.md`](../README.md) | **Trần Thị Mai**<br>(Frontend & BA) |
| **0:30 – 1:15**<br>(45 giây) | **Quy tắc kinh tế & Quyền lợi chính:**<br>Phí sàn 1% ($100\text{ bps}$), chặn dưới $10.000\text{ wei}$, thời hạn kiểm tra $3\text{ ngày}$ tự động giải ngân $99\%$ seller. | Mở [`docs/SPEC.md`](SPEC.md) và [`docs/ECONOMIC_RULES.md`](ECONOMIC_RULES.md) | **Nguyễn Văn An**<br>(Economic & QA) |
| **1:15 – 2:45**<br>(90 giây) | **Demo trực tiếp luồng cốt lõi (Live Demo):**<br>Kết nối MetaMask Sepolia $\rightarrow$ Người mua nạp cọc $0.05\text{ ETH}$ $\rightarrow$ Hợp đồng khóa tiền `Funded` $\rightarrow$ Xác nhận nhận bàn học $\rightarrow$ Hợp đồng tự trích $1\%$ Quỹ KTX và chuyển $99\%$ cho Người bán. | Mở URL Web DApp công khai:<br>[https://hung532005-netizen.github.io/lap8-15-baocao/web/](https://hung532005-netizen.github.io/lap8-15-baocao/web/) & TxHash Sepolia | **Lê Tiến Hùng**<br>(Smart Contract) |
| **2:45 – 3:30**<br>(45 giây) | **Demo ca gian lận / vi phạm bị chặn:**<br>Người bán tự nạp cọc (bị chặn bởi `SellerCannotBeBuyer`) hoặc Rút tiền trước hạn (bị chặn bởi `DeadlineNotReached`). | Mở test suite [`test/ProjectCore.test.js`](../test/ProjectCore.test.js) & log tại [`evidence/lab-13/`](../evidence/lab-13/) | **Lê Tiến Hùng** &<br>**Nguyễn Văn An** |
| **3:30 – 4:15**<br>(45 giây) | **Audit và quyết định an toàn:**<br>Vá lỗi Reentrancy bằng CEI + `nonReentrant` v5, báo cáo thẩm định chéo Nhóm 2 với 10 tiêu chí. | Mở [`docs/AUDIT_REPORT.md`](AUDIT_REPORT.md) | **Lê Tiến Hùng**<br>(Lead Auditor) |
| **4:15 – 5:00**<br>(45 giây) | **Giới hạn, bài học & Hướng phát triển:**<br>Blockchain không tự kích hoạt theo thời gian; bài học về thiết kế kinh tế on-chain. Thu hẹp phạm vi đã duyệt tại Gate Review 1. | Mở [`docs/PROJECT_PLAN.md`](PROJECT_PLAN.md) & [`docs/PRESENTATION_PLAN.md`](PRESENTATION_PLAN.md) | **Cả 3 thành viên** |

---

## 2. KỊCH BẢN THOẠI CHI TIẾT THEO TỪNG THÀNH VIÊN

### [0:00 - 0:30] — Trần Thị Mai: Bài toán thực tế
> *"Kính thưa Thầy và các bạn, sinh viên KTX Trường Bia mỗi đầu kỳ và cuối kỳ đều có nhu cầu rất lớn về mua bán, thanh lý đồ dùng cũ như quạt điện, bàn học, ấm siêu tốc. Tuy nhiên, việc giao dịch tự phát trên các nhóm Facebook/Zalo tồn tại nghịch lý niềm tin: Người mua sợ chuyển khoản trước thì bị lừa hoặc hàng hỏng; người bán sợ giao đồ trước thì bị bùng tiền. Nhóm chúng em xây dựng KTX Trường Bia Escrow nhằm loại bỏ hoàn toàn rủi ro này bằng hợp đồng thông minh ký quỹ tự động on-chain."*

### [0:30 - 1:15] — Nguyễn Văn An: Thiết kế Kinh tế
> *"Để bảo đảm tính khả thi kinh tế, hệ thống áp dụng cơ chế phí nền tảng 1% được chuẩn hóa bằng 100 basis points theo quy chuẩn tài chính Web3. Phí này nạp trực tiếp vào ví Quỹ sinh viên KTX để bảo trì hệ thống. Để tránh bẫy làm tròn số nguyên về 0, hợp đồng đặt ngưỡng chặn dưới 10.000 wei và trần 1 ETH chống rửa tiền. Người bán được bảo vệ bởi cơ chế tự động giải ngân sau 3 ngày nếu người mua chây ì không xác nhận."*

### [1:15 - 2:45] — Lê Tiến Hùng: Trình diễn DApp thật
> *"Sau đây em xin demo trực tiếp giao diện Web DApp trên mạng Sepolia. Khi sinh viên A bấm kết nối ví MetaMask, giao diện hiển thị thông tin chiếc bàn học gấp giá 0.05 ETH. Em bấm 'Nạp Cọc', hợp đồng chuyển sang trạng thái Funded và khóa tiền an toàn. Sau khi sinh viên nhận bàn học và bấm 'Nhận Hàng & Giải Ngân', hợp đồng thực hiện phân phối tức thì: 99% về ví người bán và 1% về Quỹ KTX. Mọi dữ liệu đều minh bạch trên Etherscan Sepolia."*

### [2:45 - 3:30] — Lê Tiến Hùng & Nguyễn Văn An: Demo ca gian lận bị chặn
> *"Khi người bán cố tình gian lận tự tạo đơn ảo để nâng uy tín, giao dịch lập tức bị EVM từ chối với lỗi tùy biến SellerCannotBeBuyer. Khi người bán cố tình đòi rút tiền trước khi hết 3 ngày kiểm tra, hợp đồng từ chối với lỗi DeadlineNotReached. Toàn bộ 12 ca kiểm thử đã được tự động hóa."*

### [3:30 - 4:15] — Lê Tiến Hùng: Báo cáo Kiểm toán an toàn
> *"Về mặt bảo mật, hợp đồng ProjectCore áp dụng nghiêm ngặt nguyên tắc Checks-Effects-Interactions và lá chắn ReentrancyGuard của OpenZeppelin v5. Ở bài rà soát chéo Lab 14, nhóm em đã phát hiện 6 lỗi trong hợp đồng của Nhóm 2, bao gồm lỗi kẹt tiền do dùng transfer và lỗi vòng lặp DoS, giúp nhóm bạn vá kịp thời trước khi đưa lên mạng."*

### [4:15 - 5:00] — Cả nhóm: Giới hạn & Định hướng
> *"Dự án tuân thủ nghiêm ngặt quy định không để hợp đồng vượt quá 150 dòng (chính xác 149 dòng). Nhóm nhận thức rõ giới hạn blockchain không tự thức dậy theo thời gian nên luôn cần người dùng kích hoạt giao dịch. Dự án đã sẵn sàng phục vụ sinh viên KTX Trường Bia. Nhóm xin cảm ơn Thầy và lắng nghe các câu hỏi vấn đáp!"*
