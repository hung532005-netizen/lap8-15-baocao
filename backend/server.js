/**
 * KTX TRUONG BIA - BACKEND API SERVER (MUC 18-26)
 * Bao mat: Web3 Signature Verification (SIWE Nonce) + JWT + On-chain Escrow Check
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "ktx_truong_bia_dev_secret_2026";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS || "").trim();
const MAX_IMAGE_SIZE_KB = Number(process.env.MAX_IMAGE_SIZE_KB || 2048);

// Danh sach vi quan tri cau hinh o phia Server (khong the bi sua tu trinh duyet)
const CONFIGURED_ADMINS = (process.env.ADMIN_WALLETS || "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

app.use(cors());
app.use(express.json({ limit: "6mb" }));

// ============================================================================
// 1. LOP LUU TRU DUNG CHUNG (ATOMIC JSON DATABASE)
// ============================================================================
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const INITIAL_DB = {
  nonces: {},       // wallet -> { nonce, expiresAt }
  admins: {},       // wallet -> { wallet, role: 'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT' | 'ARBITER', addedAt }
  students: {},     // wallet -> Ho so sinh vien & trang thai xac minh
  listings: [],     // Danh sach bai dang do cu
  orders: [],       // Lien ket don hang off-chain voi orderId & txHash on-chain
  reports: [],      // Bao cao vi pham
  notifications: [],// Thong bao trong ung dung (Muc 24)
  auditLogs: []     // Nhat ky hoat dong quan tri (Muc 19.1, 19.4)
};

async function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    await fsp.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    // Khoi tao quyen Super Admin cho cac vi trong .env
    const seedDb = structuredClone(INITIAL_DB);
    for (const wallet of CONFIGURED_ADMINS) {
      seedDb.admins[wallet] = {
        wallet,
        role: "SUPER_ADMIN",
        addedAt: new Date().toISOString()
      };
    }
    await fsp.writeFile(DB_FILE, JSON.stringify(seedDb, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fsp.readFile(DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeDb(data) {
  await ensureDb();
  const tempFile = `${DB_FILE}.tmp`;
  await fsp.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await fsp.rename(tempFile, DB_FILE);
}

// ============================================================================
// 2. KET NOI SMART CONTRACT ON-CHAIN (PROJECTCORE.SOL TREN SEPOLIA)
// ============================================================================
const PROJECT_CORE_ABI = [
  "function owner() view returns (address)",
  "function arbiter() view returns (address)",
  "function isAdminOrArbiter(address account) view returns (bool isOwnerRole, bool isArbiterRole)",
  "function getListingLockStatus(string listingCode) view returns (bytes32 listingKey, bool isSold, bool hasOpenEscrow, uint256 activeOrderId)",
  "function getOrder(uint256 orderId) view returns (tuple(uint256 orderId, bytes32 listingKey, string listingCode, address buyer, address seller, uint256 amount, uint256 platformFee, uint256 sellerPayout, uint256 buyerRefund, uint256 createdAt, uint256 deadline, uint256 completedAt, uint8 status, address disputedBy, string disputeReason, string resolutionNote))",
  "function getContractStats() view returns (uint256 totalOrders, uint256 openEscrows, uint256 completedOrders, uint256 activeDisputes, uint256 totalVolumeWei, uint16 feeBps)"
];

function getContractInstance() {
  if (!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) return null;
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, PROJECT_CORE_ABI, provider);
}

async function checkOnChainAdminRole(walletLower) {
  try {
    const contract = getContractInstance();
    if (!contract) return { isOnChainOwner: false, isOnChainArbiter: false };
    const [isOwnerRole, isArbiterRole] = await contract.isAdminOrArbiter(walletLower);
    return { isOnChainOwner: Boolean(isOwnerRole), isOnChainArbiter: Boolean(isArbiterRole) };
  } catch (err) {
    console.warn("[OnChainRoleCheck] Khong the doc contract:", err.message);
    return { isOnChainOwner: false, isOnChainArbiter: false };
  }
}

async function checkOnChainListingLock(listingCode) {
  try {
    const contract = getContractInstance();
    if (!contract) return { isSold: false, hasOpenEscrow: false, activeOrderId: 0 };
    const status = await contract.getListingLockStatus(listingCode);
    return {
      isSold: Boolean(status.isSold),
      hasOpenEscrow: Boolean(status.hasOpenEscrow),
      activeOrderId: Number(status.activeOrderId)
    };
  } catch (err) {
    console.warn("[OnChainLockCheck] Loi doc trang thai khoa:", err.message);
    return { isSold: false, hasOpenEscrow: false, activeOrderId: 0 };
  }
}

// ============================================================================
// 3. TIEN ICH THONG BAO & NHAT KY HOAT DONG (MUC 19.1 & 24)
// ============================================================================
function pushNotification(db, { recipientWallet, type, title, message, linkTab = "overview", metadata = {} }) {
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    recipientWallet: recipientWallet.toLowerCase(),
    type,
    title,
    message,
    linkTab,
    metadata,
    isRead: false,
    createdAt: new Date().toISOString()
  });
}

function pushAuditLog(db, { actorWallet, actorRole, action, targetType, targetId, reason = "", details = {} }) {
  db.auditLogs.unshift({
    id: `LOG-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    actorWallet: actorWallet.toLowerCase(),
    actorRole,
    action,
    targetType,
    targetId,
    reason,
    details,
    createdAt: new Date().toISOString()
  });
}

// ============================================================================
// 4. MIDDLEWARE XAC THUC JWT & PHAN QUYEN RBAC (MUC 18.2, 19.5, TEST 13)
// ============================================================================
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Vui long dang nhap va ky xac thuc vi MetaMask." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { wallet, portal, adminRole, isOnChainOwner, isOnChainArbiter }
    next();
  } catch (err) {
    return res.status(401).json({ error: "INVALID_TOKEN", message: "Phien dang nhap da het han hoac khong hop le." });
  }
}

function requireAdminRole(allowedRoles = ["SUPER_ADMIN", "MODERATOR", "SUPPORT", "ARBITER"]) {
  return async (req, res, next) => {
    const db = await readDb();
    const wallet = req.user.wallet.toLowerCase();
    const offChainAdmin = db.admins[wallet];
    const isConfiguredAdmin = CONFIGURED_ADMINS.includes(wallet);
    const currentRole = offChainAdmin?.role || (isConfiguredAdmin ? "SUPER_ADMIN" : req.user.adminRole);

    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        error: "FORBIDDEN_ADMIN",
        message: "Tai khoan vi cua ban khong co quyen thuc hien thao tac quan tri nay (Test 13)."
      });
    }
    req.adminRole = currentRole;
    next();
  };
}

// ============================================================================
// 5. API XAC THUC RIENG CHO ADMIN VA SINH VIEN (MUC 18.1, 18.2, 18.3)
// ============================================================================

// B1: Lay ma Nonce ngau nhien de ky tren MetaMask
app.post("/api/auth/nonce", async (req, res) => {
  const { wallet, portal } = req.body;
  if (!wallet || !ethers.isAddress(wallet)) {
    return res.status(400).json({ error: "INVALID_WALLET", message: "Dia chi vi MetaMask khong hop le." });
  }
  const walletLower = wallet.toLowerCase();
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // Hieu luc 5 phut

  const db = await readDb();
  db.nonces[walletLower] = { nonce, portal: portal || "STUDENT", expiresAt };
  await writeDb(db);

  const messageToSign = [
    "KTX Truong Bia - Nen tang mua ban do cu an toan",
    `Cong dang nhap: ${portal === "ADMIN" ? "Admin Portal" : "Student Portal"}`,
    `Dia chi vi: ${walletLower}`,
    `Ma xac thuc (Nonce): ${nonce}`,
    "Mang yeu cau: Sepolia (Chain ID: 11155111)"
  ].join("\n");

  res.json({ wallet: walletLower, nonce, messageToSign });
});

// B2: Xac minh chu ky MetaMask va cap JWT theo dung vai tro thuc te
app.post("/api/auth/verify", async (req, res) => {
  const { wallet, signature, portal } = req.body;
  if (!wallet || !signature) {
    return res.status(400).json({ error: "MISSING_PARAMS", message: "Thieu dia chi vi hoac chu ky xac thuc." });
  }

  const walletLower = wallet.toLowerCase();
  const db = await readDb();
  const nonceRecord = db.nonces[walletLower];

  if (!nonceRecord || Date.now() > nonceRecord.expiresAt) {
    return res.status(400).json({ error: "NONCE_EXPIRED", message: "Ma xac thuc da het han. Vui long ky lai." });
  }

  const expectedMessage = [
    "KTX Truong Bia - Nen tang mua ban do cu an toan",
    `Cong dang nhap: ${portal === "ADMIN" ? "Admin Portal" : "Student Portal"}`,
    `Dia chi vi: ${walletLower}`,
    `Ma xac thuc (Nonce): ${nonceRecord.nonce}`,
    "Mang yeu cau: Sepolia (Chain ID: 11155111)"
  ].join("\n");

  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(expectedMessage, signature).toLowerCase();
  } catch (err) {
    return res.status(401).json({ error: "BAD_SIGNATURE", message: "Chu ky vi khong hop le." });
  }

  if (recoveredAddress !== walletLower) {
    return res.status(401).json({ error: "SIGNER_MISMATCH", message: "Chu ky khong khop voi dia chi vi." });
  }

  // Xoa nonce sau khi dung 1 lan (chong Replay Attack)
  delete db.nonces[walletLower];

  // Kiem tra quyen Admin (ket hop cau hinh off-chain va chu so huu/trong tai on-chain)
  const onChainRoles = await checkOnChainAdminRole(walletLower);
  const offChainAdmin = db.admins[walletLower];
  const isConfiguredAdmin = CONFIGURED_ADMINS.includes(walletLower);

  let adminRole = offChainAdmin?.role || (isConfiguredAdmin ? "SUPER_ADMIN" : null);
  if (!adminRole && onChainRoles.isOnChainOwner) adminRole = "SUPER_ADMIN";
  if (!adminRole && onChainRoles.isOnChainArbiter) adminRole = "ARBITER";

  if (portal === "ADMIN") {
    if (!adminRole) {
      await writeDb(db);
      return res.status(403).json({
        error: "NOT_ADMIN",
        message: "Vi nay khong co quyen truy cap Admin Portal (Test 13)."
      });
    }
    pushAuditLog(db, {
      actorWallet: walletLower,
      actorRole: adminRole,
      action: "ADMIN_LOGIN",
      targetType: "AUTH",
      targetId: walletLower
    });
  }

  await writeDb(db);

  const studentProfile = db.students[walletLower] || null;
  const token = jwt.sign(
    {
      wallet: walletLower,
      portal: portal === "ADMIN" ? "ADMIN" : "STUDENT",
      adminRole,
      isOnChainOwner: onChainRoles.isOnChainOwner,
      isOnChainArbiter: onChainRoles.isOnChainArbiter
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: {
      wallet: walletLower,
      portal: portal === "ADMIN" ? "ADMIN" : "STUDENT",
      adminRole,
      isOnChainOwner: onChainRoles.isOnChainOwner,
      isOnChainArbiter: onChainRoles.isOnChainArbiter,
      studentProfile
    }
  });
});

// ============================================================================
// 6. API HO SO SINH VIEN & QUAN LY SINH VIEN (MUC 18.3 & 19.3)
// ============================================================================

// Sinh vien xem ho so va trang thai hien tai cua minh
app.get("/api/students/me", authenticateJWT, async (req, res) => {
  const db = await readDb();
  const profile = db.students[req.user.wallet] || null;
  res.json({
    wallet: req.user.wallet,
    profileStatus: profile ? profile.verificationStatus : "UNDECLARED",
    profile
  });
});

// Sinh vien dang ky hoac cap nhat ho so ca nhan
app.post("/api/students/profile", authenticateJWT, async (req, res) => {
  const { fullName, studentId, className, dormRoom, contactInfo } = req.body;
  if (!fullName || !studentId || !className || !dormRoom) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Vui long nhap day du Ho ten, Ma sinh vien, Lop va So phong KTX."
    });
  }

  const db = await readDb();
  const wallet = req.user.wallet;
  const existing = db.students[wallet];

  if (existing && existing.accountStatus === "LOCKED") {
    return res.status(403).json({
      error: "ACCOUNT_LOCKED",
      message: "Tai khoan cua ban da bi khoa theo chinh sach KTX."
    });
  }

  // Kiem tra trung Ma sinh vien voi vi khac
  const duplicateStudentId = Object.values(db.students).find(
    (s) => s.studentId.toLowerCase() === String(studentId).trim().toLowerCase() && s.wallet !== wallet
  );
  if (duplicateStudentId) {
    return res.status(409).json({
      error: "DUPLICATE_STUDENT_ID",
      message: "Ma sinh vien nay da duoc lien ket voi mot dia chi vi khac."
    });
  }

  const now = new Date().toISOString();
  db.students[wallet] = {
    wallet,
    fullName: String(fullName).trim(),
    studentId: String(studentId).trim().toUpperCase(),
    className: String(className).trim(),
    dormRoom: String(dormRoom).trim(),
    contactInfo: String(contactInfo || "").trim(),
    registeredAt: existing ? existing.registeredAt : now,
    updatedAt: now,
    verificationStatus:
      existing && existing.verificationStatus === "VERIFIED"
        ? "VERIFIED"
        : "PENDING_VERIFICATION",
    canPost: existing ? Boolean(existing.canPost) : false,
    accountStatus: existing ? existing.accountStatus : "ACTIVE",
    moderationNote: existing ? existing.moderationNote : "",
    violations: existing ? existing.violations : []
  };

  await writeDb(db);
  res.json({
    message: "Da luu ho so sinh vien thanh cong.",
    profile: db.students[wallet]
  });
});

// Admin lay danh sach toan bo sinh vien (Muc 19.3)
app.get("/api/admin/students", authenticateJWT, requireAdminRole(), async (req, res) => {
  const db = await readDb();
  const students = Object.values(db.students).sort((a, b) =>
    b.registeredAt.localeCompare(a.registeredAt)
  );
  res.json({ students });
});

// Admin duyet / tu choi ho so / khoa quyen dang bai / khoa tai khoan (Muc 19.3)
app.patch(
  "/api/admin/students/:wallet/moderate",
  authenticateJWT,
  requireAdminRole(["SUPER_ADMIN", "MODERATOR", "SUPPORT"]),
  async (req, res) => {
    const targetWallet = req.params.wallet.toLowerCase();
    const { action, reason = "" } = req.body;

    const db = await readDb();
    const student = db.students[targetWallet];
    if (!student) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Khong tim thay ho so sinh vien." });
    }

    if (["REJECT_PROFILE", "DISABLE_POSTING", "LOCK_ACCOUNT"].includes(action) && !String(reason).trim()) {
      return res.status(400).json({
        error: "REASON_REQUIRED",
        message: "Bat buoc phai nhap ly do khi tu choi ho so hoac khoa quyen cua sinh vien."
      });
    }

    switch (action) {
      case "VERIFY":
        student.verificationStatus = "VERIFIED";
        student.canPost = true;
        student.moderationNote = "Ho so da duoc Admin xac minh.";
        break;
      case "REJECT_PROFILE":
        student.verificationStatus = "REJECTED";
        student.canPost = false;
        student.moderationNote = reason.trim();
        break;
      case "REQUEST_INFO":
        student.verificationStatus = "NEEDS_INFO";
        student.moderationNote = reason.trim() || "Vui long bo sung thong tin phong KTX va the sinh vien.";
        break;
      case "ENABLE_POSTING":
        student.canPost = true;
        student.moderationNote = reason.trim();
        break;
      case "DISABLE_POSTING":
        student.canPost = false;
        student.moderationNote = reason.trim();
        student.violations.push({
          type: "POSTING_LOCKED",
          reason: reason.trim(),
          by: req.user.wallet,
          at: new Date().toISOString()
        });
        break;
      case "LOCK_ACCOUNT":
        student.accountStatus = "LOCKED";
        student.canPost = false;
        student.moderationNote = reason.trim();
        break;
      case "UNLOCK_ACCOUNT":
        student.accountStatus = "ACTIVE";
        student.moderationNote = reason.trim();
        break;
      default:
        return res.status(400).json({ error: "INVALID_ACTION", message: "Thao tac quan tri khong hop le." });
    }

    student.updatedAt = new Date().toISOString();

    pushNotification(db, {
      recipientWallet: targetWallet,
      type: `STUDENT_${action}`,
      title: "Cap nhat trang thai ho so sinh vien",
      message: `Ho so cua ban vua duoc cap nhat (${action}). Ghi chu: ${student.moderationNote || "Khong co"}`,
      linkTab: "profile"
    });

    pushAuditLog(db, {
      actorWallet: req.user.wallet,
      actorRole: req.adminRole,
      action: `STUDENT_${action}`,
      targetType: "STUDENT",
      targetId: targetWallet,
      reason: reason.trim()
    });

    await writeDb(db);
    res.json({ message: "Da cap nhat trang thai sinh vien.", student });
  }
);

// ============================================================================
// 7. API QUAN LY BAI DANG & DUYET BAI (MUC 19.4, 20.1, 21, TEST 11, 12, 14, 17, 18)
// ============================================================================

const VALID_CATEGORIES = [
  "Sách và giáo trình",
  "Đồ điện tử",
  "Quạt và thiết bị gia dụng",
  "Đồ dùng học tập",
  "Đồ dùng phòng KTX",
  "Quần áo và phụ kiện",
  "Khác"
];

// 7.1. API Marketplace cong khai: CHI tra ve bai DA DUYET va chua bi an/xoa (Muc 20.1, Test 11)
app.get("/api/listings/public", async (req, res) => {
  const { search = "", category = "", minPrice, maxPrice, sort = "newest", saleStatus = "" } = req.query;
  const db = await readDb();

  let items = db.listings.filter(
    (item) => item.approvalStatus === "APPROVED" && !item.isHidden && !item.isDeleted
  );

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }
  if (category && category !== "ALL") {
    items = items.filter((i) => i.category === category);
  }
  if (saleStatus && saleStatus !== "ALL") {
    items = items.filter((i) => i.saleStatus === saleStatus);
  }
  if (minPrice !== undefined && minPrice !== "") {
    items = items.filter((i) => Number(i.priceEth) >= Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== "") {
    items = items.filter((i) => Number(i.priceEth) <= Number(maxPrice));
  }

  if (sort === "price_asc") items.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
  else if (sort === "price_desc") items.sort((a, b) => Number(b.priceEth) - Number(a.priceEth));
  else items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({ listings: items });
});

// 7.2. Sinh vien lay danh sach bai dang cua chinh minh
app.get("/api/listings/mine", authenticateJWT, async (req, res) => {
  const db = await readDb();
  const items = db.listings.filter(
    (item) => item.sellerWallet === req.user.wallet && !item.isDeleted
  );
  res.json({ listings: items });
});

// 7.3. Sinh vien tao bai dang moi (Luu nhap hoac Gui duyet - Muc 21, Test 11, Test 17)
app.post("/api/listings", authenticateJWT, async (req, res) => {
  const {
    title,
    category,
    priceEth,
    description,
    condition,
    images = [],
    deliveryMethod,
    publicContact,
    confirmOwnership,
    acceptTerms,
    submitForReview = true
  } = req.body;

  const db = await readDb();
  const student = db.students[req.user.wallet];

  // Neu gui duyet, bat buoc kiem tra trang thai xac minh va quyen dang bai tu Server (Test 17)
  if (submitForReview) {
    if (!student || student.verificationStatus !== "VERIFIED") {
      return res.status(403).json({
        error: "STUDENT_NOT_VERIFIED",
        message: "Ho so sinh vien cua ban chua duoc xac minh nen chua the gui bai duyet (Test 17)."
      });
    }
    if (!student.canPost || student.accountStatus !== "ACTIVE") {
      return res.status(403).json({
        error: "POSTING_PERMISSION_LOCKED",
        message: `Quyen dang bai cua ban dang bi khoa. Ly do: ${student.moderationNote || "Vi pham quy dinh san"}`
      });
    }
  }

  // Kiem tra du lieu dau vao (Validation Muc 21)
  const fieldErrors = {};
  if (!title || String(title).trim().length < 5) fieldErrors.title = "Ten san pham phai tu 5 ky tu tro len.";
  if (!VALID_CATEGORIES.includes(category)) fieldErrors.category = "Danh muc khong hop le.";
  if (!priceEth || isNaN(Number(priceEth)) || Number(priceEth) <= 0) {
    fieldErrors.priceEth = "Gia ban ETH phai lon hon 0.";
  }
  if (!description || String(description).trim().length < 15) {
    fieldErrors.description = "Mo ta chi tiet phai tu 15 ky tu tro len.";
  }
  if (!condition) fieldErrors.condition = "Vui long chon tinh trang san pham.";
  if (!Array.isArray(images) || images.length === 0) {
    fieldErrors.images = "Phai dinh kem it nhat 1 hinh anh san pham.";
  } else {
    for (const img of images) {
      const sizeKb = Math.round((String(img).length * 3) / 4 / 1024);
      if (sizeKb > MAX_IMAGE_SIZE_KB) {
        fieldErrors.images = `Dung luong anh vuot qua gioi han ${MAX_IMAGE_SIZE_KB} KB.`;
      }
    }
  }
  if (!deliveryMethod) fieldErrors.deliveryMethod = "Vui long chon phuong thuc giao nhan.";
  if (submitForReview && (!confirmOwnership || !acceptTerms)) {
    fieldErrors.terms = "Ban phai xac nhan quyen so huu mon do va dong y quy dinh san.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return res.status(400).json({
      error: "FIELD_VALIDATION_FAILED",
      message: "Du lieu bai dang chua hop le, vui long kiem tra lai cac truong bao do.",
      fieldErrors
    });
  }

  const now = new Date().toISOString();
  const listingCode = `KTX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  const newListing = {
    id: listingCode,
    listingCode,
    title: String(title).trim(),
    category,
    priceEth: String(priceEth).trim(),
    description: String(description).trim(),
    condition,
    images,
    deliveryMethod,
    publicContact: String(publicContact || student?.contactInfo || "").trim(),
    sellerWallet: req.user.wallet,
    sellerName: student?.fullName || "Sinh vien KTX",
    studentId: student?.studentId || "Chua khai bao",
    dormRoom: student?.dormRoom || "",
    approvalStatus: submitForReview ? "PENDING" : "DRAFT",
    saleStatus: "AVAILABLE",
    isHidden: false,
    isDeleted: false,
    rejectionReason: "",
    reportCount: 0,
    createdAt: now,
    updatedAt: now,
    moderationHistory: [
      {
        action: submitForReview ? "SUBMITTED_FOR_REVIEW" : "SAVED_DRAFT",
        by: req.user.wallet,
        at: now,
        note: submitForReview ? "Sinh vien gui duyet bai dang" : "Luu ban nhap"
      }
    ]
  };

  db.listings.unshift(newListing);
  await writeDb(db);

  res.status(201).json({
    message: submitForReview
      ? "Bai dang da duoc gui den Admin cho duyet (Test 11)."
      : "Da luu ban nhap thanh cong.",
    listing: newListing
  });
});

// 7.4. Sinh vien chinh sua bai nhap / bai bi tu choi va gui duyet lai (Muc 21)
app.put("/api/listings/:id", authenticateJWT, async (req, res) => {
  const db = await readDb();
  const listing = db.listings.find((l) => l.id === req.params.id && !l.isDeleted);

  if (!listing) return res.status(404).json({ error: "NOT_FOUND", message: "Khong tim thay bai dang." });
  if (listing.sellerWallet !== req.user.wallet) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Ban chi duoc chinh sua bai dang cua chinh minh." });
  }
  if (listing.saleStatus === "IN_ESCROW" || listing.saleStatus === "SOLD") {
    return res.status(409).json({
      error: "LOCKED_BY_TRANSACTION",
      message: "Khong the sua bai dang dang trong giao dich ky quy hoac da ban."
    });
  }

  const { title, category, priceEth, description, condition, images, deliveryMethod, publicContact, resubmit } = req.body;
  if (title) listing.title = String(title).trim();
  if (category && VALID_CATEGORIES.includes(category)) listing.category = category;
  if (priceEth && Number(priceEth) > 0) listing.priceEth = String(priceEth).trim();
  if (description) listing.description = String(description).trim();
  if (condition) listing.condition = condition;
  if (Array.isArray(images) && images.length > 0) listing.images = images;
  if (deliveryMethod) listing.deliveryMethod = deliveryMethod;
  if (publicContact !== undefined) listing.publicContact = String(publicContact).trim();

  if (resubmit) {
    listing.approvalStatus = "PENDING";
    listing.rejectionReason = "";
    listing.moderationHistory.push({
      action: "RESUBMITTED_FOR_REVIEW",
      by: req.user.wallet,
      at: new Date().toISOString(),
      note: "Sinh vien da chinh sua va gui duyet lai"
    });
  }

  listing.updatedAt = new Date().toISOString();
  await writeDb(db);
  res.json({ message: "Da cap nhat bai dang thanh cong.", listing });
});

// 7.5. Admin lay toan bo bai dang theo cac Tab loc (Muc 19.4)
app.get("/api/admin/listings", authenticateJWT, requireAdminRole(), async (req, res) => {
  const { tab = "ALL" } = req.query;
  const db = await readDb();
  let items = db.listings.filter((l) => !l.isDeleted);

  switch (tab) {
    case "PENDING":
      items = items.filter((l) => l.approvalStatus === "PENDING");
      break;
    case "APPROVED":
      items = items.filter((l) => l.approvalStatus === "APPROVED" && !l.isHidden);
      break;
    case "REJECTED":
      items = items.filter((l) => l.approvalStatus === "REJECTED");
      break;
    case "AVAILABLE":
      items = items.filter((l) => l.approvalStatus === "APPROVED" && l.saleStatus === "AVAILABLE" && !l.isHidden);
      break;
    case "SOLD":
      items = items.filter((l) => l.saleStatus === "SOLD");
      break;
    case "HIDDEN":
      items = items.filter((l) => l.isHidden);
      break;
    case "REPORTED":
      items = items.filter((l) => l.reportCount > 0);
      break;
  }

  res.json({ listings: items });
});

// 7.6. Admin Duyet / Tu choi / Yeu cau sua / An / Khoi phuc bai dang (Muc 19.4, Test 12, Test 14, Test 18)
app.post(
  "/api/admin/listings/:id/moderate",
  authenticateJWT,
  requireAdminRole(["SUPER_ADMIN", "MODERATOR"]),
  async (req, res) => {
    const { action, reason = "" } = req.body;

    const db = await readDb();
    const listing = db.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Khong tim thay bai dang." });
    }

    // Kiem tra bat buoc ly do khi tu choi hoac yeu cau sua (Test 14)
    if (["REJECT", "REQUEST_REVISION", "HIDE", "SOFT_DELETE"].includes(action) && !String(reason).trim()) {
      return res.status(400).json({
        error: "REASON_REQUIRED",
        message: "Bat buoc nhap ly do khi tu choi, an hoac xoa bai dang (Test 14)."
      });
    }

    // Truoc khi an hoac xoa bai, kiem tra giao dich ky quy dang mo (On-chain + Off-chain - Test 18)
    if (["HIDE", "SOFT_DELETE"].includes(action)) {
      const onChainLock = await checkOnChainListingLock(listing.listingCode);
      if (listing.saleStatus === "IN_ESCROW" || onChainLock.hasOpenEscrow) {
        return res.status(409).json({
          error: "ACTIVE_ESCROW_LOCK",
          message: `Canh bao: Khong the an/xoa bai dang dang co giao dich ky quy mo (Order #${onChainLock.activeOrderId || "Active"}) de bao ve quyen loi nguoi dung (Test 18).`
        });
      }
    }

    const now = new Date().toISOString();
    let notifTitle = "";
    let notifMsg = "";

    switch (action) {
      case "APPROVE":
        if (!listing.title || Number(listing.priceEth) <= 0 || !listing.images?.length) {
          return res.status(400).json({
            error: "INCOMPLETE_LISTING",
            message: "Bai dang thieu thong tin bat buoc (gia, anh hoac tieu de), khong the duyet."
          });
        }
        listing.approvalStatus = "APPROVED";
        listing.isHidden = false;
        listing.rejectionReason = "";
        notifTitle = "Bai dang da duoc duyet";
        notifMsg = `San pham "${listing.title}" da duoc duyet va hien thi tren Marketplace.`;
        break;

      case "REJECT":
        listing.approvalStatus = "REJECTED";
        listing.rejectionReason = reason.trim();
        notifTitle = "Bai dang bi tu choi";
        notifMsg = `San pham "${listing.title}" bi tu choi. Ly do: ${reason.trim()}. Ban co the chinh sua va gui duyet lai.`;
        break;

      case "REQUEST_REVISION":
        listing.approvalStatus = "NEEDS_REVISION";
        listing.rejectionReason = reason.trim();
        notifTitle = "Bai dang can chinh sua";
        notifMsg = `Admin yeu cau chinh sua bai "${listing.title}": ${reason.trim()}`;
        break;

      case "HIDE":
        listing.isHidden = true;
        notifTitle = "Bai dang da bi tam an";
        notifMsg = `Bai dang "${listing.title}" da bi an. Ly do: ${reason.trim()}`;
        break;

      case "RESTORE":
        listing.isHidden = false;
        listing.isDeleted = false;
        notifTitle = "Bai dang da duoc khoi phuc";
        notifMsg = `Bai dang "${listing.title}" da duoc khoi phuc hien thi.`;
        break;

      case "SOFT_DELETE":
        listing.isDeleted = true;
        listing.isHidden = true;
        notifTitle = "Bai dang da bi xoa theo chinh sach";
        notifMsg = `Bai dang "${listing.title}" da bi xoa. Ly do: ${reason.trim()}`;
        break;

      default:
        return res.status(400).json({ error: "INVALID_ACTION", message: "Hanh dong kiem duyet khong hop le." });
    }

    listing.updatedAt = now;
    listing.moderationHistory.push({
      action,
      by: req.user.wallet,
      role: req.adminRole,
      at: now,
      note: reason.trim()
    });

    pushNotification(db, {
      recipientWallet: listing.sellerWallet,
      type: `LISTING_${action}`,
      title: notifTitle,
      message: notifMsg,
      linkTab: "my-listings",
      metadata: { listingId: listing.id, reason: reason.trim() }
    });

    pushAuditLog(db, {
      actorWallet: req.user.wallet,
      actorRole: req.adminRole,
      action: `LISTING_${action}`,
      targetType: "LISTING",
      targetId: listing.id,
      reason: reason.trim()
    });

    await writeDb(db);
    res.json({ message: `Da thuc hien ${action} cho bai dang.`, listing });
  }
);

// ============================================================================
// 8. API DONG BO DON HANG ON-CHAIN, BAO CAO & THONG KE (MUC 19.2, 22, 23, 24)
// ============================================================================

// Dong bo trang thai bai dang sau khi giao dich MetaMask co receipt tren Sepolia
app.post("/api/orders/sync", authenticateJWT, async (req, res) => {
  const { listingCode, onChainOrderId, txHash, eventType } = req.body;

  if (!listingCode || !txHash) {
    return res.status(400).json({ error: "MISSING_DATA", message: "Thieu ma san pham hoac Transaction Hash." });
  }

  const db = await readDb();
  const listing = db.listings.find((l) => l.listingCode === listingCode);
  if (!listing) {
    return res.status(404).json({ error: "LISTING_NOT_FOUND", message: "Khong tim thay san pham tuong ung." });
  }

  // Xac minh trang thai thuc te tu Smart Contract neu da cau hinh RPC
  const onChainLock = await checkOnChainListingLock(listingCode);

  if (eventType === "ESCROW_FUNDED") {
    listing.saleStatus = "IN_ESCROW";
    listing.activeOrderId = onChainLock.activeOrderId || Number(onChainOrderId);
    db.orders.unshift({
      orderId: listing.activeOrderId,
      listingCode,
      listingTitle: listing.title,
      buyerWallet: req.user.wallet,
      sellerWallet: listing.sellerWallet,
      priceEth: listing.priceEth,
      txHash,
      status: "FUNDED",
      updatedAt: new Date().toISOString()
    });

    pushNotification(db, {
      recipientWallet: listing.sellerWallet,
      type: "ESCROW_FUNDED",
      title: "Da co nguoi mua nap coc ky quy!",
      message: `San pham "${listing.title}" da duoc nap coc (${listing.priceEth} ETH). Tx: ${txHash.slice(0, 10)}...`,
      linkTab: "my-sales",
      metadata: { listingCode, txHash }
    });
  } else if (eventType === "DELIVERY_CONFIRMED") {
    listing.saleStatus = "SOLD";
    pushNotification(db, {
      recipientWallet: listing.sellerWallet,
      type: "ORDER_COMPLETED",
      title: "Giao dich hoan tat & Da giai ngan ETH",
      message: `Nguoi mua da xac nhan nhan hang cho "${listing.title}". Tien da duoc giai ngan ve vi cua ban.`,
      linkTab: "my-sales"
    });
  } else if (eventType === "REFUNDED") {
    listing.saleStatus = "AVAILABLE";
  }

  await writeDb(db);
  res.json({ message: "Da dong bo trang thai don hang voi du lieu On-chain.", listing });
});

// Sinh vien gui bao cao vi pham bai dang (Muc 24)
app.post("/api/reports", authenticateJWT, async (req, res) => {
  const { listingId, reasonCategory, details = "" } = req.body;
  const db = await readDb();
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND", message: "Bai dang khong ton tai." });

  const report = {
    id: `REP-${Date.now()}`,
    listingId,
    listingTitle: listing.title,
    reporterWallet: req.user.wallet,
    reasonCategory,
    details: String(details).trim(),
    status: "OPEN",
    resolutionNote: "",
    createdAt: new Date().toISOString()
  };

  listing.reportCount = (listing.reportCount || 0) + 1;
  db.reports.unshift(report);
  await writeDb(db);

  res.status(201).json({ message: "Da gui bao cao vi pham de Admin kiem tra.", report });
});

// Lay thong bao cua nguoi dung hien tai
app.get("/api/notifications", authenticateJWT, async (req, res) => {
  const db = await readDb();
  const list = db.notifications.filter((n) => n.recipientWallet === req.user.wallet);
  res.json({ notifications: list });
});

// Thong ke tong hop cho Admin Dashboard (Muc 19.2)
app.get("/api/admin/stats", authenticateJWT, requireAdminRole(), async (req, res) => {
  const db = await readDb();
  const students = Object.values(db.students);
  const activeListings = db.listings.filter((l) => !l.isDeleted);

  res.json({
    offChainStats: {
      totalStudents: students.length,
      pendingStudents: students.filter((s) => s.verificationStatus === "PENDING_VERIFICATION").length,
      totalListings: activeListings.length,
      pendingListings: activeListings.filter((l) => l.approvalStatus === "PENDING").length,
      approvedListings: activeListings.filter((l) => l.approvalStatus === "APPROVED").length,
      rejectedListings: activeListings.filter((l) => l.approvalStatus === "REJECTED").length,
      availableListings: activeListings.filter(
        (l) => l.approvalStatus === "APPROVED" && l.saleStatus === "AVAILABLE" && !l.isHidden
      ).length,
      openReports: db.reports.filter((r) => r.status === "OPEN").length
    },
    auditLogs: db.auditLogs.slice(0, 50),
    reports: db.reports
  });
});

app.listen(PORT, async () => {
  await ensureDb();
  console.log(`[KTX Truong Bia Backend] Dang chay tai http://localhost:${PORT}`);
});
