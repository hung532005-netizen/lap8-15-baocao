# NHẬT KÝ LÀM VIỆC VỚI AI — LAB 08

> **Dự án:** KTX Escrow (`hce-escrow-k58`)  
> **Thành viên ghi nhận:** Lê Tiến Hùng, Nguyễn Văn An, Trần Thị Mai  
> **Mục tiêu:** Ghi nhận quá trình phản biện quy tắc kinh tế, phát hiện lỗ hổng logic của AI và hoàn thiện đặc tả v0.1.

---

## Lần 1: Thiết kế quy tắc giải ngân và hoàn tiền tự động

### 1. Prompt:
> *"Hãy viết hợp đồng Ký quỹ M.1 cho mua bán đồ cũ, có hàm refundAfterDeadline để nếu quá hạn kiểm tra hàng thì tự động hoàn tiền cho người mua."*

### 2. AI trả về:
AI sinh ra hợp đồng với hàm `refundAfterDeadline`:
```solidity
function refundAfterDeadline() external {
    if (state != State.Funded) revert WrongState();
    if (block.timestamp < deadline) revert DeadlineNotReached();
    state = State.Refunded;
    (bool ok, ) = payable(buyer).call{value: address(this).balance}("");
    require(ok, "Hoan tien that bai");
}
```

### 3. Đánh giá:
**Sai nghiêm trọng về logic kinh tế — Phải sửa.**

### 4. Chỗ sai:
Sinh viên phát hiện lỗ hổng kinh tế kinh điển: Trong mô hình thương mại điện tử (Shopee/eBay/Escrow), nếu người mua đã nhận hàng nhưng cố tình "im lặng", không bấm xác nhận và chờ đến khi hết hạn `deadline`, người mua sẽ gọi hàm này để **vừa lấy lại toàn bộ tiền, vừa ẵm trọn món hàng của người bán**! Mẫu M.1 cơ bản trong sách cũng chỉ ra đây là điểm rủi ro cần nhóm tự hoàn thiện thêm.

### 5. Cách sửa:
Nhóm đã sửa đổi căn bản nguyên lý kinh tế:
1. Đổi hàm thành `claimPaymentAfterDeadline()`: Sau khi hết hạn kiểm tra mà không có khiếu nại, tiền phải **tự động giải ngân cho người bán (Seller)** để bảo vệ người bán khỏi người mua gian dối.
2. Bổ sung hàm `raiseDispute()`: Nếu hàng có vấn đề hoặc người bán không giao hàng, người mua phải chủ động mở tranh chấp trong thời hạn quy định để đóng băng tiền trước khi deadline kích hoạt.

### 6. Ai phát hiện:
**Sinh viên phát hiện và trực tiếp phản biện lại AI.**

---

## Lần 2: Ràng buộc tham số khởi tạo chống bẫy thời gian ngắn

### 1. Prompt:
> *"Bạn là người dùng thận trọng. Chỉ dựa trên SPEC và ECONOMIC_RULES dưới đây, hãy nêu 5 cách một người có thể lạm dụng quy tắc hoặc làm người khác bị thiệt. Với mỗi cách, chỉ rõ quy tắc nào chưa đủ chặt. Không viết mã."*

### 2. AI trả về:
AI liệt kê 5 điểm sơ hở, trong đó có lỗ hổng: Người bán có thể deploy hợp đồng với `_inspectionDays = 0` hoặc vài giây, sau đó dụ người mua nạp tiền và lập tức rút tiền trước khi người mua kịp nhìn thấy món hàng.

### 3. Đánh giá:
**Dùng được — Gợi ý phản biện rất sắc bén.**

### 4. Chỗ sai / Thiếu sót của quy tắc cũ:
Quy tắc v0 ban đầu không có quy định chặn dưới cho thời gian kiểm tra hàng, tạo điều kiện cho người bán gian lận đặt bẫy thời gian.

### 5. Cách sửa:
Nhóm bổ sung kiểm tra chặn dưới cứng vào `constructor` của hợp đồng và ghi rõ trong quy tắc kinh tế:
```solidity
if (_inspectionDays < 1) revert InvalidInspectionWindow(); // Bat buoc >= 24 gio
```

### 6. Ai phát hiện:
**AI gợi ý qua prompt phản biện và Sinh viên thống nhất bổ sung vào mã nguồn.**

---

## LAB 09 — HỢP ĐỒNG ĐẦU TIÊN: KÉT TIẾT KIỆM CÓ KHÓA THỜI GIAN

