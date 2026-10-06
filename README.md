# KTX Trường Bia — Sàn Ký Quỹ Mua Bán Đồ Cũ Sinh Viên

> **Môn học:** ECO2432 – Web3 Starter & Phân Tích Kinh Tế Số  
> **Chủ đề Phần N:** Chủ đề 1 — Ký quỹ mua bán đồ cũ KTX Trường Bia (Đại học Huế)  
> **Kho lưu trữ:** `hce-escrow-k58`  
> **Mạng thử nghiệm:** Ethereum Sepolia / Base Sepolia  

---

## 🎯 BỐN CÂU HỎI CỐT LÕI (Chuẩn đầu ra Lab 08)

### 1. Nhóm làm gì?
Xây dựng ứng dụng phi tập trung **KTX Trường Bia Escrow (DApp Ký quỹ)** dựa trên Smart Contract. Hệ thống đóng vai trò bên thứ ba độc lập tự động khóa tiền cọc thanh toán khi sinh viên mua bán đồ dùng cũ (giáo trình, quạt điện, bàn học, xe đạp...), và chỉ giải ngân cho người bán khi người mua đã trực tiếp kiểm tra và xác nhận nhận đồ thành công.

### 2. Cho ai?
Dành cho **sinh viên nội trú KTX Trường Bia và sinh viên trường Đại học Kinh tế - Đại học Huế (HCE)** tham gia vào thị trường mua bán, thanh lý vật dụng cũ trong khuôn viên trường và ký túc xá.

### 3. Quy tắc chính là gì?
- **Khóa cọc an toàn:** Người mua nạp đúng $100\%$ số tiền niêm yết vào Smart Contract. Tiền nằm trong két ký quỹ on-chain, không ai (kể cả Admin) được tự ý rút.
- **Xác nhận giải ngân:** Người mua nhận đồ thực tế, kiểm tra đúng chất lượng cam kết thì bấm **"Xác nhận đã nhận hàng"** $\rightarrow$ Hệ thống tự động chuyển $99\%$ tiền cho người bán và $1\%$ phí dịch vụ về quỹ hỗ trợ KTX Trường Bia.
- **Tự động thanh toán chống giam vốn:** Sau thời hạn kiểm tra ($3\text{ ngày}$), nếu người mua không xác nhận cũng không khiếu nại, tiền tự động giải ngân cho người bán để bảo vệ người bán.
- **Cơ chế khiếu nại & Trọng tài:** Nếu có gian lận hoặc hàng lỗi ngầm, một trong hai bên có quyền mở tranh chấp (`raiseDispute`) để trọng tài Ban đại diện KTX Trường Bia vào phân xử minh bạch.

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
| **Lab 8** | `README.md` · `AGENTS.md` · `docs/SPEC.md` | Khởi động đồ án Chủ đề 1 (KTX Trường Bia Escrow), xác định 4 câu hỏi cốt lõi, thiết lập cơ chế ký quỹ on-chain, phác thảo Smart Contract & bộ 3 ca kiểm thử | ✅ **Hoàn thành** |
| **Lab 9** | `contracts/training/TimeLockVault.sol` · `evidence/lab-09/` | Học kỹ thuật két khóa thời gian: Checks-Effects-Interactions, custom error, đo gas 4 thao tác trên Remix VM | ✅ **Hoàn thành** |
| **Lab 10** | `contracts/project/ProjectCore.sol` · `evidence/lab-10/` · `docs/AI_JOURNAL.md` | Rà soát mã nguồn AI sinh ra: thực nghiệm đọc ô nhớ `private` bằng `eth_getStorageAt`, vá lỗi CEI và xung đột lợi ích trọng tài trong `ProjectCore` | ✅ **Hoàn thành** |
| **Lab 11** | `contracts/project/ProjectCore.sol` · `docs/ECONOMIC_RULES.md` · `evidence/lab-11/` | Cài quy tắc kinh tế vào sản phẩm: phí nền tảng 1% (100 bps), trần giá giao dịch, kiểm thử 1 ca hợp lệ và 1 ca cố tình vi phạm | ✅ **Hoàn thành** |
| **Lab 12** | `docs/GATE_REVIEW_1.md` · `docs/PROJECT_PLAN.md` | Gate Review 1 (Cổng duyệt bắt buộc): kiểm tra sức khỏe repo, demo 3 phút luồng cốt lõi và ca vi phạm bị chặn | ✅ **Hoàn thành** |
| **Lab 13** | `contracts/training/VulnerableBank.sol` · `evidence/lab-13/` · `docs/AI_JOURNAL.md` | Thực nghiệm vụ mất tiền do lỗi Reentrancy (vụ The DAO 2016), viết ca kiểm thử tấn công và vá lỗi cho `ProjectCore` | 🔄 **Sắp triển khai** |
| **Lab 14** | `docs/AUDIT_REPORT.md` | Rà soát chéo giữa các nhóm theo danh mục kiểm tra 10 hạng mục bắt buộc | 🔄 **Sắp triển khai** |
| **Lab 15** | `web/index.html` · `docs/PRESENTATION_PLAN.md` | Giao diện Web3 DApp kết nối MetaMask, đưa lên mạng công khai GitHub Pages và kịch bản demo bảo vệ đồ án | 🔄 **Sắp triển khai** |

> **Chú thích trạng thái:** ✅ Hoàn thành &nbsp;|&nbsp; 🔄 Sắp triển khai &nbsp;|&nbsp; ⏸ Tạm hoãn
