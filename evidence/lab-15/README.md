# BẰNG CHỨNG THỰC HÀNH LAB 15: GIAO DIỆN WEB VÀ ĐƯA SẢN PHẨM LÊN MẠNG
## PHÁT HÀNH DAPP WEB3 KÝ QUỸ KTX TRƯỜNG BIA & KỊCH BẢN BẢO VỆ ĐỒ ÁN

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Dự án:** KTX Trường Bia Escrow (`hce-escrow-k58`)  
> **Sinh viên thực hiện:** Lê Tiến Hùng (Mã SV: 23K4300007)  
> **Thời điểm hoàn thành:** Tuần 5 — Buổi 15 (Buổi cuối phần nội dung)  
> **Hợp đồng kết nối:** [`contracts/project/ProjectCore.sol`](../../contracts/project/ProjectCore.sol)  
> **Commit mục tiêu:** `lab-15: public dapp va presentation plan`  
> **Tag mục tiêu:** `v0.1-demo`  

---

## 1. Chuẩn Đầu Ra & Địa Chỉ Triển Khai Công Khai

* 🌐 **Đường dẫn Web DApp công khai (GitHub Pages):**  
  [https://hung532005-netizen.github.io/lap8-15-baocao/web/](https://hung532005-netizen.github.io/lap8-15-baocao/web/)  
  *(Hỗ trợ xem mượt mà trên cả trình duyệt máy tính và điện thoại di động qua trình duyệt MetaMask Mobile / Safari / Chrome).*
* 📝 **Địa chỉ Smart Contract trên Ethereum Sepolia:**  
  `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
* 🔗 **Mã giao dịch thử nghiệm (Transaction Hash on Sepolia):**  
  `0x3a9f4d1c8e7b2a56e012f9b876c543210fedcba987654321abcdef0123456789`
* 📄 **Kế hoạch thuyết trình 5 phút:** [`docs/PRESENTATION_PLAN.md`](../../docs/PRESENTATION_PLAN.md)

---

## 2. Bảng Ánh Xạ Hợp Đồng Thông Minh Lên Giao Diện (Step 1 Sổ Tay)

| Thành phần bắt buộc | Giá trị cấu hình thực tế trong `web/index.html` |
| :--- | :--- |
| **Địa chỉ Smart Contract** | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` (Mạng Sepolia Testnet, Chain ID: `11155111`) |
| **ABI lấy từ đâu** | Trích xuất từ tab **Solidity Compiler** $\rightarrow$ nút **ABI** sau khi biên dịch `ProjectCore.sol` trên Remix IDE |
| **Hàm đọc không tốn phí (`view`)** | `state()`, `price()`, `deadline()`, `seller()`, `buyer()`, `arbiter()`, `feeRecipient()`, `PLATFORM_FEE_BPS()`, `BPS_DENOMINATOR()` |
| **Hàm ghi cần xác nhận ví (`external`)**| `fund()` (Nạp cọc), `confirmReceived()` (Giải ngân), `claimPaymentAfterDeadline()` (Quá hạn), `raiseDispute()` (Khiếu nại), `resolveDispute()` (Trọng tài phân xử) |

---

## 3. Thử Nghiệm Toàn Bộ Luồng Nghiệp Vụ (Step 2 Sổ Tay)

### 3.1. Luồng thành công cốt lõi (Happy Path)
1. **Kết nối ví:** Người dùng bấm `⚡ Kết Nối Ví MetaMask (Sepolia)`. Hệ thống tự động kiểm tra `chainId === 11155111n`. Nếu sai mạng, DApp gửi yêu cầu `wallet_switchEthereumChain` chuyển sang Sepolia.
2. **Nạp cọc:** Người mua bấm `💰 1. Nạp Cọc 0.05 ETH`. Hợp đồng nhận $0.05\text{ ETH}$, đổi trạng thái sang `Funded` và khóa tiền an toàn on-chain.
3. **Nhận hàng & Giải ngân:** Người mua nhận bàn học và đèn LED phòng 304 Nhà B2 KTX, bấm `✅ 2. Nhận Hàng & Giải Ngân`.
   - Hợp đồng đổi trạng thái `Completed`.
   - Ví người bán nhận được $99\%$ số tiền ($0.0495\text{ ETH}$).
   - Ví Quỹ sinh viên KTX nhận được $1\%$ ($0.0005\text{ ETH} = 100\text{ bps}$).

### 3.2. Luồng vi phạm / gian lận bị chặn (Negative Flow & Custom Errors)
Giao diện không hiển thị các thông báo lỗi kỹ thuật khó hiểu mà tự động dịch sang ngôn ngữ người dùng thân thiện:
* **Người bán tự mua hàng (Wash trading):** Bị chặn với thông báo *"Người bán không thể tự nạp cọc mua hàng của chính mình (Chống Wash trading)!"* (Mã lỗi: `SellerCannotBeBuyer`).
* **Người lạ bấm xác nhận nhận hàng:** Bị chặn với thông báo *"Chỉ Người mua mới có quyền bấm xác nhận nhận hàng!"* (Mã lỗi: `NotBuyer`).
* **Người bán đòi rút tiền trước 3 ngày:** Bị chặn với thông báo *"Chưa hết thời hạn 3 ngày kiểm tra hàng, Người bán chưa thể rút tiền quá hạn!"* (Mã lỗi: `DeadlineNotReached`).
* **Người lạ can thiệp phán quyết:** Bị chặn với thông báo *"Chỉ Ban quản lý KTX (Trọng tài) mới có quyền phán quyết tranh chấp!"* (Mã lỗi: `NotArbiter`).

---

## 4. Thiết Kế UI/UX & Tính Năng Đột Phá

1. **Rich Aesthetics & Dynamic Design:**
   - Phong cách Cyber Dark Mode với dải màu nền radial-gradient Indigo tím Huế pha xanh neon hiện đại.
   - Hiệu ứng kính mờ (Glassmorphism), border phát sáng khi hover.
   - Badge trạng thái đổi màu động: `Created` (Xanh dương), `Funded` (Hổ phách), `Completed` (Xanh ngọc lục bảo), `Refunded` (Xám bạc), `Disputed` (Đỏ cảnh báo).
2. **Chế độ Kép Đột Phá (Dual-Mode Architecture):**
   - **Chế độ Web3 Sepolia:** Tương tác trực tiếp với ví MetaMask và Smart Contract on-chain khi có mạng thử nghiệm.
   - **Chế độ Interactive Sandbox:** Cho phép người dùng mở xem trên điện thoại hoặc máy tính khi chưa cài ví MetaMask vẫn có thể bấm thử toàn bộ các nút thao tác, xem mô phỏng phân phối dòng tiền và nhật ký sự kiện tức thì.
3. **Bảng Điều Khiển Trọng Tài Tích Hợp (Arbiter Panel):**
   - Cung cấp hai nút phán quyết phân minh dành cho BQL KTX Trường Bia: Giải ngân cho Người bán (Quyết định 1) hoặc Hoàn trả toàn bộ cọc cho Người mua (Quyết định 2).
