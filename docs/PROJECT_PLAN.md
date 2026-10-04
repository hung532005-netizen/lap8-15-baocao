# PROJECT PLAN — KTX Escrow (Ký Quỹ Mua Bán Đồ Cũ Sinh Viên)

> **Môn học:** ECO2432 – Web3 Starter & Phân Tích Kinh Tế Số  
> **Chủ đề Phần N:** Chủ đề 1 — Ký quỹ mua bán đồ cũ KTX  
> **Repository:** `hce-escrow-k58`  
> **Mục tiêu xuyên suốt:** Xây dựng một sản phẩm ký quỹ phi tập trung có mô hình kinh tế bền vững, bảo vệ cả người mua và người bán sinh viên trong các giao dịch trao đổi tài sản cũ.

---

## 1. Thành viên và vai trò

Dự án do **1 thành viên độc lập thực hiện**, kiêm nhiệm toàn bộ 4 vai trò (Đặc tả, Hợp đồng, Giao diện, Kiểm thử) xuyên suốt từ Lab 8 đến Lab 15:

| STT | Họ và tên | Mã sinh viên | Email / Lớp | Vai chính Lab 8–11 | Vai chính Lab 12–15 |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | **Lê Tiến Hùng** | **23K4300007** | hung532005@gmail.com / Kinh tế số | **Hợp đồng & Đặc tả** (kiêm nhiệm toàn bộ) | **Kiểm thử & Giao diện** (kiêm nhiệm toàn bộ) |
| **2** | *(Trống)* | - | - | *(Trống)* | *(Trống)* |

### Phân định trách nhiệm kiêm nhiệm của 4 vai:
1. **Đặc tả (Specification Lead):** Chịu trách nhiệm viết và cập nhật `docs/SPEC.md`, `docs/ECONOMIC_RULES.md`, bảo đảm tính nhất quán logic giữa mô hình kinh tế và mã nguồn.
2. **Hợp đồng (Smart Contract Lead):** Hiện thực hóa mã nguồn Solidity tại `contracts/project/ProjectCore.sol`, bảo đảm tuân thủ quy chuẩn Checks-Effects-Interactions, tối ưu chi phí lưu trữ Storage (SSTORE) và Gas.
3. **Giao diện (Frontend Lead):** Xây dựng giao diện web tương tác tại `web/index.html` kết nối thư viện `ethers.js`, tích hợp ví MetaMask, hiển thị rõ ràng trạng thái giao dịch cho sinh viên.
4. **Kiểm thử (Testing & QA Lead):** Thiết kế các ca kiểm thử biên (edge cases), ca kiểm thử gian lận kinh tế, chạy thử nghiệm trên Remix IDE / Hardhat và ghi nhận nhật ký `docs/AI_JOURNAL.md`.

---

## 2. Người dùng và vấn đề

### 2.1. Người dùng chính
- **Sinh viên nội trú KTX và sinh viên trường Đại học Kinh tế:** Nhóm đối tượng có nhu cầu thanh lý và mua sắm đồ dùng học tập, sinh hoạt đã qua sử dụng (giáo trình cũ, xe đạp, ấm siêu tốc, tủ vải, bàn gấp, quạt điện, màn hình máy tính...).
- **Đặc điểm hành vi của người dùng:** Nhạy cảm cao với chi phí (không chấp nhận phí giao dịch đắt), giao dịch giữa những người chưa từng quen biết nhau, chủ yếu hẹn gặp tại khuôn viên KTX hoặc cổng trường.

### 2.2. Vấn đề cần giải quyết
- **Nghịch lý niềm tin (Trust Paradox):**
  - Người mua sợ thanh toán trước: Nguy cơ người bán "bùng cọc", chặn liên lạc, hoặc giao hàng hư hỏng nặng không đúng mô tả.
  - Người bán sợ giao hàng trước: Nguy cơ người mua nhận hàng xong lấy lý do để trì hoãn trả tiền, quỵt nợ, hoặc kỳ kèo ép giá vào phút chót khi đồ đã mang tới nơi.
