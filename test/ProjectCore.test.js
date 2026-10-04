// SPDX-License-Identifier: MIT
// KTXEscrow Test Suite v0.1 (Lab 08)

const { expect } = require("chai");

describe("ProjectCore - KTX Escrow Economic Rules", function () {
  let Escrow, escrow;
  let seller, buyer, arbiter, feeRecipient, attacker;
  const price = ethers.parseEther("0.1"); // 0.1 ETH
  const inspectionDays = 3; // 3 days

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

  it("R1: Should allow buyer to fund with exact price", async function () {
    await expect(escrow.connect(buyer).fund({ value: price }))
      .to.emit(escrow, "Funded");
    expect(await escrow.state()).to.equal(1); // State.Funded
  });

  it("R1 (Revert): Seller cannot be buyer", async function () {
    await expect(escrow.connect(seller).fund({ value: price }))
      .to.be.revertedWithCustomError(escrow, "SellerCannotBeBuyer");
  });

  it("R2: Buyer confirms receipt, seller gets 99% and platform gets 1%", async function () {
    await escrow.connect(buyer).fund({ value: price });
    await expect(escrow.connect(buyer).confirmReceived())
      .to.emit(escrow, "Completed");
    expect(await escrow.state()).to.equal(2); // State.Completed
  });

  it("R2 (Revert): Non-buyer cannot confirm receipt", async function () {
    await escrow.connect(buyer).fund({ value: price });
    await expect(escrow.connect(attacker).confirmReceived())
      .to.be.revertedWithCustomError(escrow, "NotBuyer");
  });

  it("R4: Buyer or seller can raise dispute before deadline", async function () {
    await escrow.connect(buyer).fund({ value: price });
    await expect(escrow.connect(buyer).raiseDispute())
      .to.emit(escrow, "Disputed");
    expect(await escrow.state()).to.equal(4); // State.Disputed
  });

  it("R5: Only arbiter can resolve dispute", async function () {
    await escrow.connect(buyer).fund({ value: price });
    await escrow.connect(buyer).raiseDispute();
    
    // Attacker cannot resolve
    await expect(escrow.connect(attacker).resolveDispute(2))
      .to.be.revertedWithCustomError(escrow, "NotArbiter");

    // Arbiter resolves: Refund to buyer
    await expect(escrow.connect(arbiter).resolveDispute(2))
      .to.emit(escrow, "Refunded");
    expect(await escrow.state()).to.equal(3); // State.Refunded
  });
});
