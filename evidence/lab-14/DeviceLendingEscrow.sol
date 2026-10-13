// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title He thong Dat coc Muon Thiet bi CLB Tin hoc (Nhom 2)
/// @notice Ma nguon duoc Nhóm 1 audit trong Lab 14
contract DeviceLendingEscrow {
    enum State { Available, Borrowed, Returned, Refunded }

    struct LendingOrder {
        address borrower;
        uint256 deposit;
        uint256 borrowTime;
        uint256 returnDeadline;
        bool isRefunded;
    }

    address public manager;
    uint256 public penaltyBps = 100; // 1% moi ngay tre han
    uint256 private cabinetPin; // Ma PIN mo tu thiet bi (LOI: Private khong giu duoc bi mat)
    
    LendingOrder[] public orders; // LOI: Mang dong duyet khong gioi han

    event DeviceBorrowed(address indexed borrower, uint256 deposit, uint256 deadline);
    event DeviceReturned(address indexed borrower, uint256 refundAmount);

    error NotManager();
    error InvalidState();
    error TransferFailed();

    modifier onlyManager() {
        if (msg.sender != manager) revert NotManager();
        _;
    }

    constructor(uint256 _pin) {
        // LOI: Khong kiem tra manager != address(0)
        manager = msg.sender;
        cabinetPin = _pin;
    }

    /// @notice Sinh vien dat coc de muon thiet bi
    function borrowDevice(uint256 durationDays) external payable {
        // LOI: Khong kiem tra msg.value > 0 (Truong hop so 0)
        orders.push(LendingOrder({
            borrower: msg.sender,
            deposit: msg.value,
            borrowTime: block.timestamp,
            returnDeadline: block.timestamp + (durationDays * 1 days),
            isRefunded: false
        }));

        emit DeviceBorrowed(msg.sender, msg.value, block.timestamp + (durationDays * 1 days));
    }

    /// @notice Quan ly xac nhan da nhan lai thiet bi va hoan tien coc
    function refundDeposit(uint256 orderId) external onlyManager {
        LendingOrder storage order = orders[orderId];
        if (order.isRefunded) revert InvalidState();

        uint256 penalty = 0;
        if (block.timestamp > order.returnDeadline) {
            uint256 overdueHours = (block.timestamp - order.returnDeadline) / 3600;
            penalty = calculateOverduePenalty(order.deposit, overdueHours);
        }

        uint256 refundAmount = order.deposit > penalty ? order.deposit - penalty : 0;

        // LOI NGHIEM TRONG 1: Dung transfer co the gay ket tien
        // LOI 2: Vi pham CEI (chuyen tien truoc khi cap nhat isRefunded)
        payable(order.borrower).transfer(refundAmount);

        order.isRefunded = true;
        emit DeviceReturned(order.borrower, refundAmount);
    }

    /// @notice Tinh tien phat tre han
    function calculateOverduePenalty(uint256 deposit, uint256 overdueHours) public view returns (uint256) {
        // LOI: Phep chia truoc nhan sau lam tron ve 0
        uint256 hourlyRate = (deposit * penaltyBps) / 10000 / 24;
        uint256 penalty = hourlyRate * overdueHours;
        return penalty;
    }

    /// @notice Xu ly khi thiet bi bi hong hoc khau tru tien coc
    function resolveDamage(uint256 orderId, uint256 damageDeduction) external onlyManager {
        LendingOrder storage order = orders[orderId];
        if (order.isRefunded) revert InvalidState();

        uint256 refundAmount = order.deposit > damageDeduction ? order.deposit - damageDeduction : 0;
        
        // LOI: Dung transfer
        payable(order.borrower).transfer(refundAmount);
        order.isRefunded = true;
    }

    /// @notice Cap nhat ty le phat tre han
    /// LOI: Quen kiem tra quyen onlyManager, ai cung goi duoc
    function setPenaltyRate(uint256 _newRateBps) external {
        penaltyBps = _newRateBps;
    }

    /// @notice Thong ke tong so thiet bi ma mot sinh vien da tung muon
    /// LOI NGHIEM TRONG: Vong lap khong gioi han qua toan bo mang orders[] gay vuot gas limit (DoS)
    function getBorrowerTotalDevices(address borrower) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].borrower == borrower) {
                count++;
            }
        }
        return count;
    }
}
