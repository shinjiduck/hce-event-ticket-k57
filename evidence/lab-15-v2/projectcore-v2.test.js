const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProjectCore v2 - public mint theo hang ve + check-in", function () {
  async function deployWithEventAndTiers() {
    const [organizer, buyerA, buyerB, buyerC, stranger] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    const futureTime = Math.floor(Date.now() / 1000) + 7 * 86400;
    await core.connect(organizer).createEvent("UEH Music Night", futureTime);
    const standardPrice = ethers.parseEther("0.01");
    const vipPrice = ethers.parseEther("0.05");
    await core.connect(organizer).createTier(0, "Standard", standardPrice, 2); // tierId 0, cung 2
    await core.connect(organizer).createTier(0, "VIP", vipPrice, 1); // tierId 1, cung 1

    return { core, organizer, buyerA, buyerB, buyerC, stranger, standardPrice, vipPrice };
  }

  it("Ca hop le: AI CUNG tu mint duoc ve (khong can Organizer phat hanh ho)", async function () {
    const { core, buyerA, standardPrice } = await deployWithEventAndTiers();

    const tx = await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await expect(tx).to.emit(core, "TicketMinted").withArgs(0, 0, 0, buyerA.address, standardPrice);

    const t = await core.tickets(0);
    expect(t.owner).to.equal(buyerA.address);
    expect(t.originalPrice).to.equal(standardPrice);
    console.log("  [OK] Buyer tu mint ve hang Standard thanh cong, khong can Organizer phat hanh truoc");
  });

  it("Ca vi pham: mint sai gia bi tu choi IncorrectPayment", async function () {
    const { core, buyerA, standardPrice } = await deployWithEventAndTiers();
    const wrong = ethers.parseEther("0.005");
    await expect(core.connect(buyerA).mintTicket(0, { value: wrong }))
      .to.be.revertedWithCustomError(core, "IncorrectPayment")
      .withArgs(standardPrice, wrong);
    console.log("  [OK] Mint sai gia -> revert IncorrectPayment");
  });

  it("Ca vi pham: mint vuot tong cung cua hang ve bi tu choi TierSupplyReached", async function () {
    const { core, buyerA, buyerB, buyerC, standardPrice } = await deployWithEventAndTiers();
    // tier 0 (Standard) chi co cung 2
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await core.connect(buyerB).mintTicket(0, { value: standardPrice });
    await expect(core.connect(buyerC).mintTicket(0, { value: standardPrice }))
      .to.be.revertedWithCustomError(core, "TierSupplyReached");
    console.log("  [OK] Mint vuot cung Standard (da ban het 2/2) -> revert TierSupplyReached");
  });

  it("R3+R4: rao ban lai gia <=110% thanh cong, >110% bi tu choi", async function () {
    const { core, buyerA, buyerB, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });

    const maxResale = (standardPrice * 11000n) / 10000n;
    await core.connect(buyerA).listForResale(0, maxResale);
    await core.connect(buyerB).buyResaleTicket(0, { value: maxResale });
    expect((await core.tickets(0)).owner).to.equal(buyerB.address);
    console.log("  [OK] Rao ban + mua lai dung 110% thanh cong, doi chu dung");

    // mint them 1 ve nua de test ca vi pham rieng
    await core.connect(buyerA).mintTicket(0, { value: standardPrice }); // ticket 1
    const overLimit = (standardPrice * 12000n) / 10000n;
    await expect(core.connect(buyerA).listForResale(1, overLimit))
      .to.be.revertedWithCustomError(core, "ResalePriceTooHigh");
    console.log("  [OK] Rao ban gia 120% -> revert ResalePriceTooHigh");
  });

  it("R5: chi Organizer moi check-in duoc, nguoi la bi tu choi NotOrganizer", async function () {
    const { core, organizer, buyerA, stranger, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });

    await expect(core.connect(stranger).checkIn(0)).to.be.revertedWithCustomError(core, "NotOrganizer");
    console.log("  [OK] Nguoi la goi checkIn() -> revert NotOrganizer");

    const tx = await core.connect(organizer).checkIn(0);
    await expect(tx).to.emit(core, "TicketCheckedIn").withArgs(0, buyerA.address);
    expect((await core.tickets(0)).checkedIn).to.equal(true);
    console.log("  [OK] Organizer check-in thanh cong, checkedIn = true");

    await expect(core.connect(organizer).checkIn(0)).to.be.revertedWithCustomError(core, "TicketAlreadyCheckedIn");
    console.log("  [OK] Check-in lan 2 cho cung 1 ve -> revert TicketAlreadyCheckedIn");
  });

  it("R6: ve da check-in roi thi khong rao ban lai duoc nua", async function () {
    const { core, organizer, buyerA, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await core.connect(organizer).checkIn(0);

    await expect(core.connect(buyerA).listForResale(0, standardPrice))
      .to.be.revertedWithCustomError(core, "TicketCheckedInCannotResell");
    console.log("  [OK] Ve da check-in, chu ve goi listForResale() -> revert TicketCheckedInCannotResell");
  });

  it("Reentrancy: Organizer doc goi lai withdrawProceeds() van khong rut duoc 2 lan", async function () {
    const [, buyer, attackerOwner] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    const ReentrantOrganizer = await ethers.getContractFactory("ReentrantOrganizer");
    const organizer = await ReentrantOrganizer.connect(attackerOwner).deploy(await core.getAddress());

    await organizer.setupEvent(Math.floor(Date.now() / 1000) + 86400);
    const price = ethers.parseEther("0.02");
    await organizer.setupTier(0, price, 5);

    await core.connect(buyer).mintTicket(0, { value: price });
    expect(await core.pendingWithdrawals(await organizer.getAddress())).to.equal(price);

    await organizer.pull();

    expect(await organizer.reentryAttempts()).to.equal(1n);
    expect(await organizer.reentrySucceeded()).to.equal(false);
    expect(await core.pendingWithdrawals(await organizer.getAddress())).to.equal(0n);
    const bal = await ethers.provider.getBalance(await organizer.getAddress());
    expect(bal).to.equal(price);
    console.log("  [OK] Organizer doc thu goi lai withdrawProceeds() trong receive() -> khong rut duoc lan 2, dung mo hinh pull-payment Lab 10");
  });
});
