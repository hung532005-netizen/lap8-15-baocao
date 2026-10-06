# BẰNG CHỨNG THỰC HÀNH LAB 11: CÀI QUY TẮC KINH TẾ VÀO SẢN PHẨM

> **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)  
> **Thành viên:** Lê Tiến Hùng (23K4300007) — Đồ án Ký quỹ KTX Trường Bia (`hce-escrow-k58`)  
> **Tài liệu bàn giao:** Báo cáo cài đặt quy tắc kinh tế, phân tích mã nguồn mẫu và bộ bằng chứng kiểm thử  
> **Commit mục tiêu:** `lab-11: cai quy tac kinh te va test`

---

## 1. Phân tích bài mẫu học phần `ClassPoint.sol` (Bước 1 & Bước 2)

Hợp đồng bài tập mẫu tại [`contracts/training/ClassPoint.sol`](../../contracts/training/ClassPoint.sol) minh họa cách biến đổi các quy tắc kinh tế thành mã nguồn Solidity:

```solidity
contract ClassPoint is ERC20, Ownable {
    address public classFund;      // Vi quy lop nhan phi
    uint256 public feeBps = 100;   // 100 diem co ban = 1%
    uint256 public maxHolding;     // Tran nam giu toi da moi vi
    event FeeCollected(address indexed from, uint256 amount);
    error ExceedsMaxHolding(uint256 balance, uint256 maximum);
    // ...
```

### Ba điểm kinh tế & kỹ thuật then chốt:

1. **Điểm cơ bản (Basis Point - BPS):**  
   - Solidity không hỗ trợ số thực (floating point). Để biểu diễn $1\%$, hệ thống tài chính quy chuẩn dùng số nguyên `feeBps = 100` với mẫu số `10_000` ($100 / 10.000 = 0.01 = 1\%$). Cơ chế này bảo đảm độ chính xác tuyệt đối, không phát sinh sai số làm tròn số học.
2. **Loại trừ chủ sở hữu (`from != owner()`):**  
   - Nếu không có điều kiện `from != owner()`, khi chủ sở hữu (`owner`) đúc hoặc phát token thưởng ban đầu cho sinh viên, giao dịch cũng sẽ bị tự động trừ $1\%$ phí nạp vào ví quỹ. Đây là lỗi nghiệp vụ logic kinh tế điển hình mà AI thường bỏ sót nếu không nắm rõ bài toán phát hành ban đầu.
3. **Cơ chế Hook `_update` trong OpenZeppelin phiên bản 5.x:**  
   - OpenZeppelin Contracts v5.x đã **loại bỏ hoàn toàn** hook `_beforeTokenTransfer` và thay thế bằng hàm `_update(address from, address to, uint256 value)`. Các công cụ AI cũ thường sinh mã theo v4.x gây lỗi biên dịch nghiêm trọng.

---

## 2. Quy tắc kinh tế lựa chọn cho sản phẩm `ProjectCore.sol` (Bước 3)

Trong đề tài **Ký quỹ mua bán đồ cũ KTX Trường Bia**, nhóm chọn cài đặt và thắt chặt **Quy tắc thu phí nền tảng 1% phục vụ Quỹ sinh viên KTX và Bảo vệ dòng tiền giao dịch** (khớp hoàn toàn với [`docs/ECONOMIC_RULES.md`](../../docs/ECONOMIC_RULES.md) và [`docs/SPEC.md`](../../docs/SPEC.md)):

### 2.1. Mã nguồn cài đặt trong [`contracts/project/ProjectCore.sol`](../../contracts/project/ProjectCore.sol)

```solidity
// Hang so kinh te: Phi nen tang 1% = 100 basis points (1% = 100 / 10000)
uint256 public constant PLATFORM_FEE_BPS = 100;
uint256 public constant BPS_DENOMINATOR = 10000;
uint256 public constant MIN_TRANSACTION_LIMIT = 10000 wei; // Tranh bay phi lam tron ve 0
uint256 public constant MAX_TRANSACTION_LIMIT = 1 ether;     // Gioi han chong rua tien

event FeeCollected(address indexed recipient, uint256 amount);
event Completed(address indexed seller, uint256 payout, uint256 fee);

error PriceExceedsLimit(uint256 attempted, uint256 limit);
error PriceBelowMinimum(uint256 attempted, uint256 minimum);
```

### 2.2. Cơ chế phân bổ dòng tiền chuẩn Checks-Effects-Interactions:

```solidity
function _distributeFunds() internal {
    uint256 total = address(this).balance;
    uint256 fee = (total * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
    uint256 sellerPayout = total - fee;

    emit FeeCollected(feeRecipient, fee);
    emit Completed(seller, sellerPayout, fee);

    (bool feeOk, ) = feeRecipient.call{value: fee}("");
    if (!feeOk) revert TransferFailed();

    (bool sellerOk, ) = seller.call{value: sellerPayout}("");
    if (!sellerOk) revert TransferFailed();
}
```

