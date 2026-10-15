// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProjectCore - KTX Truong Bia Multi-Order Marketplace Escrow
 * @notice Hop dong ky quy da don hang, chong mua trung va ho tro xu ly tranh chap
 * @dev Phuc vu Muc 18-26: Admin/Student Portal, Marketplace Escrow & On-chain Indexer (Sepolia)
 */
contract ProjectCore {
    // ==========================================
    // 1. KIEU DU LIEU & TRANG THAI (ENUMS & STRUCTS)
    // ==========================================

    enum OrderStatus {
        None,       // 0: Chua ton tai
        Funded,     // 1: Da nap coc (Dang khoa tien trong Escrow)
        Completed,  // 2: Da xac nhan nhan hang & giai ngan cho nguoi ban
        Refunded,   // 3: Da hoan tra 100% coc cho nguoi mua
        Disputed,   // 4: Dang co tranh chap (Dong bang giai ngan tu dong)
        Resolved    // 5: Trong tai KTX da phan xu xong tranh chap
    }

    struct Order {
        uint256 orderId;          // Ma don hang on-chain duy nhat
        bytes32 listingKey;       // Hash dinh danh bai dang (keccak256(listingCode))
        string listingCode;       // Ma bai dang goc tu MarketplaceService (VD: "ITEM-101")
        address payable buyer;    // Vi sinh vien mua
        address payable seller;   // Vi sinh vien ban
        uint256 amount;           // Tong so Wei nguoi mua da nap coc
        uint256 platformFee;      // Phi nen tang da thu thuc te khi tat toan
        uint256 sellerPayout;     // So Wei nguoi ban thuc nhan
        uint256 buyerRefund;      // So Wei nguoi mua duoc hoan lai (neu co)
        uint256 createdAt;        // Thoi diem tao don (Unix timestamp)
        uint256 deadline;         // Han chot giao nhan / khieu nai
        uint256 completedAt;      // Thoi diem dong don (Unix timestamp)
        OrderStatus status;       // Trang thai hien tai cua don hang
        address disputedBy;       // Dia chi vi mo tranh chap
        string disputeReason;     // Ly do mo tranh chap
        string resolutionNote;    // Ket luan cua Trong tai KTX
    }

    // ==========================================
    // 2. BIEN TRANG THAI (STATE VARIABLES)
    // ==========================================

    address public owner;                 // Super Admin on-chain
    address public arbiter;               // Trong tai KTX xu ly tranh chap
    address payable public feeRecipient;  // Vi nhan phi nen tang
    bool public paused;                   // Cong tac dung khan cap khi bao tri

    uint16 public platformFeeBps = 100;   // Mac dinh 100 bps = 1.00%
    uint16 public constant MAX_FEE_BPS = 500; // Gioi han tran phi toi da 5.00%
    uint256 public defaultDuration = 3 days;  // Thoi han ky quy mac dinh: 3 ngay
    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 30 days;

    uint256 public nextOrderId = 1;

    // Thong ke truc tiep tren chuoi phuc vu Admin Dashboard (Muc 19.2)
    uint256 public totalOrdersCount;
    uint256 public openEscrowsCount;
    uint256 public completedOrdersCount;
    uint256 public activeDisputesCount;
    uint256 public totalVolumeWei;

    // Luu tru don hang va khoa chong mua trung (Test 16 & Test 18)
    mapping(uint256 => Order) private _orders;
    mapping(bytes32 => uint256) public activeOrderByListing; // listingKey => orderId dang mo (0 neu ranh)
    mapping(bytes32 => bool) public isListingSold;           // listingKey => true neu da ban thanh cong
    mapping(address => uint256[]) private _buyerOrders;      // Danh sach ma don theo nguoi mua
    mapping(address => uint256[]) private _sellerOrders;     // Danh sach ma don theo nguoi ban

    // Khoa chong tan cong Reentrancy
    uint256 private _unlocked = 1;

    // ==========================================
    // 3. SU KIEN PHUC VU INDEXER (EVENTS - MUC 23)
    // ==========================================

    event OrderCreated(
        uint256 indexed orderId,
        bytes32 indexed listingKey,
        string listingCode,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 deadline
    );

    event DeliveryConfirmed(
        uint256 indexed orderId,
        bytes32 indexed listingKey,
        address indexed buyer,
        address seller,
        uint256 sellerPayout,
        uint256 platformFee
    );

    event ClaimedAfterDeadline(
        uint256 indexed orderId,
        address indexed seller,
        uint256 sellerPayout,
        uint256 platformFee
    );

    event OrderRefunded(
        uint256 indexed orderId,
        bytes32 indexed listingKey,
        address indexed buyer,
        uint256 refundAmount,
        string reason
    );

    event DisputeOpened(
        uint256 indexed orderId,
        bytes32 indexed listingKey,
        address indexed openedBy,
        string reason
    );

    event DisputeResolved(
        uint256 indexed orderId,
        address indexed arbiter,
        uint256 buyerRefund,
        uint256 sellerPayout,
        uint256 platformFee,
        string resolutionNote
    );

    event RolesUpdated(address indexed owner, address indexed arbiter, address indexed feeRecipient);
    event PlatformFeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event PauseStateChanged(bool isPaused);

    // ==========================================
    // 4. LOI TUY CHINH & MODIFIERS
    // ==========================================

    modifier nonReentrant() {
        require(_unlocked == 1, "REENTRANCY_GUARD: Giao dich dang xu ly");
        _unlocked = 2;
        _;
        _unlocked = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER: Khong co quyen Super Admin");
        _;
    }

    modifier onlyArbiterOrOwner() {
        require(
            msg.sender == arbiter || msg.sender == owner,
            "ONLY_ARBITER: Khong co quyen Trong tai KTX hoac Admin"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "SYSTEM_PAUSED: He thong dang tam dung bao tri");
        _;
    }

    // ==========================================
    // 5. KHOI TAO HOP DONG (CONSTRUCTOR)
    // ==========================================

    constructor(address _arbiter, address payable _feeRecipient) {
        owner = msg.sender;
        arbiter = _arbiter != address(0) ? _arbiter : msg.sender;
        feeRecipient = _feeRecipient != address(0) ? _feeRecipient : payable(msg.sender);
    }

    // ==========================================
    // 6. CAC HAM KIEM TRA QUYEN ON-CHAIN (MUC 18.2 & 19.5)
    // ==========================================

    /**
     * @notice Kiem tra dia chi vi co phai la Admin hoac Trong tai tren hop dong hay khong
     */
    function isAdminOrArbiter(address account) external view returns (bool isOwnerRole, bool isArbiterRole) {
        return (account == owner, account == arbiter);
    }

    function setRoles(address _newArbiter, address payable _newFeeRecipient) external onlyOwner {
        require(_newArbiter != address(0) && _newFeeRecipient != address(0), "INVALID_ADDRESS: Dia chi khong hop le");
        arbiter = _newArbiter;
        feeRecipient = _newFeeRecipient;
        emit RolesUpdated(owner, arbiter, feeRecipient);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "INVALID_OWNER: Dia chi chu so huu khong hop le");
        owner = _newOwner;
        emit RolesUpdated(owner, arbiter, feeRecipient);
    }

    function setPlatformFeeBps(uint16 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= MAX_FEE_BPS, "FEE_TOO_HIGH: Phi vuot qua gioi han 5%");
        uint16 oldFee = platformFeeBps;
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(oldFee, _newFeeBps);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PauseStateChanged(_paused);
    }

    // ==========================================
    // 7. LUONG MUA HANG & KY QUY (MUC 22.1 & TEST 15, 16)
    // ==========================================

    /**
     * @notice Sinh vien tao don hang va nap coc ETH cho mot san pham cu the
     * @param listingCode Ma dinh danh bai dang tu Marketplace (VD: "LISTING-2026-001")
     * @param seller Dia chi vi cua sinh vien ban
     * @param customDuration Thoi han ky quy tinh bang giay (nhap 0 de dung mac dinh 3 ngay)
     */
    function createAndFundOrder(
        string calldata listingCode,
        address payable seller,
        uint256 customDuration
    ) external payable whenNotPaused nonReentrant returns (uint256 orderId) {
        require(bytes(listingCode).length > 0, "EMPTY_LISTING: Ma san pham khong duoc de trong");
        require(seller != address(0), "INVALID_SELLER: Dia chi nguoi ban khong hop le");
        require(seller != msg.sender, "SELF_PURCHASE: Khong the tu mua san pham cua chinh minh");
        require(msg.value > 0, "ZERO_VALUE: So tien ky quy phai lon hon 0");

        bytes32 listingKey = keccak256(abi.encodePacked(listingCode));

        // Chong mua trung (Test 16)
        require(!isListingSold[listingKey], "ITEM_ALREADY_SOLD: San pham nay da duoc ban");
        require(
            activeOrderByListing[listingKey] == 0,
            "ITEM_LOCKED_IN_ESCROW: San pham dang co giao dich ky quy mo"
        );

        uint256 duration = customDuration == 0 ? defaultDuration : customDuration;
        require(
            duration >= MIN_DURATION && duration <= MAX_DURATION,
            "INVALID_DURATION: Thoi han ky quy phai tu 1 gio den 30 ngay"
        );

        orderId = nextOrderId++;
        uint256 deadline = block.timestamp + duration;

        Order storage o = _orders[orderId];
        o.orderId = orderId;
        o.listingKey = listingKey;
        o.listingCode = listingCode;
        o.buyer = payable(msg.sender);
        o.seller = seller;
        o.amount = msg.value;
        o.createdAt = block.timestamp;
        o.deadline = deadline;
        o.status = OrderStatus.Funded;

        // Khoa bai dang de khong ai khac mua trung
        activeOrderByListing[listingKey] = orderId;
        _buyerOrders[msg.sender].push(orderId);
        _sellerOrders[seller].push(orderId);

        // Cap nhat thong ke on-chain
        totalOrdersCount++;
        openEscrowsCount++;
        totalVolumeWei += msg.value;

        emit OrderCreated(orderId, listingKey, listingCode, msg.sender, seller, msg.value, deadline);
    }

    /**
     * @notice Nguoi mua xac nhan da kiem tra va nhan hang -> Giai ngan cho nguoi ban
     */
    function confirmDelivery(uint256 orderId) external nonReentrant {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.Funded, "INVALID_STATUS: Don hang khong o trang thai dang ky quy");
        require(msg.sender == o.buyer, "ONLY_BUYER: Chi nguoi mua moi duoc xac nhan nhan hang");

        _releaseFundsToSeller(o, false);
    }

    /**
     * @notice Nguoi ban yeu cau giai ngan sau khi qua han deadline ma nguoi mua khong mo tranh chap
     */
    function claimAfterDeadline(uint256 orderId) external nonReentrant {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.Funded, "INVALID_STATUS: Don hang khong o trang thai dang ky quy");
        require(msg.sender == o.seller, "ONLY_SELLER: Chi nguoi ban moi duoc yeu cau giai ngan");
        require(block.timestamp > o.deadline, "DEADLINE_NOT_REACHED: Chua den han chot giai ngan");

        _releaseFundsToSeller(o, true);
    }

    /**
     * @notice Nguoi ban chu dong huy don va hoan tra 100% tien coc cho nguoi mua (mo khoa lai san pham)
     */
    function sellerCancelAndRefund(uint256 orderId, string calldata reason) external nonReentrant {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.Funded, "INVALID_STATUS: Don hang khong o trang thai dang ky quy");
        require(msg.sender == o.seller, "ONLY_SELLER: Chi nguoi ban moi duoc huy don va hoan coc");

        uint256 refundAmount = o.amount;
        o.status = OrderStatus.Refunded;
        o.buyerRefund = refundAmount;
        o.completedAt = block.timestamp;

        // Mo khoa san pham de co the ban lai tren Marketplace
        activeOrderByListing[o.listingKey] = 0;
        openEscrowsCount--;

        (bool ok, ) = o.buyer.call{value: refundAmount}("");
        require(ok, "TRANSFER_FAILED: Hoan tien cho nguoi mua that bai");

        emit OrderRefunded(orderId, o.listingKey, o.buyer, refundAmount, reason);
    }

    // ==========================================
    // 8. QUAN LY TRANH CHAP (DISPUTE & ARBITRATION)
    // ==========================================

    /**
     * @notice Nguoi mua hoac nguoi ban mo tranh chap khi co su co giao nhan
     */
    function openDispute(uint256 orderId, string calldata reason) external {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.Funded, "INVALID_STATUS: Chi co the mo tranh chap khi dang ky quy");
        require(
            msg.sender == o.buyer || msg.sender == o.seller,
            "UNAUTHORIZED_PARTY: Chi nguoi mua hoac nguoi ban trong don moi duoc mo tranh chap"
        );
        require(bytes(reason).length > 0, "EMPTY_REASON: Vui long nhap ly do tranh chap");

        o.status = OrderStatus.Disputed;
        o.disputedBy = msg.sender;
        o.disputeReason = reason;
        activeDisputesCount++;

        emit DisputeOpened(orderId, o.listingKey, msg.sender, reason);
    }

    /**
     * @notice Trong tai KTX phan xu tranh chap (ho tro hoan 100% cho nguoi mua, giai ngan cho nguoi ban hoac chia theo ty le)
     * @param orderId Ma don hang dang tranh chap
     * @param buyerShareBps Ty le hoan cho nguoi mua (0 -> 10000; VD: 10000 = hoan 100% cho Buyer, 0 = tra cho Seller)
     * @param markListingAsSold Danh dau san pham da ban hay mo khoa lai bai dang
     * @param resolutionNote Bien ban quyet dinh xu ly cua Trong tai KTX
     */
    function resolveDispute(
        uint256 orderId,
        uint16 buyerShareBps,
        bool markListingAsSold,
        string calldata resolutionNote
    ) external onlyArbiterOrOwner nonReentrant {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.Disputed, "NOT_DISPUTED: Don hang khong o trang thai tranh chap");
        require(buyerShareBps <= 10000, "INVALID_SHARE: Ty le phan chia phai tu 0 den 10000 bps");
        require(bytes(resolutionNote).length > 0, "EMPTY_NOTE: Phai nhap ket luan xu ly tranh chap");

        uint256 totalAmount = o.amount;
        uint256 buyerRefund = (totalAmount * buyerShareBps) / 10000;
        uint256 remainingForSeller = totalAmount - buyerRefund;

        uint256 fee = 0;
        uint256 sellerPayout = 0;

        if (remainingForSeller > 0) {
            (sellerPayout, fee) = calculatePayout(remainingForSeller);
        }

        // Cap nhat trang thai truoc khi chuyen tien (Checks-Effects-Interactions)
        o.status = OrderStatus.Resolved;
        o.buyerRefund = buyerRefund;
        o.sellerPayout = sellerPayout;
        o.platformFee = fee;
        o.resolutionNote = resolutionNote;
        o.completedAt = block.timestamp;

        activeOrderByListing[o.listingKey] = 0;
        if (markListingAsSold) {
            isListingSold[o.listingKey] = true;
        }

        openEscrowsCount--;
        activeDisputesCount--;
        completedOrdersCount++;

        // Thuc hien chuyen tien theo phan quyet
        if (buyerRefund > 0) {
            (bool okBuyer, ) = o.buyer.call{value: buyerRefund}("");
            require(okBuyer, "BUYER_REFUND_FAILED: Chuyen tien hoan cho nguoi mua that bai");
        }
        if (fee > 0) {
            (bool okFee, ) = feeRecipient.call{value: fee}("");
            require(okFee, "FEE_TRANSFER_FAILED: Chuyen phi nen tang that bai");
        }
        if (sellerPayout > 0) {
            (bool okSeller, ) = o.seller.call{value: sellerPayout}("");
            require(okSeller, "SELLER_PAYOUT_FAILED: Chuyen tien cho nguoi ban that bai");
        }

        emit DisputeResolved(orderId, msg.sender, buyerRefund, sellerPayout, fee, resolutionNote);
    }

    // ==========================================
    // 9. HAM NOI BO & TIEN ICH TRUY VAN (VIEW FUNCTIONS)
    // ==========================================

    function _releaseFundsToSeller(Order storage o, bool isDeadlineClaim) internal {
        (uint256 sellerPayout, uint256 fee) = calculatePayout(o.amount);

        o.status = OrderStatus.Completed;
        o.sellerPayout = sellerPayout;
        o.platformFee = fee;
        o.completedAt = block.timestamp;

        activeOrderByListing[o.listingKey] = 0;
        isListingSold[o.listingKey] = true;

        openEscrowsCount--;
        completedOrdersCount++;

        if (fee > 0) {
            (bool okFee, ) = feeRecipient.call{value: fee}("");
            require(okFee, "FEE_TRANSFER_FAILED: Chuyen phi nen tang that bai");
        }

        (bool okSeller, ) = o.seller.call{value: sellerPayout}("");
        require(okSeller, "SELLER_TRANSFER_FAILED: Giai ngan cho nguoi ban that bai");

        if (isDeadlineClaim) {
            emit ClaimedAfterDeadline(o.orderId, o.seller, sellerPayout, fee);
        } else {
            emit DeliveryConfirmed(o.orderId, o.listingKey, o.buyer, o.seller, sellerPayout, fee);
        }
    }

    /**
     * @notice Tinh toan chinh xac so ETH nguoi ban nhan va phi nen tang (Muc 22.2 & 22.4)
     */
    function calculatePayout(uint256 grossAmount) public view returns (uint256 sellerPayout, uint256 fee) {
        fee = (grossAmount * platformFeeBps) / 10000;
        sellerPayout = grossAmount - fee;
    }

    /**
     * @notice Kiem tra trang thai khoa cua mot bai dang truoc khi mua hoac truoc khi Admin xoa bai (Test 16 & Test 18)
     */
    function getListingLockStatus(string calldata listingCode)
        external
        view
        returns (
            bytes32 listingKey,
            bool isSold,
            bool hasOpenEscrow,
            uint256 activeOrderId
        )
    {
        listingKey = keccak256(abi.encodePacked(listingCode));
        isSold = isListingSold[listingKey];
        activeOrderId = activeOrderByListing[listingKey];
        hasOpenEscrow = (activeOrderId != 0);
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return _orders[orderId];
    }

    function getOrdersByBuyer(address buyer) external view returns (uint256[] memory) {
        return _buyerOrders[buyer];
    }

    function getOrdersBySeller(address seller) external view returns (uint256[] memory) {
        return _sellerOrders[seller];
    }

    /**
     * @notice Tra ve toan bo chi so on-chain thuc te cho Admin Dashboard (Muc 19.2)
     */
    function getContractStats()
        external
        view
        returns (
            uint256 _totalOrders,
            uint256 _openEscrows,
            uint256 _completedOrders,
            uint256 _activeDisputes,
            uint256 _totalVolumeWei,
            uint16 _platformFeeBps
        )
    {
        return (
            totalOrdersCount,
            openEscrowsCount,
            completedOrdersCount,
            activeDisputesCount,
            totalVolumeWei,
            platformFeeBps
        );
    }
}
