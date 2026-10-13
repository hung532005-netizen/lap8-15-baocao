// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Ngan hang an toan - Cach 1: Checks-Effects-Interactions (CEI)
/// @notice Khong dung thu vien phu tro, cap nhat so sach truoc khi chuyen tien
contract SafeBankCEI {
    mapping(address => uint256) public balances;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    error NoBalance();
    error TransferFailed();

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        // 1. Checks: Kiem tra dieu kien
        uint256 bal = balances[msg.sender];
        if (bal == 0) revert NoBalance();

        // 2. Effects: Cap nhat so sach TRUOC KHI tuong tac ra ngoai
        balances[msg.sender] = 0;
        emit Withdrawn(msg.sender, bal);

        // 3. Interactions: Chuyen tien ra ngoai sau cung
        (bool ok, ) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/// @title Ngan hang an toan - Cach 2: Dung ReentrancyGuard cua OpenZeppelin
/// @notice Dung khoa trang thai (mutex) chan moi cu goi long nhau
contract SafeBankGuard is ReentrancyGuard {
    mapping(address => uint256) public balances;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    error NoBalance();
    error TransferFailed();

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external nonReentrant {
        // Checks
        uint256 bal = balances[msg.sender];
        if (bal == 0) revert NoBalance();

        // Effects
        balances[msg.sender] = 0;
        emit Withdrawn(msg.sender, bal);

        // Interactions
        (bool ok, ) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/// @title Hop dong tan cong thu nghiem tren Ngan hang an toan
contract AttackerSafeBank {
    address public targetBank;
    address public owner;
    uint256 public attackCount;

    constructor(address _targetBank) {
        targetBank = _targetBank;
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Can it nhat 1 ETH lam von");
        (bool depOk, ) = targetBank.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(depOk, "Nap tien that bai");

        (bool withOk, ) = targetBank.call(abi.encodeWithSignature("withdraw()"));
        require(withOk, "Rut tien that bai");
    }

    receive() external payable {
        attackCount++;
        // Ke tan cong co tinh goi lai withdraw() khi dang nhan tien
        if (targetBank.balance >= 1 ether && attackCount < 10) {
            (bool ok, ) = targetBank.call(abi.encodeWithSignature("withdraw()"));
            // Neu ngan hang da duoc va loi, cu goi lai se that bai
            require(ok, "Tan cong tai nhap bi chan thanh cong!");
        }
    }
}
