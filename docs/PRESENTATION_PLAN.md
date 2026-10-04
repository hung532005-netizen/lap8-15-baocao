# PRESENTATION PLAN — KTX Escrow (Kế Hoạch Báo Cáo & Demo)

> **Môn học:** ECO2432 – Web3 Starter  
> **Dự án:** `hce-escrow-k58`  
> **Áp dụng cho:** Gate Review 1 (Lab 12) và Báo cáo tổng kết cuối kỳ (Lab 15)

---

## 1. Mục tiêu buổi thuyết trình
- Giới thiệu ngắn gọn trong 1 câu: Người nghe hiểu ngay sản phẩm giải quyết vấn đề gì, cho ai.
- Trình bày mô hình kinh tế: Dòng tiền, lý do chọn 1% phí, cơ chế chống giam vốn của hai bên.
- Demo luồng thực tế (Live demo): Từ bước nạp cọc đến xác nhận giải ngân thành công và xử lý khiếu nại.
- Vấn đáp bảo vệ: Phản biện vững trước các câu hỏi về lỗ hổng bảo mật và tình huống người dùng bị thiệt.

---

## 2. Phân công trình bày (Phù hợp 3 thành viên)

| Phần | Nội dung chính | Thời lượng | Người trình bày |
| :---: | :--- | :---: | :--- |
| **Phần 1: Giới thiệu & Bối cảnh** | - Vấn đề lừa đảo mua bán đồ cũ KTX.<br>- Giải pháp KTX Escrow và đối tượng hưởng lợi. | 2 phút | **Trần Thị Mai** |
| **Phần 2: Kiến trúc & Kinh tế** | - Máy trạng thái và 5 quy tắc nghiệp vụ.<br>- Cơ chế dòng tiền, trần giao dịch và chống giam vốn. | 3 phút | **Nguyễn Văn An** |
| **Phần 3: Live Demo & Kỹ thuật** | - Tương tác Smart Contract trên Remix/Web DApp.<br>- Thử nghiệm ca thành công và ca từ chối vi phạm. | 3 phút | **Lê Tiến Hùng** |
| **Phần 4: Q&A / Phản biện** | - Trả lời câu hỏi của Giảng viên và nhóm bạn. | 2 phút | **Cả 3 thành viên** |

---

## 3. Kịch bản Demo chi tiết (Live Script)
1. **Bước 1 (Deploy):** Người bán triển khai hợp đồng với giá bán xe đạp cũ $0.05\text{ ETH}$, thời gian kiểm tra $3\text{ ngày}$.
2. **Bước 2 (Nạp cọc):** Người mua kết nối ví MetaMask và nạp đúng $0.05\text{ ETH}$. Tiền vào trạng thái `Funded`.
3. **Bước 3 (Kiểm tra lỗi):** Thử cho người thứ ba hoặc người bán tự gọi `confirmReceived()` $\rightarrow$ Hợp đồng từ chối và báo lỗi `NotBuyer()`.
4. **Bước 4 (Giải ngân):** Người mua gọi `confirmReceived()` $\rightarrow$ Ví người bán nhận được $99\%$ tiền, Quỹ KTX nhận $1\%$, số dư hợp đồng về $0$.
