# KTX Escrow — Sàn Ký Quỹ Mua Bán Đồ Cũ Sinh Viên

> **Môn học:** ECO2432 – Web3 Starter & Phân Tích Kinh Tế Số  
> **Chủ đề Phần N:** Chủ đề 1 — Ký quỹ mua bán đồ cũ KTX  
> **Kho lưu trữ:** `hce-escrow-k58`  
> **Mạng thử nghiệm:** Ethereum Sepolia / Base Sepolia  

---

## 🎯 BỐN CÂU HỎI CỐT LÕI (Chuẩn đầu ra Lab 08)

### 1. Nhóm làm gì?
Xây dựng ứng dụng phi tập trung **KTX Escrow (DApp Ký quỹ)** dựa trên Smart Contract. Hệ thống đóng vai trò bên thứ ba độc lập tự động khóa tiền cọc thanh toán khi sinh viên mua bán đồ dùng cũ (giáo trình, quạt điện, bàn học, xe đạp...), và chỉ giải ngân cho người bán khi người mua đã trực tiếp kiểm tra và xác nhận nhận đồ thành công.

### 2. Cho ai?
Dành cho **sinh viên nội trú KTX và sinh viên trường Đại học Kinh tế (HCE)** tham gia vào thị trường mua bán, thanh lý vật dụng cũ trong khuôn viên trường và ký túc xá.

### 3. Quy tắc chính là gì?
- **Khóa cọc an toàn:** Người mua nạp đúng $100\%$ số tiền niêm yết vào Smart Contract. Tiền nằm trong két ký quỹ on-chain, không ai (kể cả Admin) được tự ý rút.
- **Xác nhận giải ngân:** Người mua nhận đồ thực tế, kiểm tra đúng chất lượng cam kết thì bấm **"Xác nhận đã nhận hàng"** $\rightarrow$ Hệ thống tự động chuyển $99\%$ tiền cho người bán và $1\%$ phí dịch vụ về quỹ hỗ trợ KTX.
- **Tự động thanh toán chống giam vốn:** Sau thời hạn kiểm tra ($3\text{ ngày}$), nếu người mua không xác nhận cũng không khiếu nại, tiền tự động giải ngân cho người bán để bảo vệ người bán.
- **Cơ chế khiếu nại & Trọng tài:** Nếu có gian lận hoặc hàng lỗi ngầm, một trong hai bên có quyền mở tranh chấp (`raiseDispute`) để trọng tài Ban đại diện KTX vào phân xử minh bạch.

### 4. Thành viên và phân công trách nhiệm

> **Hình thức thực hiện:** Dự án do **1 thành viên độc lập thực hiện**, kiêm nhiệm toàn bộ 4 vai trò của dự án (Đặc tả, Hợp đồng, Giao diện, Kiểm thử) xuyên suốt từ Lab 8 đến Lab 15.

| STT | Họ và tên | Mã sinh viên | Lớp | Vai chính Lab 8–11 | Vai chính Lab 12–15 |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | **Lê Tiến Hùng** | **23K4300007** | Kinh tế số | **Hợp đồng & Đặc tả** (kiêm nhiệm toàn bộ) | **Kiểm thử & Giao diện** (kiêm nhiệm toàn bộ) |
| **2** | *(Trống)* | - | - | *(Trống)* | *(Trống)* |

---

## 📂 Cấu trúc Repository (Chuẩn Phần B.6)

```text
hce-escrow-k58/
├── README.md                 # Giới thiệu sản phẩm, 4 câu cốt lõi và thông tin thành viên
├── AGENTS.md                 # Quy ước và tiêu chuẩn làm việc với công cụ AI
├── package.json              # Cấu hình dự án và dependencies
├── prompt_templates.md       # Các mẫu câu lệnh AI có tiêu chí kiểm thử
├── docs/
│   ├── PROJECT_PLAN.md       # Kế hoạch chi tiết, phân vai kiêm nhiệm, 8 mốc dự án
│   ├── SPEC.md               # Đặc tả kỹ thuật v0.1 với 5 quy tắc và các ngoại lệ
│   ├── ECONOMIC_RULES.md     # 4 mục quy tắc kinh tế + 5 phản biện & giải trình
│   ├── AI_JOURNAL.md         # Nhật ký tương tác AI, lỗ hổng phát hiện và cách sửa
│   └── PRESENTATION_PLAN.md  # Kịch bản demo sản phẩm
├── contracts/
│   ├── training/             # Bài mẫu học kỹ thuật (TimeLockVault, ClassPoint...)
│   └── project/
│       └── ProjectCore.sol   # Hợp đồng ký quỹ lõi (<150 dòng, Checks-Effects-Interactions)
├── test/                     # Kịch bản kiểm thử luồng nghiệp vụ & gian lận
├── web/
│   └── index.html            # Giao diện Web DApp tương tác ví MetaMask
└── evidence/
    └── lab-08/               # Ảnh chụp bằng chứng commit và kết quả chạy
```