> **Ngày thực hiện:** 2026-10-04  
> **Mục tiêu:** Học kỹ thuật từ `TimeLockVault.sol`, áp dụng vào `ProjectCore.sol`

---

## Lần 3 (Lab 09): So sánh bản AI sinh vs bản mẫu giảng viên — TimeLockVault

### 1. Prompt:
> *"Viết hợp đồng Solidity theo SPEC.md (5 quy tắc R1–R5 của két tiết kiệm), tuân thủ AGENTS.md: dùng ^0.8.20, error tùy biến, call thay transfer, Checks-Effects-Interactions, chú thích tiếng Việt không dấu."*

### 2. AI trả về (bản ban đầu của nhóm):
AI sinh ra hợp đồng khá tốt, tuy nhiên có một số điểm khác biệt so với bản mẫu:
- Dùng `immutable` cho `owner` và `unlockTime` — tiết kiệm gas hơn bản mẫu nhưng không ảnh hưởng nghiệp vụ.
- Dùng `error TransferFailed()` thay cho `require(ok, "Chuyen tien that bai")`.
- **Thiếu hàm `timeLeft()`** — bản mẫu có hàm tiện ích này để người dùng tra cứu thời gian còn lại.

### 3. Đánh giá:
**Bản AI gần đúng nhưng thiếu hàm `timeLeft()` — đây là tính năng UX quan trọng.**

### 4. Chỗ thiếu / cần sửa:
| Điểm so sánh | Bản AI sinh | Bản mẫu giảng viên | Quyết định |
| :--- | :--- | :--- | :--- |
| `owner`, `unlockTime` | `immutable` | Biến thông thường | Giữ nguyên (không ảnh hưởng) |
| Lỗi chuyển tiền | `error TransferFailed()` | `require(ok, "chuoi")` | Theo bản mẫu để đồng bộ |
| Hàm tiện ích | Không có | `timeLeft()` | **Bổ sung vào** |
| Chú thích | Có nhưng ngắn | Có giải thích 4 điểm kỹ thuật | Bổ sung giải thích |

### 5. Cách sửa:
Bổ sung hàm `timeLeft()` và chuẩn hóa theo bản mẫu:
```solidity
function timeLeft() external view returns (uint256) {
    if (block.timestamp >= unlockTime) return 0;
    return unlockTime - block.timestamp;
}
```

### 6. Ai phát hiện:
**Sinh viên tự phát hiện khi đối chiếu trực tiếp với bản mẫu của giảng viên.**

---

## Lần 4 (Lab 09): Áp dụng kỹ thuật TimeLockVault vào ProjectCore — Lỗi biên dịch

### 1. Quá trình:
Sau khi học `TimeLockVault.sol`, nhóm mở `contracts/project/ProjectCore.sol` để kiểm tra bản đã có từ Lab 08 có áp dụng đúng 4 kỹ thuật không.

### 2. Kết quả kiểm tra:
`ProjectCore.sol` đã biên dịch thành công trên Remix VM với trình biên dịch `0.8.20`.

**4 kỹ thuật đối chiếu:**
| Kỹ thuật | TimeLockVault | ProjectCore | Đạt? |
| :--- | :--- | :--- | :---: |
| Phân quyền rõ ràng | `owner` | `seller`, `buyer`, `arbiter` | ✅ |
| `event` ghi nhận mọi thay đổi | `Deposited`, `Withdrawn` | `Funded`, `Completed`, `Disputed`, `Refunded`, `DisputeResolved` | ✅ |
| `error` tùy biến thay chuỗi | `NotOwner()`, `StillLocked()` | `NotBuyer()`, `NotArbiter()`, `WrongAmount()` v.v. | ✅ |
| Thứ tự Checks-Effects-Interactions | Đúng trong `withdraw()` | Đúng trong mọi hàm công khai | ✅ |

### 3. Lỗi đã gặp và cách sửa trong quá trình viết:
- **Lỗi**: Ban đầu `resolveDispute()` phát `emit DisputeResolved` sau khi đã gọi `_distributeFunds()` (vi phạm CEI do emit sau call).
- **Sửa**: Chuyển `emit DisputeResolved` lên trước lệnh chuyển tiền trong `_distributeFunds()`.
- **Kết quả**: Hợp đồng biên dịch không lỗi, logic CEI đúng chuẩn.

### 4. Ai phát hiện:
**Sinh viên tự kiểm tra và sửa trong quá trình đối chiếu với bản mẫu TimeLockVault.**
