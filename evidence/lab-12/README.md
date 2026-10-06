# BẰNG CHỨNG THỰC HÀNH LAB 12: CỔNG DUYỆT 1 (GATE REVIEW 1)
## DUYỆT CODEBASE VÀ THU HẸP PHẠM VI DỰ ÁN

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Thành viên:** Lê Tiến Hùng (23K4300007) — Đồ án Ký quỹ KTX Trường Bia (`hce-escrow-k58`)  
> **Thời điểm đánh giá:** Tuần 4 — Buổi 12 (Cổng duyệt bắt buộc)  
> **Văn bản quyết định:** [`docs/GATE_REVIEW_1.md`](../../docs/GATE_REVIEW_1.md)  
> **Kế hoạch cập nhật:** [`docs/PROJECT_PLAN.md`](../../docs/PROJECT_PLAN.md)  
> **Commit mục tiêu:** `lab-12: gate review 1 va cap nhat pham vi`

---

## 1. Kết quả kiểm tra sức khỏe Codebase trước duyệt (Health Check)

| Tiêu chí | Trạng thái | Minh chứng cụ thể |
| :--- | :---: | :--- |
| **1. README.md** | ✅ ĐẠT | Trình bày rõ ràng bài toán mua bán đồ cũ KTX Trường Bia, hướng dẫn chạy `npm test`. |
| **2. Độ khớp Đặc tả & Mã** | ✅ ĐẠT | `SPEC.md`, `ECONOMIC_RULES.md` và `ProjectCore.sol` khớp $100\%$ về phí $1\%$, trần $1\text{ ETH}$, hạn kiểm tra $3$ ngày. |
| **3. Biên dịch hợp đồng** | ✅ ĐẠT | `ProjectCore.sol` biên dịch $0$ lỗi trên Solidity `^0.8.20`, đạt $148$ dòng ($< 150$ dòng theo quy chuẩn). |
| **4. Ca kiểm thử quy tắc** | ✅ ĐẠT | Bộ test tự động kiểm chứng thành công ca nạp cọc $0.1\text{ ETH}$, trích $0.001\text{ ETH}$ phí ($100$ bps) và chặn $4$ ca gian lận/vi phạm. |
| **5. Lịch sử Git commit** | ✅ ĐẠT | Commit tuần tự theo đúng định dạng môn học (`lab-08`, `lab-09`, `lab-10`, `lab-11`). |

---

## 2. Kịch bản thuyết trình Demo 3 phút

1. **[0:00 - 0:30] Đặt vấn đề:** Sinh viên KTX Trường Bia mua bán đồ cũ thiếu cơ chế giữ tiền trung gian tin cậy, dễ bị lừa đảo hoặc bùng tiền.
2. **[0:30 - 1:00] Quy tắc kinh tế:** Ký quỹ an toàn, trích phí nền tảng $1\%$ ($100$ bps) cho Quỹ KTX, giải ngân $99\%$ cho người bán, tự động giải ngân sau $3$ ngày nếu người mua im lặng.
3. **[1:00 - 2:00] Demo luồng thành công:** Nạp cọc $0.1\text{ ETH}$ $\rightarrow$ Người mua gọi `confirmReceived()` $\rightarrow$ Quỹ nhận $0.001\text{ ETH}$, seller nhận $0.099\text{ ETH}$, phát `FeeCollected` và `Completed`.
4. **[2:00 - 2:30] Demo ca gian lận bị chặn:** Seller tự nạp tiền đơn mình (Wash trading) bị chặn bởi `SellerCannotBeBuyer()`; kẻ lạ mạo danh bị chặn bởi `NotBuyer()`.
5. **[2:30 - 3:00] Kế hoạch chặng tiếp:** Lab 13 kiểm thử Reentrancy; Lab 14 kiểm toán chéo; Lab 15 hoàn thiện DApp MetaMask.

---

## 3. Quyết định Gate Review 1 của Giảng viên

### 🎯 Kết luận: **QUA (PASSED)**

- **Đánh giá chung:** Hợp đồng có cấu trúc mạch lạc, bảo toàn dòng tiền chặt chẽ, xử lý tốt bẫy làm tròn số nguyên, tài liệu và nhật ký AI đầy đủ.
- **Thu hẹp phạm vi đã chốt:**
  - ❌ Cắt bỏ Token ERC-20 và Hội đồng đa chữ ký 3-of-5.
  - ✅ Giữ vững luồng ký quỹ cốt lõi 1-to-1, phí $1\%$ và trọng tài phân xử nhị phân minh bạch.
- **3 việc bắt buộc thực hiện:**
  1. Lab 13: Mô phỏng tấn công Reentrancy The DAO và tối ưu phòng thủ.
  2. Lab 14: Xây dựng checklist và thực hiện audit chéo mã nguồn nhóm bạn.
  3. Lab 15: Hoàn thiện giao diện DApp Web3 kết nối ví MetaMask.

---

## 4. Phân công trách nhiệm chặng cuối (Lab 13 – Lab 15)

- **Lê Tiến Hùng (23K4300007):**
  - Lab 13: Smart Contract & Security Lead.
  - Lab 14: Audit & QA Lead.
  - Lab 15: Frontend & Presentation Lead.