---

## 3. Kết quả kiểm thử và Minh chứng (Bước 4)

Chi tiết thực thi lưu trữ tại: [`evidence/lab-11/test_output.log`](test_output.log)  
Script kiểm chứng mô hình kinh tế: [`evidence/lab-11/economic_model_verification.py`](economic_model_verification.py)

### 3.1. Bảng tổng hợp các ca kiểm thử

| Mã ca | Loại ca | Hành vi kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **TC-01** | **Hợp lệ** | Người mua nạp $0.1\text{ ETH}$ và gọi `confirmReceived()`. | Trích $1\%$ ($0.001\text{ ETH}$) cho quỹ KTX, trả $99\%$ ($0.099\text{ ETH}$) cho người bán. Phát `FeeCollected` và `Completed`. | Hợp đồng chuyển sang `Completed`, số dư về $0$, quỹ nhận đúng $0.001\text{ ETH}$, seller nhận đúng $0.099\text{ ETH}$. | ✅ ĐẠT |
| **TC-02** | **Gian lận** | Người bán tự nạp cọc cho chính đơn hàng của mình (Wash trading). | Revert với custom error `SellerCannotBeBuyer()`. | Bị từ chối giao dịch: `revert SellerCannotBeBuyer()`. | ✅ ĐẠT |
| **TC-03** | **Gian lận** | Kẻ lạ mạo danh người mua gọi `confirmReceived()` trước hạn. | Revert với custom error `NotBuyer()`. | Bị từ chối giao dịch: `revert NotBuyer()`. | ✅ ĐẠT |
| **TC-04** | **Vi phạm trần** | Người bán tạo đơn hàng giá $1.5\text{ ETH}$ ($> 1.0\text{ ETH}$). | Revert với `PriceExceedsLimit(price, limit)` chống rửa tiền. | Revert ngay tại `constructor` với `PriceExceedsLimit`. | ✅ ĐẠT |
| **TC-05** | **Bẫy làm tròn** | Người bán tạo đơn hàng giá $50\text{ wei}$ ($< 10.000\text{ wei}$). | Revert với `PriceBelowMinimum(price, minimum)` tránh phí $= 0$. | Revert ngay tại `constructor` với `PriceBelowMinimum`. | ✅ ĐẠT |

---

## 4. Phân tích đối soát toán học Basis Points

Giả định đơn hàng giá trị $0.1\text{ ETH} = 100.000.000.000.000.000\text{ wei}$ ($10^{17}\text{ wei}$):

$$\text{Phí nền tảng (Fee)} = \frac{10^{17} \times 100}{10.000} = 10^{15}\text{ wei} = 0.001\text{ ETH}$$

$$\text{Người bán thực nhận (Payout)} = 10^{17} - 10^{15} = 99 \times 10^{15}\text{ wei} = 0.099\text{ ETH}$$

$$\text{Bảo toàn tiền tệ} = \text{Fee} + \text{Payout} = 0.001 + 0.099 = 0.1\text{ ETH} = \text{Tổng tiền ký quỹ}$$

Số dư sau tất toán của hợp đồng luôn quay về chính xác $0\text{ wei}$, không có hiện tượng kẹt bụi tiền (dust).

---

## 5. Xử lý các bẫy thường gặp theo yêu cầu Lab 11

| Bẫy nghiệp vụ | Hậu quả nếu không xử lý | Giải pháp đã cài đặt trong dự án |
| :--- | :--- | :--- |
| **Bẫy 1:** Dùng `_beforeTokenTransfer` của OpenZeppelin v4 | Gây lỗi biên dịch vì OpenZeppelin v5.x đã xóa hook này. | Hợp đồng bài mẫu `ClassPoint.sol` dùng đúng hook `_update`. |
| **Bẫy 2:** Quên nhân `10 ** decimals()` khi phát hành token | Lượng token phát hành thực tế bị giảm $10^{18}$ lần (chỉ còn $10^{-18}$ token). | Trong `ClassPoint.sol`, nhân chính xác `1_000_000 * 10 ** decimals()`. |
| **Bẫy 3:** Phí tính ra 0 do số tiền chuyển quá nhỏ | Phép chia số nguyên `(value * 100) / 10000` làm tròn xuống $0$ khiến nền tảng bị thất thoát phí. | Thêm chặn dưới cứng `MIN_TRANSACTION_LIMIT = 10000 wei` và revert với `PriceBelowMinimum`. |

---

## 6. Trạng thái mã nguồn & Đáp ứng quy chuẩn môn học

- **Độ dài hợp đồng `ProjectCore.sol`:** 148 dòng (đáp ứng tiêu chuẩn $< 150$ dòng).
- **Chú thích:** Tiếng Việt không dấu theo đúng quy ước `AGENTS.md`.
- **An toàn bảo mật:** Tuân thủ Checks-Effects-Interactions, chuyển tiền bằng `.call{value: ...}("")`, dùng custom errors thay cho chuỗi revert dài.
