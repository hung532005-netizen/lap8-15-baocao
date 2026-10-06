// SPDX-License-Identifier: MIT
// KTXEscrow Test Suite v0.2 (Lab 11: Cai quy tac kinh te va test)

const { expect } = require("chai");

describe("ProjectCore - KTX Escrow Economic Rules (Lab 11)", function () {
  let Escrow, escrow;
  let seller, buyer, arbiter, feeRecipient, attacker;
  const price = ethers.parseEther("0.1"); // 0.1 ETH (hop le: 10000 wei <= price <= 1 ether)
  const inspectionDays = 3; // 3 ngay (hop le: >= 1 ngay)

  beforeEach(async function () {
    [seller, buyer, arbiter, feeRecipient, attacker] = await ethers.getSigners();
    Escrow = await ethers.getContractFactory("ProjectCore");
    escrow = await Escrow.deploy(
      seller.address,
      arbiter.address,
      feeRecipient.address,
      price,
      inspectionDays
    );
  });

  // ==========================================
  // CA KIEM THU 1: CA HOP LE (SUCCESSFUL FLOW)
  // ==========================================
  it("Ca 1 (Hop le): Nap coc thanh cong va giai ngan trich dung phi nen tang 1% (100 bps)", async function () {
    // 1. Nguoi mua nap coc dung gia niem yet
    await expect(escrow.connect(buyer).fund({ value: price }))
      .to.emit(escrow, "Funded");
    expect(await escrow.state()).to.equal(1); // State.Funded

    // 2. Tinh toan dong tien theo ty le 100 basis points
    const feeBps = await escrow.PLATFORM_FEE_BPS();
    const denominator = await escrow.BPS_DENOMINATOR();
    const expectedFee = (price * feeBps) / denominator; // 1% = 0.001 ETH
    const expectedPayout = price - expectedFee;         // 99% = 0.099 ETH

    expect(feeBps).to.equal(100n);
    expect(denominator).to.equal(10000n);
    expect(expectedFee).to.equal(ethers.parseEther("0.001"));
    expect(expectedPayout).to.equal(ethers.parseEther("0.099"));

    // 3. Nguoi mua xac nhan nhan do -> Phat su kien FeeCollected va Completed
    const confirmTx = escrow.connect(buyer).confirmReceived();
    await expect(confirmTx)
      .to.emit(escrow, "FeeCollected")
      .withArgs(feeRecipient.address, expectedFee);
    await expect(confirmTx)
      .to.emit(escrow, "Completed")
      .withArgs(seller.address, expectedPayout, expectedFee);

    expect(await escrow.state()).to.equal(2); // State.Completed
  });

  // ==========================================
  // CA KIEM THU 2: GIAN LAN WASH TRADING
  // ==========================================
  it("Ca 2 (Gian lan): Nguoi ban tu nap coc tao don ao bi chan bang SellerCannotBeBuyer", async function () {
    await expect(escrow.connect(seller).fund({ value: price }))
      .to.be.revertedWithCustomError(escrow, "SellerCannotBeBuyer");
  });

  // ==========================================
  // CA KIEM THU 3: GIAN LAN MAO DANH NGUOI MUA
  // ==========================================
  it("Ca 3 (Gian lan): Ke tan cong khong phai nguoi mua tu y giai ngan bi chan bang NotBuyer", async function () {
    await escrow.connect(buyer).fund({ value: price });
    await expect(escrow.connect(attacker).confirmReceived())
      .to.be.revertedWithCustomError(escrow, "NotBuyer");
  });

  // ==========================================
  // CA KIEM THU 4: VI PHAM TRAN GIA KINH TE
  // ==========================================
  it("Ca 4 (Vi pham han muc): Gia niem yet vuot tran 1 ETH bi chan bang PriceExceedsLimit", async function () {
    const excessivePrice = ethers.parseEther("1.5"); // Vuot muc toi da 1 ETH
    await expect(
      Escrow.deploy(
        seller.address,
        arbiter.address,
        feeRecipient.address,
        excessivePrice,
        inspectionDays
      )
    ).to.be.revertedWithCustomError(escrow, "PriceExceedsLimit")
     .withArgs(excessivePrice, ethers.parseEther("1.0"));
  });

  it("Ca 5 (Vi pham han muc): Gia qua nho (< 10000 wei) gay bay lam tron phi ve 0 bi chan", async function () {
    const tinyPrice = 50n; // 50 wei (< 10000 wei)
    await expect(
      Escrow.deploy(
        seller.address,
        arbiter.address,
        feeRecipient.address,
        tinyPrice,
        inspectionDays
      )
    ).to.be.revertedWithCustomError(escrow, "PriceBelowMinimum")
     .withArgs(tinyPrice, 10000n);
  });
});
