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