---

## 🚀 Hướng dẫn chạy thử nghiệm Smart Contract

1. Truy cập Remix IDE tại: [https://remix.ethereum.org](https://remix.ethereum.org).
2. Tải tệp [ProjectCore.sol](contracts/project/ProjectCore.sol) lên Remix.
3. Chọn trình biên dịch Solidity phiên bản `0.8.20` trở lên và nhấn **Compile ProjectCore.sol**.
4. Chọn tab **Deploy & Run Transactions**, môi trường `Remix VM (Cancun)` hoặc `Injected Provider - MetaMask` (Mạng Sepolia).
5. Khởi tạo hợp đồng với các tham số:
   - `_seller`: Địa chỉ ví người bán
   - `_arbiter`: Địa chỉ ví trọng tài KTX
   - `_feeRecipient`: Địa chỉ ví Quỹ KTX
   - `_price`: Giá niêm yết (ví dụ `100000000000000000` Wei = 0.1 ETH)
   - `_inspectionDays`: `3` (ngày)

---

## 📦 Danh mục Sản phẩm & Lộ trình Triển khai Đồ án (Lab 8 – 15)

| Giai đoạn | Sản phẩm bàn giao | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |
| :---: | :--- | :--- | :---: |
| **Lab 8** | `README.md` · `AGENTS.md` · `docs/SPEC.md` | Khởi động đồ án Chủ đề 1 (KTX Escrow), xác định 4 câu hỏi cốt lõi, thiết lập cơ chế ký quỹ on-chain, phác thảo Smart Contract & bộ 3 ca kiểm thử (chuẩn / hoàn trả / gian lận) | ✅ **Hoàn thành** |
| **Lab 9** | `docs/SPEC.md` · `docs/ECONOMIC_RULES.md` · `contracts/training/TimeLockVault.sol` | Đặc tả nghiệp vụ BA chi tiết cho KTX Escrow: máy trạng thái `AWAITING → LOCKED → RELEASED / DISPUTED / REFUNDED`, ma trận rủi ro và 4 quy tắc kinh tế | ✅ **Hoàn thành** |
| **Lab 10** | `contracts/project/ProjectCore.sol` · `docs/AI_JOURNAL.md` | Viết & kiểm toán hợp đồng ký quỹ lõi (<150 dòng, CEI), rà soát mã AI sinh ra, phát hiện lỗ hổng Storage Slot & reentrancy, nâng cấp lên `ProjectCore v2` | ✅ **Hoàn thành** |
| **Lab 11** | `web/index.html` · `docs/PRESENTATION_PLAN.md` | Xây dựng giao diện Web3 DApp: kết nối MetaMask, tích hợp Ethers.js v6, gọi hàm `confirmReceived` / `raiseDispute` / `refundBuyer`, hiển thị trạng thái hợp đồng real-time | ✅ **Hoàn thành** |
| **Lab 12** | `test/ProjectCore.test.js` | Bộ kịch bản kiểm thử tự động toàn diện (Hardhat / Mocha): luồng chuẩn, chống gian lận người mua bùng tiền, tự động giải ngân sau 3 ngày, xử lý ngoại lệ biên | 🔄 **Sắp triển khai** |
| **Lab 13** | `evidence/lab-13/` · `docs/AI_JOURNAL.md` | Tích hợp địa chỉ hợp đồng deploy Sepolia, kiểm tra end-to-end với MetaMask testnet, ghi lại hash giao dịch và ảnh chụp bằng chứng on-chain | 🔄 **Sắp triển khai** |
| **Lab 14** | `web/index.html` (v2) · `evidence/lab-14/` | Hoàn thiện UX: thêm countdown 3 ngày kiểm tra, hiển thị lịch sử giao dịch, tối ưu gas estimate, hỗ trợ responsive mobile cho sinh viên dùng điện thoại | 🔄 **Sắp triển khai** |
| **Lab 15** | Báo cáo tổng kết · Demo cuối kỳ | Tổng hợp toàn bộ sản phẩm, demo luồng ký quỹ hoàn chỉnh (Buyer → Lock → Inspect → Confirm → Release), phản biện câu hỏi kinh tế & bảo vệ đồ án | 🔄 **Sắp triển khai** |

> **Chú thích trạng thái:** ✅ Hoàn thành &nbsp;|&nbsp; 🔄 Sắp triển khai &nbsp;|&nbsp; ⏸ Tạm hoãn
