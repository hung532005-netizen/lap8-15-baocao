# SPEC — KTX Trường Bia (Ký Quỹ Mua Bán Đồ Cũ Sinh Viên)

> **Phiên bản:** v0.3 (Lab 11 — Cài quy tắc kinh tế và kiểm thử)  
> **Áp dụng cho:** Sinh viên nội trú KTX Trường Bia và sinh viên trường Đại học Kinh tế - Đại học Huế (HCE)  
> **Mã nguồn:** `contracts/project/ProjectCore.sol`

---

## 1. Mục đích

Hệ thống cung cấp cơ chế ký quỹ (escrow) tự động bằng Smart Contract cho sinh viên KTX Trường Bia mua bán, thanh lý đồ dùng học tập và sinh hoạt đã qua sử dụng, bảo đảm người mua chỉ mất tiền khi đã nhận và kiểm tra đồ đúng cam kết, đồng thời bảo vệ người bán không bị người mua chây ì giam vốn hoặc bùng tiền.

---

## 2. Đầu vào

| Tên tham số | Kiểu dữ liệu | Bên cung cấp | Diễn giải |
| :--- | :--- | :--- | :--- |
| `seller` | `address payable` | Người bán khởi tạo | Địa chỉ ví nhận tiền bán hàng của người bán. |
| `arbiter` | `address payable` | Hệ thống / Thỏa thuận | Địa chỉ ví trọng tài trung gian (Ban đại diện KTX / Admin). |
| `feeRecipient` | `address payable` | Ban quản trị KTX | Địa chỉ ví nhận phí nền tảng $1\%$ phục vụ quỹ sinh viên. |
| `price` | `uint256` | Người bán khởi tạo | Giá niêm yết của món hàng ($10.000\text{ wei} \le \text{price} \le 1.0\text{ ETH}$). |
| `inspectionDays` | `uint256` | Người bán / Mặc định | Số ngày kiểm tra hàng (mặc định 3 ngày, tối thiểu $\ge 1$ ngày). |
| `msg.value` | `uint256` | Người mua gửi vào | Số tiền ETH người mua nạp cọc khóa vào hợp đồng. |
| `decision` | `uint8` | Trọng tài cung cấp | Phán quyết khi có tranh chấp (1: Trả người bán, 2: Hoàn người mua). |

---

## 3. Quy tắc nghiệp vụ (Business Rules)

*Mỗi quy tắc là một câu khẳng định có thể kiểm thử độc lập (Testable Assertion):*

- **R1 (Quy tắc Nạp cọc chính xác & Chống Wash Trading):** Khi hợp đồng ở trạng thái khởi tạo `Created`, chỉ người mua có địa chỉ khác `seller` và khác `arbiter` được phép nạp tiền; số tiền `msg.value` gửi vào phải bằng chính xác `price` đã niêm yết; nếu gửi sai số tiền hoặc người bán tự nạp cho chính mình thì giao dịch bị revert với lỗi `WrongAmount()` hoặc `SellerCannotBeBuyer()`.
- **R2 (Quy tắc Thu phí nền tảng 1% & Giải ngân thành công):** Khi hợp đồng ở trạng thái đã nạp cọc `Funded`, chỉ duy nhất người mua (`buyer`) có quyền gọi hàm `confirmReceived()`; khi gọi thành công, hợp đồng chuyển sang trạng thái `Completed`, tự động trích đúng $1\%$ phí nền tảng ($100$ basis points, mẫu số $10.000$) chuyển vào ví `feeRecipient` và giải ngân $99\%$ số tiền còn lại cho `seller`. Hệ thống phát sinh hai sự kiện `FeeCollected(feeRecipient, fee)` và `Completed(seller, sellerPayout, fee)`.
- **R3 (Quy tắc Tự động giải ngân chống giam vốn):** Khi hợp đồng ở trạng thái `Funded` và thời gian trên chuỗi `block.timestamp` lớn hơn thời hạn `deadline` mà người mua không xác nhận cũng không khiếu nại, bất kỳ ai (kể cả người bán) đều có quyền gọi hàm `claimPaymentAfterDeadline()` để giải ngân toàn bộ tiền bán hàng cho `seller` (kèm trích $1\%$ phí); nếu gọi trước khi đến hạn `deadline` thì giao dịch bị revert với lỗi `DeadlineNotReached()`.
- **R4 (Quy tắc Khiếu nại & Mở trạng thái tranh chấp):** Trong khoảng thời gian trước `deadline` khi hợp đồng đang `Funded`, người mua hoặc người bán có quyền gọi hàm `raiseDispute()` nếu có gian lận hoặc hàng hỏng; khi đó trạng thái chuyển sang `Disputed`, mọi luồng giải ngân tự động và hoàn tiền tức thì đều bị đình chỉ tạm thời để bảo toàn tài sản.
- **R5 (Quy tắc Phán quyết trọng tài minh bạch):** Khi hợp đồng ở trạng thái `Disputed`, chỉ duy nhất địa chỉ ví trọng tài (`arbiter`) có quyền gọi hàm `resolveDispute(decision)`; nếu phán quyết `decision = 1` (cho người bán), hệ thống giải ngân $99\%$ cho người bán và trích $1\%$ phí; nếu `decision = 2` (hoàn người mua), hệ thống hoàn lại $100\%$ tiền cọc cho người mua (không thu phí nạn nhân); nếu người khác gọi hàm sẽ bị revert với lỗi `NotArbiter()`.

