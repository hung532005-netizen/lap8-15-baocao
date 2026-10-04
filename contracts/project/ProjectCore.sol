// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title KTX Escrow - Hop dong ky quy mua ban do cu sinh vien
/// @notice Thuoc de tai 1 (Phan N) - Mon hoc ECO2432 Web3 Starter
/// @dev Duoi 150 dong theo quy chuan, ap dung Checks-Effects-Interactions va custom errors.
contract ProjectCore {
    enum State { Created, Funded, Completed, Refunded, Disputed }

    // Hang so kinh te: Phi nen tang 1% = 100 basis points (1% = 100 / 10000)
    uint256 public constant PLATFORM_FEE_BPS = 100;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_TRANSACTION_LIMIT = 1 ether; // Gioi han chong rua tien

    address payable public immutable seller;
    address payable public immutable arbiter;
    address payable public immutable feeRecipient;
    uint256 public immutable price;
    uint256 public immutable deadlineDuration;

    address payable public buyer;
    uint256 public deadline;
    State public state;

    event Funded(address indexed buyer, uint256 amount, uint256 deadline);
    event Completed(address indexed seller, uint256 payout, uint256 fee);
    event Refunded(address indexed buyer, uint256 amount);
    event Disputed(address indexed initiator);
    event DisputeResolved(address indexed arbiter, uint8 decision, uint256 amount);

    error WrongState();
    error NotBuyer();
    error NotSeller();
    error NotArbiter();
    error NotParty();
    error SellerCannotBeBuyer();
    error ArbiterCannotBeBuyer();
    error ConflictOfInterest();
    error WrongAmount();
    error DeadlineNotReached();
    error DeadlinePassed();
    error InvalidInspectionWindow();
    error PriceExceedsLimit();
    error InvalidDecision();
    error TransferFailed();

    constructor(
        address payable _seller,
        address payable _arbiter,
        address payable _feeRecipient,
        uint256 _price,
        uint256 _inspectionDays
    ) {
        if (_seller == address(0) || _arbiter == address(0) || _feeRecipient == address(0)) revert WrongState();
        if (_seller == _arbiter) revert ConflictOfInterest();
        if (_inspectionDays < 1) revert InvalidInspectionWindow();
        if (_price == 0 || _price > MAX_TRANSACTION_LIMIT) revert PriceExceedsLimit();

        seller = _seller;
        arbiter = _arbiter;
        feeRecipient = _feeRecipient;
        price = _price;
        deadlineDuration = _inspectionDays * 1 days;
        state = State.Created;
    }

    /// @notice Nguoi mua nap coc vao hop dong de khoa tien
    function fund() external payable {
        if (state != State.Created) revert WrongState();
        if (msg.sender == seller) revert SellerCannotBeBuyer();
        if (msg.sender == arbiter) revert ArbiterCannotBeBuyer();
        if (msg.value != price) revert WrongAmount();

        buyer = payable(msg.sender);
        deadline = block.timestamp + deadlineDuration;
        state = State.Funded;

        emit Funded(msg.sender, msg.value, deadline);
    }

    /// @notice Nguoi mua xac nhan da nhan do va hai long
    function confirmReceived() external {
        if (state != State.Funded) revert WrongState();
        if (msg.sender != buyer) revert NotBuyer();

        state = State.Completed;
        _distributeFunds();
    }

    /// @notice Qua han kiem tra ma nguoi mua khong xac nhan va khong khieu nai thi giai ngan cho nguoi ban
    function claimPaymentAfterDeadline() external {
        if (state != State.Funded) revert WrongState();
        if (block.timestamp < deadline) revert DeadlineNotReached();

        state = State.Completed;
        _distributeFunds();
    }

    /// @notice Mot trong hai ben mo tranh chap neu co gian lan hoac hang hong
    function raiseDispute() external {
        if (state != State.Funded) revert WrongState();
        if (msg.sender != buyer && msg.sender != seller) revert NotParty();
        if (block.timestamp >= deadline) revert DeadlinePassed();

        state = State.Disputed;
        emit Disputed(msg.sender);
    }

    /// @notice Trong tai dua ra phan quyet cuoi cung
    /// @param decision 1: Chuyen tien cho seller; 2: Hoan tien cho buyer
    function resolveDispute(uint8 decision) external {
        if (state != State.Disputed) revert WrongState();
        if (msg.sender != arbiter) revert NotArbiter();

        uint256 balance = address(this).balance;

        if (decision == 1) {
            state = State.Completed;
            emit DisputeResolved(arbiter, 1, balance);
            _distributeFunds();
        } else if (decision == 2) {
            state = State.Refunded;
            emit Refunded(buyer, balance);
            emit DisputeResolved(arbiter, 2, balance);
            (bool ok, ) = buyer.call{value: balance}("");
            if (!ok) revert TransferFailed();
        } else {
            revert InvalidDecision();
        }
    }

    /// @dev Ham noi bo chia tien cho seller (99%) va phi nen tang (1%)
    function _distributeFunds() internal {
        uint256 total = address(this).balance;
        uint256 fee = (total * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 sellerPayout = total - fee;

        emit Completed(seller, sellerPayout, fee);

        (bool feeOk, ) = feeRecipient.call{value: fee}("");
        if (!feeOk) revert TransferFailed();

        (bool sellerOk, ) = seller.call{value: sellerPayout}("");
        if (!sellerOk) revert TransferFailed();
    }
}
