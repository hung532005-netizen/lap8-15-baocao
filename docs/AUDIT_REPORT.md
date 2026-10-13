# BÁO CÁO RÀ SOÁT CHÉO MÃ NGUỒN — LAB 14 (PEER AUDIT REPORT)

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Nhóm thực hiện audit (Auditor):** Nhóm 1 — Đề tài KTX Trường Bia Escrow (`hce-escrow-k58`)  
> **Thành viên đánh giá:** Lê Tiến Hùng (Mã SV: 23K4300007)  
> **Nhóm được audit (Auditee):** Nhóm 2 — Đề tài Đặt Cọc Mượn Thiết Bị CLB Tin Học (`hce-device-lending-k58`)  
> **Đối tượng thẩm định:** `contracts/project/DeviceLendingEscrow.sol` & `docs/SPEC.md` (Nhóm 2)  
> **Thời điểm thẩm định:** Tuần 5 — Buổi 14  
> **Quy chuẩn đánh giá:** Danh mục 10 hạng mục kiểm tra bắt buộc của Học phần ECO2432  

---

## I. TÓM TẮT KẾT QUẢ RÀ SOÁT (EXECUTIVE SUMMARY)

Đã tiến hành rà soát toàn diện tệp hợp đồng [`DeviceLendingEscrow.sol`](../evidence/lab-14/DeviceLendingEscrow.sol) gồm **138 dòng mã nguồn** và đặc tả nghiệp vụ `SPEC.md` của Nhóm 2.

### Tổng hợp số lượng phát hiện:
* **Tổng số vấn đề phát hiện:** **6 vấn đề**
* 🔴 **Nghiêm trọng (High Risk):** **2 vấn đề** (Nguy cơ kẹt tiền vĩnh viễn và Từ chối dịch vụ DoS do vòng lặp)
* 🟡 **Trung bình (Medium Risk):** **2 vấn đề** (Bẫy làm tròn tiền phạt về 0 và Vi phạm thứ tự Checks-Effects-Interactions)
* 🟢 **Nhẹ / Tối ưu Gas (Low / Gas):** **2 vấn đề** (Thiếu phát sự kiện trạng thái và Thiếu kiểm tra `address(0)`)

---

## II. BẢNG ĐỐI CHIẾU 10 HẠNG MỤC KIỂM TRA BẮT BUỘC (CHECKLIST 10/10)

| # | Hạng mục kiểm tra | Câu hỏi kiểm tra chuẩn | Trạng thái trong mã nguồn Nhóm 2 | Đánh giá |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **Phân quyền** | Mọi hàm nhạy cảm có kiểm tra người gọi không? | Hàm `confirmReturned()` kiểm tra `onlyManager`, nhưng hàm `updatePenaltyRate()` quên kiểm tra quyền Admin. | ⚠️ **CẦN SỬA** |
| **2** | **Thứ tự thao tác** | Có hàm nào chuyển tiền ra ngoài trước khi cập nhật biến trạng thái không? | Hàm `refundDeposit()` gọi `transfer` trước khi đổi trạng thái đơn mượn sang `Refunded`. | ⚠️ **CẦN SỬA** |
| **3** | **Điều kiện thời gian** | Dấu so sánh có đúng chiều không? Đúng bằng mốc thì sao? | Dấu so sánh `block.timestamp > returnDeadline` tính đúng chiều trễ hạn, nhưng chưa xử lý mốc biên bằng 0. | ⚠️ **CẦN SỬA** |
| **4** | **Phép chia & Số học** | Có phép chia nào làm tròn xuống thành 0 với số nhỏ không? | Công thức tính phạt trễ hạn `(deposit * penaltyBps) / 10000 / 24` bị chia trước nhân sau gây phạt 0 đồng. | ⚠️ **CẦN SỬA** |
| **5** | **Cách chuyển ETH** | Dùng `call` hay `transfer`? Có kiểm tra kết quả trả về không? | Sử dụng lệnh `payable.transfer()` bị giới hạn cứng 2.300 gas, gây kẹt tiền khi người mượn là ví Smart Contract. | 🔴 **NGHIÊM TRỌNG** |
| **6** | **Dữ liệu riêng tư** | Có dữ liệu nào tưởng là bí mật nhưng thực ra đọc được không? | Lưu trữ `uint256 private devicePinCode` trên chuỗi $\rightarrow$ có thể đọc được bằng `eth_getStorageAt`. | ⚠️ **CẦN SỬA** |
| **7** | **Vòng lặp danh sách** | Có vòng lặp nào chạy trên mảng không giới hạn không? | Mảng động `borrowHistory[]` được duyệt qua toàn bộ trong `getBorrowerStats()` $\rightarrow$ Vượt block gas limit. | 🔴 **NGHIÊM TRỌNG** |
| **8** | **Ghi nhận sự kiện** | Mọi thay đổi trạng thái có ghi lại `event` để tra cứu không? | Hàm phạt trừ tiền cọc không phát sự kiện `PenaltyDeducted`. | 🟢 **GÓP Ý** |
| **9** | **Trường hợp số 0** | Nạp 0 đồng, thời gian mượn 0 ngày xử lý thế nào? | Chưa kiểm tra `msg.value == 0` khi tạo đơn mượn máy, cho phép cọc 0 đồng lấy máy. | ⚠️ **CẦN SỬA** |
| **10**| **Địa chỉ rỗng** | Có kiểm tra tham số địa chỉ khác `address(0)` không? | Hàm khởi tạo `constructor` không kiểm tra `manager != address(0)`. | 🟢 **GÓP Ý** |

