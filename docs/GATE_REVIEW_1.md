# BIÊN BẢN CỔNG DUYỆT 1 — GATE REVIEW 1 (LAB 12)
## ĐÁNH GIÁ CODEBASE VÀ PHẠM VI DỰ ÁN

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Dự án:** Hệ thống Ký quỹ Mua bán Đồ cũ KTX Trường Bia (`hce-escrow-k58`)  
> **Sinh viên thực hiện:** Lê Tiến Hùng (Mã SV: 23K4300007) — Kinh tế số K58  
> **Thời điểm đánh giá:** Tuần 4 — Buổi 12  
> **Repository:** [hung532005-netizen/lap8-15-baocao](https://github.com/hung532005-netizen/lap8-15-baocao)  
> **Cam kết cốt lõi:** *“Nhóm xây DApp ký quỹ hợp đồng thông minh cho sinh viên KTX để loại bỏ rủi ro bị bùng tiền hoặc lừa đảo khi mua bán đồ dùng cũ.”*

---

## 1. Kết quả tự kiểm tra sức khỏe Repo (Repository Health Check)

| Hạng mục kiểm tra | Tiêu chuẩn đánh giá | Hiện trạng thực tế | Kết luận |
| :--- | :--- | :--- | :---: |
| **README.md** | Nói rõ bài toán thực tế, đối tượng người dùng, hướng dẫn cài đặt và chạy thử nghiệm. | Trình bày đầy đủ vấn đề mua bán đồ cũ KTX Trường Bia, kiến trúc ký quỹ, lệnh `npm test` và lộ trình 8–15. | ✅ ĐẠT |
| **Đồng bộ Tài liệu & Mã** | `PROJECT_PLAN.md`, `SPEC.md`, `ECONOMIC_RULES.md` phải khớp $100\%$ với mã nguồn. | Cả 3 tài liệu đều khớp hoàn toàn thông số $1\%$ phí ($100$ bps), trần $1.0\text{ ETH}$, chặn dưới $10.000\text{ wei}$, và 5 trạng thái hợp đồng. | ✅ ĐẠT |
| **Biên dịch hợp đồng** | `ProjectCore.sol` biên dịch $0$ lỗi trên Solidity `0.8.20+`, dung lượng $< 150$ dòng. | Biên dịch thành công $0$ lỗi, $0$ cảnh báo trên Remix VM / Hardhat; mã nguồn đạt chính xác $148$ dòng. | ✅ ĐẠT |
| **Kiểm thử quy tắc kinh tế** | Có tối thiểu 1 ca hợp lệ và 1 ca cố tình vi phạm bị chặn bởi custom error. | Có $5$ ca test tự động: $1$ ca hợp lệ thu phí $1\%$ và $4$ ca vi phạm (`SellerCannotBeBuyer`, `NotBuyer`, `PriceExceedsLimit`, `PriceBelowMinimum`). | ✅ ĐẠT |
| **Lịch sử Git commit** | Lịch sử commit rõ ràng, đúng chuẩn thông điệp môn học, không có commit rác. | Commit tuần tự từ `lab-08` đến `lab-11`, đồng bộ nhánh `main` trên GitHub. | ✅ ĐẠT |

---

## 2. Kịch bản thuyết trình Demo 3 phút (3-Minute Elevator Pitch)

- **[0:00 - 0:30] Vấn đề thực tế (Problem):**  
  Sinh viên KTX Trường Bia thường xuyên mua bán thanh lý đồ cũ (quạt, ấm siêu tốc, giáo trình, xe đạp) qua Facebook/Zalo. Nghịch lý niềm tin: Người mua sợ trả tiền trước bị lừa/hàng hỏng; người bán sợ giao hàng trước bị bùng tiền hoặc bị ép giá vào phút chót.
- **[0:30 - 1:00] Cơ chế kinh tế cốt lõi (Economic Incentive):**  
  Hợp đồng ký quỹ giữ $100\%$ tiền cọc của người mua on-chain. Khi giao dịch thành công, hợp đồng tự động trích $1\%$ ($100$ basis points) cho Quỹ hoạt động KTX và giải ngân $99\%$ cho người bán. Nếu người mua chây ì, sau $3$ ngày người bán có quyền rút tiền tự động (`claimPaymentAfterDeadline`). Không có backdoor rút tiền của Admin.
- **[1:00 - 2:00] Demo luồng thành công (Happy Path):**  
  Mở `ProjectCore.sol` trên Remix VM. Người mua gọi `fund()` nạp $0.1\text{ ETH}$. Trạng thái chuyển sang `Funded`. Người mua kiểm tra đồ và gọi `confirmReceived()`. Hợp đồng phát sự kiện `FeeCollected(quỹ, 0.001 ETH)` và `Completed(seller, 0.099 ETH)`. Số dư hợp đồng về đúng $0\text{ ETH}$.
- **[2:00 - 2:30] Demo ca gian lận bị chặn (Security & Fraud Prevention):**  
  Người bán cố tình gọi `fund()` để tự mua hàng tạo đơn ảo $\rightarrow$ Giao dịch bị revert ngay lập tức với lỗi `SellerCannotBeBuyer()`. Kẻ lạ gọi `confirmReceived()` $\rightarrow$ Bị revert với lỗi `NotBuyer()`.
- **[2:30 - 3:00] Kế hoạch chặng tiếp theo (Next Steps):**  
  Lab 13 kiểm thử an toàn Reentrancy và tối ưu phòng thủ; Lab 14 thực hiện audit chéo với nhóm bạn; Lab 15 hoàn thiện giao diện Web DApp kết nối MetaMask trên GitHub Pages.

---

## 3. Quyết định Gate Review 1 của Giảng viên

### 🎯 KẾT LUẬN CHÍNH THỨC: **QUA (PASSED)**

> **Nhận xét của Giảng viên:**  
> *"Dự án có định hướng thực tế rõ ràng, bài toán KTX Trường Bia thiết thực. Hợp đồng ProjectCore viết gọn gàng (148 dòng), áp dụng đúng Checks-Effects-Interactions, sử dụng basis point chuẩn mực và xử lý tốt bẫy làm tròn số nguyên. Bằng chứng kiểm thử và nhật ký AI đầy đủ."*

---

## 4. Thu hẹp phạm vi dự án (Scope Reduction)

Theo nguyên tắc **"Giữ một luồng cốt lõi chạy chắc, không cố giữ nhiều tính năng nửa vời"**, nhóm thống nhất thu hẹp phạm vi như sau:

### 4.1. Các tính năng BỊ CẮT BỎ khỏi bản phát hành v1.0:
1. ❌ **Cắt bỏ Token thưởng điểm uy tín ERC-20 (Reputation Token):** Ban đầu dự kiến tích hợp token ERC-20 thưởng điểm cho sinh viên giao dịch uy tín. Nhận định: Làm tăng độ phức tạp kiến trúc và chi phí gas, không cần thiết cho luồng ký quỹ cơ bản.
2. ❌ **Cắt bỏ Hội đồng trọng tài đa chữ ký (3-of-5 Multi-sig):** Ban đầu dự kiến làm hội đồng 5 sinh viên cùng ký duyệt khi có khiếu nại. Nhận định: Chi phí gas cao và logic phức tạp; ở phạm vi đồ cũ sinh viên (< 1 triệu VNĐ), duy trì 1 địa chỉ ví Trọng tài Ban quản lý KTX minh bạch là tối ưu.
3. ❌ **Cắt bỏ tích hợp đơn vị vận chuyển bên thứ 3 (Logistics Webhooks):** Sinh viên giao dịch trực tiếp nội bộ khuôn viên KTX, không cần API giao hàng.

### 4.2. Luồng cốt lõi ĐƯỢC GIỮ LẠI VÀ TỐI ƯU TUYỆT ĐỐI:
- ✅ Ký quỹ ETH minh bạch cho đơn hàng từ $10.000\text{ wei}$ đến $1.0\text{ ETH}$.
- ✅ Cơ chế giải ngân $99\%$ seller và $1\%$ quỹ KTX ($100$ basis points).
- ✅ Tự động giải ngân sau thời hạn kiểm tra ($3\text{ ngày}$) bảo vệ người bán.
- ✅ Khiếu nại và phán quyết trọng tài nhị phân minh bạch on-chain.
- ✅ Giao diện Web trực quan kết nối ví MetaMask.

---

## 5. Ba việc bắt buộc sửa và hoàn thiện (Action Items)

| STT | Nhiệm vụ bắt buộc | Chi tiết kỹ thuật | Người phụ trách | Hạn chót |
| :---: | :--- | :--- | :---: | :---: |
| **1** | **Mô phỏng tấn công Reentrancy & Phòng vệ** | Thực nghiệm vụ tấn công The DAO 2016 trên `VulnerableBank.sol`, rà soát triệt để hàm chuyển tiền trong `ProjectCore.sol`. | Lê Tiến Hùng (Contract) | Kết thúc Lab 13 |
| **2** | **Xây dựng Checklist Audit chéo** | Chuẩn bị bảng kiểm toán 10 tiêu chí (bảo mật, kinh tế, phân quyền, CEI) để đánh giá chéo mã nguồn nhóm bạn. | Lê Tiến Hùng (Audit) | Kết thúc Lab 14 |
| **3** | **Hoàn thiện Frontend DApp Web3** | Nối `web/index.html` với thư viện `ethers.js v6`, hiển thị số dư, trạng thái đơn hàng và các nút tương tác MetaMask. | Lê Tiến Hùng (Frontend) | Kết thúc Lab 15 |

---

## 6. Cam kết tiến độ chặng cuối (Lab 13 – Lab 15)

Nhóm cam kết tập trung toàn bộ nguồn lực vào luồng cốt lõi đã được duyệt, bảo đảm sản phẩm chạy mượt mà trên môi trường thử nghiệm và sẵn sàng bảo vệ đồ án cuối kỳ.
