// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Ket tiet kiem co khoa thoi gian
/// @notice Hop dong hoc ky thuat (training) - Lab 09 · ECO2432
/// @dev Minh hoa bon ky thuat co ban: phan quyen, event, error tuy bien, Checks-Effects-Interactions
contract TimeLockVault {
    // Chu so huu ket va thoi diem mo khoa (bat bien sau khi khoi tao)
    address public owner;
    uint256 public unlockTime;

    // Ghi nhan moi lan nap va rut de co the tra cuu tren chain
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // Loi tuy bien: ro rang hon require chuoi dai va tiet kiem gas
    error NotOwner();
    error StillLocked(uint256 unlockAt, uint256 currentTime);
    error NothingToWithdraw();
    error ZeroAmount();

    /// @param lockDurationSeconds Thoi gian khoa tinh bang giay (vi du 120 = 2 phut)
    constructor(uint256 lockDurationSeconds) {
        owner = msg.sender;
        unlockTime = block.timestamp + lockDurationSeconds;
    }

    /// @notice Bat ky ai cung co the nap tien vao ket (R1)
    function deposit() external payable {
        // Checks
        if (msg.value == 0) revert ZeroAmount();
        // Effects + Interactions (chi emit, khong chuyen tien ra)
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Chi chu so huu moi rut duoc, va chi sau khi het thoi gian khoa (R2, R3)
    function withdraw() external {
        // 1. Checks - kiem tra dieu kien truoc
        if (msg.sender != owner) revert NotOwner();
        if (block.timestamp < unlockTime) revert StillLocked(unlockTime, block.timestamp);
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        // 2. Effects - phat su kien truoc khi chuyen tien ra ngoai
        emit Withdrawn(owner, amount);

        // 3. Interactions - chuyen tien ra ngoai sau cung
        (bool ok, ) = payable(owner).call{value: amount}("");
        require(ok, "Chuyen tien that bai");
    }

    /// @notice Xem so giay con lai truoc khi mo khoa (tra ve 0 neu da mo)
    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }
}