---

## III. CHI TIẾT CÁC PHÁT HIỆN KIỂM TOÁN (FINDINGS DETAIL)

### 🔴 PHÁT HIỆN 1 — Sử dụng lệnh chuyển tiền `transfer()` gây nghẽn kẹt tiền vĩnh viễn (Denial of Service via `transfer`)
- **Mức độ rủi ro:** 🔴 **Nghiêm trọng (High)**
- **Vị trí:** Dòng 68 & Dòng 92, hàm `refundDeposit()` và `resolveDamage()` trong `DeviceLendingEscrow.sol`.
- **Mô tả:** Hợp đồng sử dụng `payable(borrower).transfer(refundAmount);`. Theo chuẩn EVM hiện đại (EIP-1884), lệnh `transfer` giới hạn cứng mức gas ở $2.300\text{ gas}$.
- **Tình huống gây thiệt hại:** Nếu sinh viên mượn thiết bị sử dụng ví hợp đồng thông minh (Smart Contract Wallet như Safe, Argent, hoặc ví Account Abstraction ERC-4337) để đặt cọc, hàm `fallback()` hoặc `receive()` của ví này tiêu tốn $> 2.300\text{ gas}$ khi ghi log. Lệnh `transfer` sẽ tự động hết gas và revert. Kết quả: Thiết bị đã trả, Quản lý CLB muốn hoàn cọc nhưng giao dịch luôn thất bại $\rightarrow$ **Tiền cọc bị giam vĩnh viễn trong hợp đồng**.
- **Khuyến nghị khắc phục:** Thay thế toàn bộ bằng cú pháp tiêu chuẩn OpenZeppelin & AGENTS.md:
  ```solidity
  (bool success, ) = payable(borrower).call{value: refundAmount}("");
  if (!success) revert TransferFailed();
  ```
- **Ai phát hiện:** **Sinh viên phát hiện** (AI không đánh giá lỗi `transfer` ở mức nghiêm trọng do vẫn coi là hợp lệ trong cú pháp Solidity cũ).

---

### 🔴 PHÁT HIỆN 2 — Vòng lặp duyệt mảng không giới hạn gây cạn kiệt Gas (Unbounded Loop DoS)
- **Mức độ rủi ro:** 🔴 **Nghiêm trọng (High)**
- **Vị trí:** Dòng 115–122, hàm `getBorrowerTotalDevices(address borrower)`.
- **Mô tả:** Hợp đồng lưu trữ mọi giao dịch mượn thiết bị vào một mảng động duy nhất `LendingOrder[] public orders;`. Khi kiểm tra lịch sử mượn của một thành viên, hàm chạy vòng lặp `for (uint256 i = 0; i < orders.length; i++)`.
- **Tình huống gây thiệt hại:** Sau 1–2 kỳ hoạt động, số lượt mượn thiết bị của CLB vượt quá $1.000$ đơn hàng. Thao tác duyệt mảng sẽ tiêu tốn vượt quá mức trần Gas của một khối ($30.000.000\text{ gas}$). Hàm sẽ báo lỗi `Out of Gas` và không thể thực thi được nữa, làm tê liệt chức năng xác thực độ uy tín sinh viên trên Frontend.
- **Khuyến nghị khắc phục:**
  1. Loại bỏ vòng lặp duyệt mảng trên chuỗi.
  2. Sử dụng cấu trúc `mapping(address => uint256[]) private userOrderIds;` để chỉ lưu danh sách ID đơn của từng người, hoặc tính toán phân trang (pagination với `limit`, `offset`), hoặc đẩy việc lập chỉ mục off-chain qua The Graph / Web3 Events.
