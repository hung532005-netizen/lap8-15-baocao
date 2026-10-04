# KTX Escrow — Sàn Ký Quỹ Mua Bán Đồ Cũ Sinh Viên

> **Môn học:** ECO2432 – Web3 Starter & Phân Tích Kinh Tế Số  
> **Chủ đề Phần N:** Chủ đề 1 — Ký quỹ mua bán đồ cũ KTX  
> **Kho lưu trữ nhóm:** `hce-escrow-k58`  
> **Mạng thử nghiệm:** Ethereum Sepolia / Base Sepolia  

---

## 🎯 BỐN CÂU HỎI CỐT LÕI (Chuẩn đầu ra Lab 08)

### 1. Nhóm làm gì?
Nhóm xây dựng ứng dụng phi tập trung **KTX Escrow (DApp Ký quỹ)** dựa trên Smart Contract. Hệ thống đóng vai trò bên thứ ba độc lập tự động khóa tiền cọc thanh toán khi mua bán đồ dùng cũ (giáo trình, quạt điện, bàn học, xe đạp...), và chỉ giải ngân cho người bán khi người mua đã trực tiếp kiểm tra và xác nhận nhận đồ thành công.

### 2. Cho ai?
Dành cho **sinh viên nội trú KTX và sinh viên trường Đại học Kinh tế (HCE)** tham gia vào thị trường mua bán, thanh lý vật dụng cũ trong khuôn viên trường và ký túc xá.

### 3. Quy tắc chính là gì?
- **Khóa cọc an toàn:** Người mua nạp đúng $100\%$ số tiền niêm yết vào Smart Contract. Tiền nằm trong két ký quỹ on-chain, không ai (kể cả Admin) được tự ý rút.
- **Xác nhận giải ngân:** Người mua nhận đồ thực tế, kiểm tra đúng chất lượng cam kết thì bấm **"Xác nhận đã nhận hàng"** $\rightarrow$ Hệ thống tự động chuyển $99\%$ tiền cho người bán và $1\%$ phí dịch vụ về quỹ hỗ trợ KTX.
- **Tự động thanh toán chống giam vốn:** Sau thời hạn kiểm tra ($3\text{ ngày}$), nếu người mua không xác nhận cũng không khiếu nại, tiền tự động giải ngân cho người bán để bảo vệ người bán.
- **Cơ chế khiếu nại & Trọng tài:** Nếu có gian lận hoặc hàng lỗi ngầm, một trong hai bên có quyền mở tranh chấp (`raiseDispute`) để trọng tài Ban đại diện KTX vào phân xử minh bạch.

### 4. Mỗi thành viên chịu trách nhiệm phần nào?

| STT | Họ và tên | Mã sinh viên | Vai chính Lab 8–11 | Vai chính Lab 12–15 |
| :---: | :--- | :---: | :--- | :--- |
| 1 | **Lê Tiến Hùng** *(Trưởng nhóm)* | 23K4300007 | **Hợp đồng (Smart Contract)** & Quản lý | **Kiểm thử (Security & Audit)** |
| 2 | **Nguyễn Văn An** | 23K4300012 | **Đặc tả (Spec)** & **Kiểm thử (Testing)** | **Hợp đồng (Smart Contract)** |
| 3 | **Trần Thị Mai** | 23K4300045 | **Giao diện (Frontend DApp)** & Docs | **Giao diện (Frontend DApp)** |

---

## 📂 Cấu trúc Repository (Chuẩn Phần B.6)

```text
hce-escrow-k58/
├── README.md                 # Giới thiệu sản phẩm, 4 câu cốt lõi và hướng dẫn
├── AGENTS.md                 # Quy ước và tiêu chuẩn làm việc với công cụ AI
├── package.json              # Cấu hình dự án và dependencies
├── docs/
│   ├── PROJECT_PLAN.md       # Kế hoạch chi tiết, phân vai xoay vòng, 8 mốc dự án
│   ├── SPEC.md               # Đặc tả kỹ thuật v0.1 với 5 quy tắc và các ngoại lệ
│   ├── ECONOMIC_RULES.md     # 4 mục quy tắc kinh tế + 5 phản biện & giải trình
│   ├── AI_JOURNAL.md         # Nhật ký tương tác AI, lỗ hổng phát hiện và cách sửa
│   └── PRESENTATION_PLAN.md  # Kịch bản demo sản phẩm
├── contracts/
│   ├── training/             # Bài mẫu học kỹ thuật (TimeLockVault, ClassPoint...)
│   └── project/
│       └── ProjectCore.sol   # Hợp đồng ký quỹ lõi (dưới 150 dòng, Checks-Effects-Interactions)
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
[Check-in] Th�nh vi�n Nguy?n Van An (23K4300012) x�c nh?n quy?n c?ng t�c tr�n repo.
[Check-in] Th�nh vi�n Tr?n Th? Mai (23K4300045) x�c nh?n quy?n c?ng t�c tr�n repo.
[Milestone] Ho�n th�nh Lab 08: �� th?ng nh?t d?c t? v0.1 v� b? quy t?c kinh t?.