- **Chi phí xác minh và rủi ro giao dịch (Transaction Costs):** Các kênh trung gian Web2 (nhóm Facebook, Zalo Chợ KTX) hoàn toàn không có cơ chế giữ tiền trung gian tin cậy, sinh viên thường xuyên đăng bài "bóc phốt" nhau gây mất đoàn kết và thiệt hại tài chính.

### 2.3. Sản phẩm cuối nhìn thấy được (Visible Deliverable)
- **Ứng dụng DApp Web3 KTX Escrow:**
  - Giao diện Web trực quan kết nối ví MetaMask trên mạng thử nghiệm Sepolia / Base Sepolia.
  - Người bán tạo đơn hàng với mô tả món đồ và giá tiền niêm yết (ETH/Wei).
  - Người mua khóa tiền cọc thanh toán vào Smart Contract `ProjectCore.sol`. Tiền nằm an toàn trong quỹ ký quỹ, không ai (kể cả Admin) được tự tiện rút.
  - Người mua sau khi nhận đồ và kiểm tra thực tế sẽ bấm nút **"Xác nhận đã nhận hàng" (Confirm Received)** để Smart Contract tự động giải ngân cho người bán.
  - Hệ thống tích hợp cơ chế bảo vệ kép:
    - *Auto-release:* Nếu quá hạn thời gian nhận hàng mà người mua không khiếu nại, tiền tự động giải ngân cho người bán (chống người mua chây ì giam vốn).
    - *Dispute Resolution:* Nếu hàng lỗi hoặc gian lận, các bên có quyền mở trạng thái tranh chấp để trọng tài sinh viên KTX can thiệp xử lý.

---

## 3. Mốc tiến độ bắt buộc (Milestones)

| Mốc | Tên nhiệm vụ | Kết quả đầu ra bắt buộc | Trách nhiệm chính |
| :---: | :--- | :--- | :---: |
| **Lab 8** | Khởi tạo codebase nhóm & Quy tắc kinh tế | Repo nhóm chuẩn B.6, `PROJECT_PLAN.md`, `SPEC.md`, `ECONOMIC_RULES.md`, cam kết 1 câu | Toàn bộ nhóm |
| **Lab 9** | Hợp đồng lõi biên dịch được | `contracts/project/ProjectCore.sol` biên dịch 0 lỗi trên Remix, đo gas thực tế | Hùng (Contract) |
| **Lab 10** | Audit và sửa lỗi có bằng chứng | Kiểm tra Reentrancy, Checks-Effects-Interactions, log `AI_JOURNAL.md` | An (Testing) |
| **Lab 11** | Quy tắc kinh tế chạy đúng | Test phí ký quỹ (1%), phạt bùng kèo, hoàn tiền sau hạn | Hùng (Contract) |
| **Lab 12** | **Gate Review 1** | Báo cáo tiến độ giữa kỳ, demo tương tác hợp đồng trên Remix trước lớp | Toàn bộ nhóm |
| **Lab 13** | Test ca tấn công & gian lận | Kịch bản tấn công: giam vốn, spam đơn, claim tiền sai vai trò | Hùng (Audit) |
| **Lab 14** | Audit chéo (Peer-audit) | Biên bản đánh giá chéo mã nguồn và kinh tế của nhóm bạn | An (Contract) |
| **Lab 15** | URL DApp công khai & Bảo vệ | Web DApp hoàn chỉnh chạy trên Vercel/GitHub Pages, slide thuyết trình | Mai (Frontend) |

---

## 4. Cam kết một câu của nhóm (Team Manifesto)
> **“Nhóm xây DApp ký quỹ hợp đồng thông minh cho sinh viên KTX để loại bỏ rủi ro bị bùng tiền hoặc lừa đảo khi mua bán đồ dùng cũ.”**