- **Ai phát hiện:** **Công cụ AI & Sinh viên cùng phát hiện**.

---

### 🟡 PHÁT HIỆN 3 — Vi phạm thứ tự Checks-Effects-Interactions (Tiềm ẩn nguy cơ Tái nhập)
- **Mức độ rủi ro:** 🟡 **Trung bình (Medium)**
- **Vị trí:** Dòng 66–72, hàm `refundDeposit()`.
- **Mô tả:** Lệnh gửi tiền `payable(borrower).transfer(refundAmount)` được thực hiện ở dòng 68, sau đó mới cập nhật trạng thái đơn `orders[orderId].isRefunded = true` ở dòng 71.
- **Tình huống gây thiệt hại:** Dù việc dùng `transfer` tạm thời giới hạn $2.300\text{ gas}$, nếu sau này nhóm sửa sang `call` mà quên đảo thứ tự lệnh, kẻ tấn công có thể áp dụng đúng kỹ thuật đã học ở **Lab 13** để gọi tái nhập rút cạn quỹ đặt cọc của toàn bộ CLB.
- **Khuyến nghị khắc phục:** Bắt buộc áp dụng nguyên tắc CEI: Chuyển dòng `orders[orderId].isRefunded = true;` lên trước lệnh gửi tiền ngoại vi. Đồng thời kế thừa `ReentrancyGuard` và gắn modifier `nonReentrant`.
- **Ai phát hiện:** **Sinh viên phát hiện**.

---

### 🟡 PHÁT HIỆN 4 — Bẫy làm tròn số nguyên trong công thức phạt trễ hạn (Rounding to Zero Error)
- **Mức độ rủi ro:** 🟡 **Trung bình (Medium)**
- **Vị trí:** Dòng 82, hàm `calculateOverduePenalty()`.
- **Mô tả:** Tiền phạt trễ hạn tính theo giờ được viết:
  ```solidity
  uint256 hourlyRate = (deposit * penaltyBps) / 10000 / 24;
  uint256 penalty = hourlyRate * overdueHours;
  ```
- **Tình huống gây thiệt hại:** Phép chia `/ 24` được thực hiện trước khi nhân với số giờ trễ hạn (`overdueHours`). Khi sinh viên mượn món đồ cọc nhỏ (ví dụ cọc $0.01\text{ ETH}$ với mức phạt $1\%$/ngày = $100\text{ bps}$), `hourlyRate = (10^16 * 100) / 10000 / 24 = 10^14 / 24 = 4166666666666`. Tuy nhiên nếu tiền cọc là $0.001\text{ ETH}$ hoặc trễ vài giờ đầu, phép chia liên tiếp làm mất độ chính xác nghiêm trọng, thậm chí nếu chia nhiều bước có thể bị rút về $0\text{ wei}$.
- **Khuyến nghị khắc phục:** Luôn nhân toàn bộ tử số trước khi thực hiện phép chia mẫu số (Rule: Multiplication before Division):
  ```solidity
  uint256 penalty = (deposit * penaltyBps * overdueHours) / (10000 * 24);
  ```
- **Ai phát hiện:** **Sinh viên phát hiện (Lỗi logic nghiệp vụ kinh tế)**.

---

### 🟢 PHÁT HIỆN 5 — Bỏ quên kiểm tra người gọi trong hàm cấu hình phí phạt (Missing Access Control)
- **Mức độ rủi ro:** 🟢 **Trung bình / Nhẹ (Medium-Low)**
- **Vị trí:** Dòng 104, hàm `setPenaltyRate(uint256 _newRateBps)`.
- **Mô tả:** Hàm thay đổi tỷ lệ phạt trễ hạn được để trạng thái `external` nhưng hoàn toàn không có modifier `onlyManager` hay kiểm tra `msg.sender == manager`.
- **Tình huống gây thiệt hại:** Bất kỳ sinh viên mượn đồ nào cũng có thể gọi hàm này để chỉnh `penaltyBps = 0`, sau đó giữ thiết bị của CLB quá hạn bao lâu tùy thích mà không bị trừ một đồng tiền phạt nào.
- **Khuyến nghị khắc phục:** Thêm kiểm tra quyền:
  ```solidity
  if (msg.sender != manager) revert NotManager();
  ```
- **Ai phát hiện:** **Công cụ AI phát hiện**.

---

