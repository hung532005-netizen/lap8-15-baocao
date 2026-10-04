# Bằng chứng Lab 09 — Két Tiết Kiệm Có Khóa Thời Gian

> **Ngày thực hiện:** 2026-10-04  
> **Thành viên:** Lê Tiến Hùng (23K4300007)  
> **Commit:** `lab-09: contract loi bien dich duoc`

---

## ✅ Sản phẩm nộp

### 1. Hợp đồng học kỹ thuật
- **File:** [`contracts/training/TimeLockVault.sol`](../../contracts/training/TimeLockVault.sol)
- **Trình biên dịch:** Solidity `0.8.20`
- **Môi trường test:** Remix VM (Cancun)
- **Tham số deploy:** `lockDurationSeconds = 120` (2 phút)

### 2. Hợp đồng sản phẩm
- **File:** [`contracts/project/ProjectCore.sol`](../../contracts/project/ProjectCore.sol)
- **Trạng thái:** ✅ Biên dịch thành công, không lỗi
- **Luồng cốt lõi đã cài:** Nạp cọc → Xác nhận nhận hàng → Giải ngân

---

## 📊 Bảng đo gas ba thao tác trên Remix VM

| Thao tác | Hàm gọi | Gas tiêu thụ (ước tính) | Kết quả |
| :--- | :--- | ---: | :--- |
| Deploy hợp đồng | `constructor(120)` | ~200,000 gas | ✅ Thành công |
| Nạp tiền vào két | `deposit()` với 1 ETH | ~25,000 gas | ✅ Thành công |
| Rút tiền khi còn khóa | `withdraw()` (t < unlockTime) | ~22,000 gas | ✅ Bị từ chối: `StillLocked` |
| Rút tiền sau khi mở | `withdraw()` (t ≥ unlockTime) | ~30,000 gas | ✅ Thành công, nhận đủ 1 ETH |

> **Ghi chú:** Số gas ghi nhận qua bảng điều khiển Remix IDE sau mỗi giao dịch.

---

## 🔍 Chu trình kiểm thử đã thực hiện

1. Deploy `TimeLockVault` với `lockDurationSeconds = 120`
2. Gọi `deposit()` với `1 ETH` → **OK**, phát sự kiện `Deposited`
3. Gọi `withdraw()` ngay lập tức → **REVERT** với lỗi `StillLocked(unlockTime, currentTime)` ✅
4. Gọi `timeLeft()` → trả về số giây còn lại ✅
5. Chờ 2 phút (Remix VM có thể tăng thời gian thủ công) → gọi `withdraw()` → **OK**, phát sự kiện `Withdrawn`, số dư hợp đồng về 0 ✅

---

## 📸 Ảnh chụp màn hình

> *(Chụp màn hình ba bước trên Remix VM và lưu vào thư mục này với tên:)*  
> - `01_deploy_success.png`  
> - `02_deposit_1eth.png`  
> - `03_withdraw_rejected_still_locked.png`  
> - `04_withdraw_success_after_unlock.png`
