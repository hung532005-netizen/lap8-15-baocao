# BẰNG CHỨNG THỰC HÀNH LAB 10: RÀ SOÁT MÃ NGUỒN DO AI SINH RA

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Thành viên:** Lê Tiến Hùng (23K4300007) — Đồ án KTX Escrow  
> **Tài liệu bàn giao:** Báo cáo Audit & Thực nghiệm khai thác ô nhớ  
> **Commit mục tiêu:** `lab-10: audit va sua loi project core`

---

## 1. Phân tích lỗi cài sẵn trong hợp đồng mẫu `VaultBuggy.sol`

Hợp đồng luyện tập [`contracts/training/VaultBuggy.sol`](../../contracts/training/VaultBuggy.sol) có 4 lỗi cài sẵn:

| STT | Tên lỗ hổng | Vị trí (Dòng) | Mức độ | Cơ chế gây hại & Khai thác | Cách khắc phục | Ai phát hiện |
| :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| **1** | **Toán tử so sánh thời gian bị ngược** | Dòng 19 | 🔴 Nghiêm trọng | `block.timestamp <= unlockTime`: Két cho phép rút tiền **trong khi đang khóa**, nhưng khi đã qua thời hạn mở khóa thì tiền bị kẹt vĩnh viễn không thể rút ra. | Sửa thành: `block.timestamp >= unlockTime` | **AI phát hiện** |
| **2** | **Thiếu kiểm tra phân quyền (Missing Access Control)** | Dòng 18–20 | 🔴 Nghiêm trọng | Hàm `withdraw()` không kiểm tra `msg.sender == owner`. Bất kỳ ai (`msg.sender` lạ) cũng có thể gọi hàm để rút toàn bộ số dư hợp đồng về ví của mình. | Bổ sung: `if (msg.sender != owner) revert NotOwner();` | **Sinh viên phát hiện** |
| **3** | **Ngộ nhận tính bí mật của biến `private`** | Dòng 8, 13 | 🟠 Trung bình | Biến `uint256 private emergencyPin` lưu trữ ở storage slot `0x2`. Từ khóa `private` chỉ ngăn truy cập giữa các hợp đồng, hoàn toàn không mã hóa dữ liệu on-chain. Bất kỳ ai cũng có thể đọc ra bằng RPC `eth_getStorageAt`. | Không lưu trữ bí mật (PIN/Password) on-chain. Nếu cần xác thực, chỉ lưu hash `keccak256(pin + salt)`. | **AI & Sinh viên chứng minh bằng thực nghiệm** |
| **4** | **Sử dụng `transfer` & Vi phạm CEI / Thiếu Event** | Dòng 16, 20 | 🟡 Thấp | Dùng `transfer()` cố định 2.300 gas stipend sẽ lỗi nếu ví nhận là Smart Contract/Multisig. Hàm `deposit()` và `withdraw()` không phát sinh `event`, không kiểm tra `msg.value > 0`. | Đổi sang `call{value: ...}("")`, bổ sung `event Deposited` và `Withdrawn`. | **Sinh viên phát hiện** |

---

## 2. Bằng chứng thực nghiệm khai thác ô nhớ (`eth_getStorageAt`)

### 2.1. Bản chất Storage Layout của EVM
Trong Solidity, mỗi biến trạng thái chiếm một slot 32-byte liên tiếp:
- **Slot 0:** `address public owner;` (20 bytes địa chỉ)
- **Slot 1:** `uint256 public unlockTime;` (32 bytes timestamp)
- **Slot 2:** `uint256 private emergencyPin;` (32 bytes lưu trữ PIN bí mật)

### 2.2. Đoạn mã thực nghiệm chạy trong Browser Console / Node.js
Deploy `VaultBuggy` với tham số `lockSeconds = 120`, `pin = 123456`:

```javascript
// Chạy trong Console trình duyệt (kết nối MetaMask) hoặc script Ethers.js
const contractAddress = "0x7B1b8C895781aFaB11E9354F9D1E8976b9Ac3D2A"; // Địa chỉ deploy trên VM

const rawStorage = await window.ethereum.request({
  method: "eth_getStorageAt",
  params: [contractAddress, "0x2", "latest"]
});

console.log("Dữ liệu thô tại Slot 2 (Hex):", rawStorage);
// Kết quả trả về: "0x000000000000000000000000000000000000000000000000000000000001e240"

const decodedPin = parseInt(rawStorage, 16);
console.log("Mã PIN giải mã thành công:", decodedPin);
// Kết quả in ra: 123456
```

### 2.3. Kết luận rút ra
> **Kết luận quan trọng:** Từ khóa `private` trong Solidity **chỉ giới hạn phạm vi truy cập giữa các Smart Contract**, không làm dữ liệu trở nên bí mật. Mọi trạng thái lưu trữ trên blockchain đều hoàn toàn công khai và có thể đọc trực tiếp từ RPC node.

---

## 3. Rà soát & Tối ưu hợp đồng sản phẩm `ProjectCore.sol`

Hợp đồng [`contracts/project/ProjectCore.sol`](../../contracts/project/ProjectCore.sol) được rà soát với 2 phát hiện thực tế:

### Phát hiện 1: Vi phạm thứ tự Checks - Effects - Interactions trong giải quyết tranh chấp
- **Vị trí:** Hàm `resolveDispute(uint8 decision)` dòng 114–117.
- **Hậu quả:** Khi trọng tài chọn `decision == 1` (trả tiền cho người bán), hàm gọi `_distributeFunds()` trước khi phát sự kiện `emit DisputeResolved(...)`. Vì trong `_distributeFunds()` đã thực hiện tương tác ngoại vi `.call` chuyển ETH, việc phát sự kiện sau đó vi phạm nguyên tắc CEI.
- **Cách khắc phục:** Đảo lại thứ tự, phát `emit DisputeResolved(arbiter, 1, balance);` trước khi gọi `_distributeFunds()`.

### Phát hiện 2: Lỗ hổng xung đột lợi ích (Conflict of Interest) trong phân quyền
- **Vị trí:** Constructor và hàm `fund()`.
- **Hậu quả:** 
  - Nếu `_seller == _arbiter`, người bán kiêm luôn trọng tài phân xử.
  - Nếu `msg.sender == arbiter` gọi hàm `fund()`, trọng tài trở thành người mua (`buyer`). Trọng tài có thể mua hàng, mở khiếu nại `raiseDispute()`, rồi tự ra phán quyết `resolveDispute(2)` để vừa lấy lại tiền cọc vừa chiếm đoạt hàng của người bán.
- **Cách khắc phục:**
  - Bổ sung kiểm tra trong `constructor`: `if (_seller == _arbiter) revert ConflictOfInterest();`
  - Bổ sung kiểm tra trong `fund()`: `if (msg.sender == arbiter) revert ArbiterCannotBeBuyer();`

---

## 4. Kết quả biên dịch và dung lượng hợp đồng
- **Trình biên dịch:** Solidity `0.8.20+`
- **Kết quả:** Biên dịch thành công 0 lỗi, 0 cảnh báo.
- **Số dòng mã nguồn:** 146 dòng (tuân thủ giới hạn < 150 dòng của môn học).
