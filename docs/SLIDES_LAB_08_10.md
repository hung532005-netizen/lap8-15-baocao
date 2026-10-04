# BÁO CÁO TIẾN TRÌNH LAB 08 – LAB 10: DỰ ÁN KTX TRƯỜNG BIA ESCROW

> **Môn học:** Tiền điện tử & Hợp đồng thông minh (ECO2432) — Web3 Starter  
> **Sinh viên thực hiện:** Lê Tiến Hùng (Mã SV: `23K4300007`) — Lớp Kinh tế số K58  
> **Kho lưu trữ GitHub:** [https://github.com/hung532005-netizen/lap8-15-baocao](https://github.com/hung532005-netizen/lap8-15-baocao)  
> **Phiên bản:** v1.0 (Hoàn thành Lab 8, Lab 9, Lab 10)

---

## 📌 TỔNG HỢP NỘI DUNG TIẾN TRÌNH THỰC HIỆN (LAB 8 – LAB 10)

### 1. Lab 08: Thiết kế Quy tắc Kinh tế & Khởi tạo Codebase Nhóm
- **Bối cảnh & Đề tài:** Chọn Chủ đề 1 thuộc Phần N — **Ký quỹ mua bán đồ cũ KTX Trường Bia (Đại học Huế)**.
- **Bài toán thực tế:** Giải quyết triệt để rủi ro mất tiền cọc, nhận hàng kém chất lượng hoặc người mua giam vốn người bán khi thanh lý đồ dùng nội trú (giáo trình, bàn học, quạt, xe đạp...).
- **Xây dựng bộ đặc tả v0.1:**
  - Lập [docs/SPEC.md](file:///d:/lap8-15%20doan/docs/SPEC.md) với 5 quy tắc nghiệp vụ kiểm thử được (R1–R5), xác định rõ đầu vào, đầu ra, máy trạng thái (`Created` $\rightarrow$ `Funded` $\rightarrow$ `Completed` / `Refunded` / `Disputed`) và các trường hợp biên.
  - Lập [docs/ECONOMIC_RULES.md](file:///d:/lap8-15%20doan/docs/ECONOMIC_RULES.md): Xác định dòng tiền, trích 1% phí dịch vụ (100 bps) cho quỹ KTX, thiết lập trần giao dịch 1 ETH chống rửa tiền.
- **Phản biện kinh tế với AI:**
  - AI từng đề xuất hàm tự động hoàn tiền cho người mua sau deadline (`refundAfterDeadline`). Sinh viên đã phát hiện và phản biện: cơ chế này tạo sơ hở cho người mua "im lặng" để vừa lấy đồ vừa rút lại tiền.
  - Sinh viên đổi thành `claimPaymentAfterDeadline()` (tiền tự động về người bán sau thời hạn kiểm tra nếu không có khiếu nại).
- **Khởi tạo Codebase:** Cấu hình quy ước bắt buộc tại [AGENTS.md](file:///d:/lap8-15%20doan/AGENTS.md) và commit khởi tạo: `lab-08: khoi tao codebase nhom va dac ta v0.1`.

### 2. Lab 09: Hợp đồng Két Tiết kiệm Khóa Thời gian (TimeLockVault)
- **Học kỹ thuật nền tảng:** Phân tích và biên dịch hợp đồng ký gửi có điều kiện [contracts/training/TimeLockVault.sol](file:///d:/lap8-15%20doan/contracts/training/TimeLockVault.sol) theo 5 quy tắc [contracts/training/SPEC.md](file:///d:/lap8-15%20doan/contracts/training/SPEC.md).
- **Nắm vững 4 nguyên lý kỹ thuật Web3:**
  1. *Checks - Effects - Interactions (CEI):* Kiểm tra điều kiện $\rightarrow$ Cập nhật trạng thái / Emit event $\rightarrow$ Chuyển ETH ra ngoài sau cùng nhằm triệt tiêu lỗi Reentrancy.
  2. *Custom Error:* Dùng `error NotOwner()`, `error StillLocked(...)` thay cho `require("chuoi dai")` để tiết kiệm gas deployment và cung cấp dữ liệu lỗi rõ ràng.
  3. *Chuyển tiền an toàn bằng `.call`:* Dùng `payable(owner).call{value: amount}("")` thay cho `transfer` để tránh bẫy 2.300 gas khi bên nhận là smart contract.
  4. *Sự kiện có `indexed`:* Cho phép lọc và tra cứu lịch sử giao dịch on-chain theo địa chỉ ví.
- **Thực nghiệm trên Remix VM:** Đặt `lockDurationSeconds = 120` (2 phút), thực hiện chu trình: Deploy $\rightarrow$ Deposit 1 ETH $\rightarrow$ Thử Withdraw ngay (bị từ chối với lỗi `StillLocked`) $\rightarrow$ Sau 2 phút Withdraw thành công.
- **Đo phí Gas thực tế:** Deploy (~200.000 gas), Deposit (~25.000 gas), Withdraw bị chặn (~22.000 gas), Withdraw thành công (~30.000 gas), ghi nhận tại [evidence/lab-09/README.md](file:///d:/lap8-15%20doan/evidence/lab-09/README.md).
- **Commit:** `lab-09: contract loi bien dich duoc`.

### 3. Lab 10: Rà soát Mã nguồn AI Sinh ra (Audit & Vá lỗi)
- **Rà soát hợp đồng bài luyện [contracts/training/VaultBuggy.sol](file:///d:/lap8-15%20doan/contracts/training/VaultBuggy.sol):**
  - Chỉ ra 4 lỗi cài sẵn: (1) Đảo ngược toán tử so sánh thời gian `<=`; (2) Thiếu kiểm tra phân quyền `owner` trong `withdraw`; (3) Ngộ nhận biến `private` là bí mật; (4) Dùng `transfer` và thiếu sự kiện.
  - AI chỉ phát hiện được 3 lỗi cú pháp, sinh viên trực tiếp phát hiện lỗ hổng phân quyền nghiêm trọng.
- **Thực nghiệm khai thác ô nhớ EVM Storage:**
  - Triển khai `VaultBuggy` với `pin = 123456`.
  - Dùng lệnh `eth_getStorageAt` truy xuất trực tiếp ô nhớ `0x2` từ console trình duyệt:
    `rawStorage = 0x...0001e240` $\rightarrow$ giải mã ra `123456`.
  - Khẳng định bài học: Từ khóa `private` chỉ ngăn cách giữa các contract, không bảo mật dữ liệu trước người dùng hay node mạng.
- **Audit hợp đồng sản phẩm [contracts/project/ProjectCore.sol](file:///d:/lap8-15%20doan/contracts/project/ProjectCore.sol):**
  - *Vá lỗi 1 (Thứ tự CEI):* Trong `resolveDispute(1)`, đưa lệnh `emit DisputeResolved` lên trước hàm `_distributeFunds()` (vốn có chứa lệnh `call`).
  - *Vá lỗi 2 (Xung đột lợi ích kinh tế):* Bổ sung kiểm tra `_seller != _arbiter` trong constructor và chặn `arbiter` gọi hàm `fund()` làm người mua để trục lợi phán quyết.
  - Hợp đồng đạt đúng 146 dòng (<150 dòng) và biên dịch sạch 0 lỗi với Solc 0.8.20+.
- **Commit:** `lab-10: audit va sua loi project core`.

---

# 🎞️ NỘI DUNG 5 SLIDE THUYẾT TRÌNH (DÙNG CHO NOTEBOOK / SLIDES)

<!-- SLIDE 1 -->
## 🖥️ SLIDE 1: GIỚI THIỆU ĐỀ TÀI & KHỞI TẠO DỰ ÁN (LAB 08)
- **Tên đề tài:** KTX Trường Bia — Sàn Ký Quỹ Mua Bán Đồ Cũ Sinh Viên (Chủ đề 1, Phần N).
- **Vấn đề thực tế (Problem):**
  - Sinh viên nội trú KTX Trường Bia & Đại học Kinh tế Huế thường xuyên mua bán thanh lý đồ dùng học tập, đồ dùng phòng ở.
  - Nỗi sợ mất cọc: Giao tiền trước thì sợ bên bán bùng hàng hoặc giao hàng hỏng; Giao hàng trước thì sợ bên mua chây ì không trả tiền.
- **Giải pháp On-chain (Solution):**
  - Xây dựng DApp ký quỹ (Escrow) tự động bằng Smart Contract. Tiền nạp cọc được khóa an toàn trên mạng Sepolia, chỉ giải ngân khi người mua trực tiếp xác nhận đã nhận đồ.
- **Hồ sơ khởi tạo:**
  - Kho mã nguồn: `https://github.com/hung532005-netizen/lap8-15-baocao`
  - Quy ước dự án: Thiết lập [AGENTS.md](file:///d:/lap8-15%20doan/AGENTS.md) nghiêm ngặt (Solidity `^0.8.20`, CEI, custom error, không ghi API key).
  - Thành viên & Phân vai: Lê Tiến Hùng (23K4300007) kiêm nhiệm 4 vai trò (Đặc tả, Hợp đồng, Kiểm thử, Giao diện).

<!-- SLIDE 2 -->
## 🖥️ SLIDE 2: ĐẶC TẢ NGHIỆP VỤ & QUY TẮC KINH TẾ (LAB 08)
- **5 Quy tắc nghiệp vụ cốt lõi ([docs/SPEC.md](file:///d:/lap8-15%20doan/docs/SPEC.md)):**
  - `R1`: Người mua nạp đúng $100\%$ giá niêm yết vào hợp đồng để chuyển sang trạng thái `Funded`.
  - `R2`: Người mua nhận đồ hài lòng $\rightarrow$ Bấm `confirmReceived()` $\rightarrow$ Giải ngân $99\%$ cho người bán, $1\%$ về quỹ KTX.
  - `R3`: Hết hạn kiểm tra ($3\text{ ngày}$) mà người mua không phản hồi $\rightarrow$ Kích hoạt `claimPaymentAfterDeadline()` tự động giải ngân cho người bán (chống giam vốn).
  - `R4`: Nếu có tranh chấp/hàng hỏng $\rightarrow$ Gọi `raiseDispute()` trước hạn để đóng băng quỹ.
  - `R5`: Trọng tài KTX (`arbiter`) gọi `resolveDispute()` ra phán quyết minh bạch: Trả người bán hoặc Hoàn người mua.
- **Quy tắc thiết kế kinh tế ([docs/ECONOMIC_RULES.md](file:///d:/lap8-15%20doan/docs/ECONOMIC_RULES.md)):**
  - Phí dịch vụ: $1\%$ ($100$ basis points) dùng duy trì quỹ sinh viên nghèo KTX Trường Bia.
  - Trần giá giao dịch: Giới hạn tối đa $1\text{ ETH}$/đơn hàng nhằm chống lạm dụng rửa tiền.
  - Phản biện sắc bén với AI: Bác bỏ hàm hoàn tiền tự động sai trái của AI để bảo vệ quyền lợi chính đáng của người bán.

<!-- SLIDE 3 -->
## 🖥️ SLIDE 3: HỌC KỸ THUẬT KÉT KHÓA THỜI GIAN TIMELOCK (LAB 09)
- **Hợp đồng huấn luyện:** [contracts/training/TimeLockVault.sol](file:///d:/lap8-15%20doan/contracts/training/TimeLockVault.sol) (Két tiết kiệm khóa thời gian).
- **4 Kỹ thuật Web3 cốt lõi được tiếp thu:**
  1. *Checks - Effects - Interactions (CEI):* Kiểm tra quyền và thời gian $\rightarrow$ Emit sự kiện $\rightarrow$ Dùng lệnh `call` chuyển tiền sau cùng.
  2. *Custom Error:* Thay thế chuỗi thông báo dài bằng `error NotOwner()`, `error StillLocked(unlockAt, currentTime)` giúp tiết kiệm đáng kể gas bytecode.
  3. *Chuyển ETH an toàn:* Dùng cú pháp `call{value: ...}("")` thay cho `transfer()` để triệt tiêu giới hạn cứng 2.300 gas.
  4. *Indexing Event:* Gán `indexed` cho trường địa chỉ để DApp và Etherscan lọc dữ liệu nhanh chóng.
- **Thực nghiệm đo gas trên Remix VM (với thời gian khóa 120s):**
  - Deploy hợp đồng: `~200.000 gas`
  - Nạp tiền (Deposit 1 ETH): `~25.000 gas`
  - Cố tình rút sớm ($t < 120s$): Bị từ chối chính xác với lỗi `StillLocked`, tốn `~22.000 gas`.
  - Rút thành công ($t \ge 120s$): Chủ két nhận đủ 1 ETH, tốn `~30.000 gas`.

<!-- SLIDE 4 -->
## 🖥️ SLIDE 4: AUDIT MÃ NGUỒN & THỰC NGHIỆM ĐỌC Ô NHỚ EVM (LAB 10)
- **Audit bài tập `VaultBuggy.sol` — Sinh viên vượt trội hơn AI:**
  - AI chỉ bắt được lỗi logic thời gian `<=` và lỗi kỹ thuật `transfer`.
  - Sinh viên phát hiện lỗ hổng tối nghiêm trọng: Hàm `withdraw()` hoàn toàn không kiểm tra `msg.sender == owner`, cho phép bất kỳ kẻ lạ nào rút sạch tiền trong két!
- **Thực nghiệm khai thác ô nhớ lưu trữ (Storage Layout):**
  - Biến `emergencyPin = 123456` khai báo `private` ở Slot `0x2`.
  - Chạy hàm RPC `eth_getStorageAt(contract, "0x2", "latest")` trên console trình duyệt $\rightarrow$ Đọc được giá trị hex `0x01e240` (chính là số thập phân $123.456$).
  - *Bài học xương máu:* Mọi dữ liệu trên Blockchain đều công khai 100%, không bao giờ lưu mật khẩu/PIN trên hợp đồng.
- **Nâng cấp và vá lỗi hợp đồng sản phẩm [contracts/project/ProjectCore.sol](file:///d:/lap8-15%20doan/contracts/project/ProjectCore.sol):**
  - Khắc phục lỗi CEI: Đưa lệnh `emit DisputeResolved(...)` lên trước lệnh chuyển tiền `_distributeFunds()`.
  - Khắc phục xung đột lợi ích: Chặn người bán kiêm trọng tài (`_seller == _arbiter`), chặn trọng tài làm người mua (`msg.sender == arbiter`).

<!-- SLIDE 5 -->
## 🖥️ SLIDE 5: ĐÁNH GIÁ SỨC KHỎE REPO & LỘ TRÌNH KẾ TIẾP (LAB 11 – 15)
- **Hiện trạng Codebase sản phẩm:**
  - File hợp đồng: [contracts/project/ProjectCore.sol](file:///d:/lap8-15%20doan/contracts/project/ProjectCore.sol) đạt **146 dòng** (tuân thủ quy định $< 150$ dòng của Sổ tay).
  - Trình biên dịch: Solidity `^0.8.20`, biên dịch sạch $0$ lỗi, $0$ cảnh báo.
  - Đồng bộ Git: Tự động đồng bộ lên GitHub nhánh `main` qua [sync.bat](file:///d:/lap8-15%20doan/sync.bat).
- **Mức độ sẵn sàng cho Gate Review 1 (Lab 12):**
  - ✅ Có đầy đủ 4 tài liệu bắt buộc: [SPEC.md](file:///d:/lap8-15%20doan/docs/SPEC.md), [ECONOMIC_RULES.md](file:///d:/lap8-15%20doan/docs/ECONOMIC_RULES.md), [PROJECT_PLAN.md](file:///d:/lap8-15%20doan/docs/PROJECT_PLAN.md), [AI_JOURNAL.md](file:///d:/lap8-15%20doan/docs/AI_JOURNAL.md).
  - ✅ Đã có bằng chứng thực nghiệm và đo phí gas tại thư mục `evidence/lab-09/` và `evidence/lab-10/`.
- **Lộ trình triển khai tiếp theo:**
  - **Lab 11:** Cài quy tắc kinh tế vào sản phẩm & bộ ca test vi phạm / thành công.
  - **Lab 12:** Vượt qua cổng duyệt Gate Review 1 trước lớp.
  - **Lab 13:** Kiểm thử tấn công Reentrancy (vụ mất 3.6M ETH) và vá lỗi bằng ReentrancyGuard.
  - **Lab 14 & 15:** Rà soát chéo giữa các nhóm, hoàn thiện giao diện DApp Web3 và triển khai GitHub Pages.