---

## 4. Đầu ra

- **Trạng thái hợp đồng (`State`):** Chuyển dịch tuần tự theo máy trạng thái hữu hạn: `Created` $\rightarrow$ `Funded` $\rightarrow$ `Completed` / `Refunded` / `Disputed`.
- **Sự kiện ghi nhận trên chuỗi (Events):**
  - `Funded(address indexed buyer, uint256 amount, uint256 deadline)`
  - `FeeCollected(address indexed recipient, uint256 amount)`
  - `Completed(address indexed seller, uint256 payout, uint256 fee)`
  - `Refunded(address indexed buyer, uint256 amount)`
  - `Disputed(address indexed initiator)`
  - `DisputeResolved(address indexed arbiter, uint8 decision, uint256 amount)`
- **Dòng tiền tất toán:** Số dư hợp đồng về đúng $0$ Wei sau khi giao dịch hoàn tất hoặc hoàn tiền thành công.

---

## 5. Trường hợp ngoại lệ & Bảo vệ kinh tế (Edge Cases)

- **E1 (Nạp sai số tiền):** Người mua gửi `msg.value` khác `price` $\rightarrow$ Hệ thống từ chối và báo lỗi `WrongAmount()`.
- **E2 (Người bán lạm quyền giải ngân):** Kẻ lạ hoặc người bán tự ý gọi `confirmReceived()` trước khi người mua nhận đồ $\rightarrow$ Hệ thống kiểm tra `msg.sender != buyer`, dừng thực thi và báo lỗi `NotBuyer()`.
- **E3 (Giá vượt trần chống rửa tiền):** Người bán tạo đơn giá `_price > 1.0 ETH` $\rightarrow$ Hệ thống từ chối khởi tạo với lỗi `PriceExceedsLimit(attempted, limit)`.
- **E4 (Giá quá nhỏ gây bẫy làm tròn phí về 0):** Người bán tạo đơn giá `_price < 10.000 wei` $\rightarrow$ Hệ thống từ chối khởi tạo với lỗi `PriceBelowMinimum(attempted, minimum)`.
- **E5 (Người mua chây ì không bấm xác nhận):** Người mua đã nhận đồ nhưng cố ý im lặng $\rightarrow$ Khi `block.timestamp >= deadline`, người bán gọi `claimPaymentAfterDeadline()` để nhận tiền tự động.
- **E6 (Khiếu nại sau khi đã hết hạn):** Người mua chỉ khiếu nại sau khi mốc `deadline` đã trôi qua $\rightarrow$ Hệ thống từ chối nhận khiếu nại, báo lỗi `DeadlinePassed()`.
- **E7 (Chuyển tiền thất bại):** Ví nhận là contract lỗi $\rightarrow$ Dùng `call{value: ...}("")` kiểm tra kết quả, revert `TransferFailed()`.

---

## 6. Ngoài phạm vi (Out of Scope)

- **Không tích hợp tự động dịch vụ chuyển phát ngoài đời thực (Logistics API):** Vì là giao dịch trực tiếp nội bộ khuôn viên KTX, việc giao nhận hàng do sinh viên tự hẹn gặp trực tiếp.
- **Không tự động đánh giá chất lượng vật lý món đồ bằng AI/Oracle on-chain:** Trọng tài phân xử sẽ thẩm định dựa trên bằng chứng hai bên cung cấp off-chain khi xảy ra tranh chấp.
- **Không xử lý tiền pháp định (VNĐ) trực tiếp trong smart contract:** Hợp đồng chỉ quản lý đồng ETH/Wei trên mạng thử nghiệm Sepolia / Remix VM.