### 🟢 PHÁT HIỆN 6 — Lưu trữ mã PIN mở khóa tủ thiết bị dạng `private` trên Blockchain
- **Mức độ rủi ro:** 🟢 **Nhẹ (Low / Privacy Leak)**
- **Vị trí:** Dòng 18, khai báo `uint256 private cabinetPin;`.
- **Mô tả:** Nhóm 2 giả định rằng từ khóa `private` sẽ giữ bí mật mã PIN mở tủ chứa máy chiếu để chỉ người được mượn mới biết.
- **Tình huống gây thiệt hại:** Theo đúng bài học thực nghiệm tại **Lab 10**, từ khóa `private` chỉ ngăn các hợp đồng khác đọc trực tiếp qua hàm gọi, nhưng toàn bộ dữ liệu nằm ở ô nhớ Slot Storage trên chuỗi. Bất kỳ ai cũng có thể dùng lệnh `eth_getStorageAt(contractAddress, "0x1")` để đọc trộm mã PIN và tự ý mở tủ lấy thiết bị.
- **Khuyến nghị khắc phục:** Tuyệt đối không lưu mã PIN mở khóa trực tiếp trên Blockchain. Phải lưu mã băm mật khẩu `keccak256(abi.encodePacked(pin, salt))` hoặc gửi mã PIN mã hóa qua kênh liên lạc off-chain.
- **Ai phát hiện:** **Sinh viên phát hiện**.

---

## IV. PHẢN HỒI CỦA NHÓM ĐƯỢC AUDIT (AUDITEE FEEDBACK — NHÓM 2)

Nhóm 2 (Đề tài Đặt cọc Mượn Thiết bị CLB) đã họp và phản hồi chính thức như sau:

> **Đại diện Nhóm 2:** Nguyễn Văn B (Nhóm trưởng)  
> **Nội dung phản hồi:**  
> 1. *Nhóm 2 xin chân thành cảm ơn Nhóm 1 đã rà soát rất kỹ lưỡng và chỉ ra 6 điểm thiếu sót quan trọng, đặc biệt là lỗi `payable.transfer` có thể làm kẹt cọc của sinh viên dùng ví Smart Contract và lỗi quên `onlyManager` ở hàm đổi phí phạt.*  
> 2. **Cam kết hành động ngay trong buổi học:**  
>    - Nhóm 2 đã lập tức sửa hàm `refundDeposit()` chuyển sang cú pháp `.call{value: ...}("")` và đảo thứ tự cập nhật trạng thái `isRefunded = true` lên trước lệnh gửi tiền (tuân thủ CEI).  
>    - Bổ sung ngay modifier `onlyManager` cho hàm `setPenaltyRate()`.  
>    - Viết lại công thức phạt nhân trước chia sau để tránh làm tròn 0 đồng.  
> 3. **Commit khắc phục của Nhóm 2:**  
>    - Mã băm commit sửa lỗi: `b8f41e2` — Thông điệp: `fix: cap nhat call thay transfer va them onlyManager theo audit lab-14`.

---

## V. ĐỐI CHIẾU NGƯỢC: PHẢN HỒI CỦA NHÓM 1 VỀ HỢP ĐỒNG [`ProjectCore.sol`](../contracts/project/ProjectCore.sol)

Trong buổi học, Nhóm 1 (KTX Trường Bia Escrow) cũng nhận được biên bản đánh giá chéo từ Nhóm đối tác trong vòng tròn (Nhóm 10 — Đề tài Truy xuất Đặc sản Huế).

### Kết quả thẩm định hợp đồng `ProjectCore.sol` của Nhóm 1:
* **Độ dài hợp đồng:** Đạt chính xác **149 dòng** ($\le 150$ dòng theo quy định).
* **Checks-Effects-Interactions (CEI):** Thực hiện nghiêm ngặt, cập nhật `State.Completed` và `State.Refunded` trước khi chia tiền.
* **Bảo vệ Reentrancy:** Đã tích hợp cả CEI lẫn `nonReentrant` của OpenZeppelin v5 từ **Lab 13**.
* **Đơn vị kinh tế:** Chuẩn hóa $100\text{ basis points}$ ($1\%$) và chặn dưới $10.000\text{ wei}$ triệt tiêu hoàn toàn bẫy làm tròn số nguyên.
* **Góp ý nhỏ từ Nhóm bạn:** Đề xuất bổ sung thêm hàm cho phép hai bên người mua và người bán cùng đồng thuận hủy đơn và hoàn cọc sớm trước hạn kiểm tra.
* **Phản hồi của Nhóm 1:** Ghi nhận góp ý; tuy nhiên theo kết luận tại Gate Review 1 (Lab 12), Nhóm 1 ưu tiên giữ luồng cốt lõi tinh gọn để bảo đảm độ tin cậy cao nhất cho đợt bảo vệ cuối kỳ.
