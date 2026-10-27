const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProjectCore v4 - tran gia & gioi han vi theo su kien, chan mint sau gio bat dau, phi ban quyen 5%", function () {
  async function deployWithEventAndTiers() {
    const [organizer, buyerA, buyerB, buyerC, stranger, staff] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    const futureTime = Math.floor(Date.now() / 1000) + 7 * 86400;
    await core.connect(organizer).createEvent("UEH Music Night", futureTime, 11000, 4); // eventId 0: tran 110%, toi da 4 ve/vi
    const standardPrice = ethers.parseEther("0.01");
    const vipPrice = ethers.parseEther("0.05");
    await core.connect(organizer).createTier(0, "Standard", standardPrice, 2); // tierId 0, cung 2
    await core.connect(organizer).createTier(0, "VIP", vipPrice, 1); // tierId 1, cung 1

    return { core, organizer, buyerA, buyerB, buyerC, stranger, staff, standardPrice, vipPrice, futureTime };
  }

  // ---------- Giu nguyen tu v2 ----------

  it("Ca hop le: AI CUNG tu mint duoc ve (khong can Organizer phat hanh ho)", async function () {
    const { core, buyerA, standardPrice } = await deployWithEventAndTiers();
    const tx = await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await expect(tx).to.emit(core, "TicketMinted").withArgs(0, 0, 0, buyerA.address, standardPrice);
    const t = await core.tickets(0);
    expect(t.owner).to.equal(buyerA.address);
    expect(t.originalPrice).to.equal(standardPrice);
    console.log("  [OK] Buyer tu mint ve hang Standard thanh cong");
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
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await core.connect(buyerB).mintTicket(0, { value: standardPrice });
    await expect(core.connect(buyerC).mintTicket(0, { value: standardPrice }))
      .to.be.revertedWithCustomError(core, "TierSupplyReached");
    console.log("  [OK] Mint vuot cung Standard (2/2) -> revert TierSupplyReached");
  });

  it("R3+R4: rao ban lai gia <=110% thanh cong, >110% bi tu choi", async function () {
    const { core, buyerA, buyerB, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    const maxResale = (standardPrice * 11000n) / 10000n;
    await core.connect(buyerA).listForResale(0, maxResale);
    await core.connect(buyerB).buyResaleTicket(0, { value: maxResale });
    expect((await core.tickets(0)).owner).to.equal(buyerB.address);
    console.log("  [OK] Rao ban + mua lai dung 110% thanh cong, doi chu dung");

    await core.connect(buyerA).mintTicket(0, { value: standardPrice }); // ticket 1
    const overLimit = (standardPrice * 12000n) / 10000n;
    await expect(core.connect(buyerA).listForResale(1, overLimit))
      .to.be.revertedWithCustomError(core, "ResalePriceTooHigh");
    console.log("  [OK] Rao ban gia 120% -> revert ResalePriceTooHigh");
  });

  it("R5: Organizer check-in duoc, nguoi la bi tu choi, check-in lan 2 bi tu choi", async function () {
    const { core, organizer, buyerA, stranger, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });

    await expect(core.connect(stranger).checkIn(0, 0)).to.be.revertedWithCustomError(core, "NotCheckInAuthorized");
    console.log("  [OK] Nguoi la goi checkIn() -> revert NotCheckInAuthorized");

    const tx = await core.connect(organizer).checkIn(0, 0);
    await expect(tx).to.emit(core, "TicketCheckedIn").withArgs(0, buyerA.address);
    expect((await core.tickets(0)).checkedIn).to.equal(true);
    console.log("  [OK] Organizer check-in thanh cong, checkedIn = true");

    await expect(core.connect(organizer).checkIn(0, 0)).to.be.revertedWithCustomError(core, "TicketAlreadyCheckedIn");
    console.log("  [OK] Check-in lan 2 cho cung 1 ve -> revert TicketAlreadyCheckedIn");
  });

  it("R6: ve da check-in roi thi khong rao ban lai duoc nua", async function () {
    const { core, organizer, buyerA, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await core.connect(organizer).checkIn(0, 0);
    await expect(core.connect(buyerA).listForResale(0, standardPrice))
      .to.be.revertedWithCustomError(core, "TicketCheckedInCannotResell");
    console.log("  [OK] Ve da check-in -> listForResale() revert TicketCheckedInCannotResell");
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
    await organizer.pull();
    expect(await organizer.reentryAttempts()).to.equal(1n);
    expect(await organizer.reentrySucceeded()).to.equal(false);
    expect(await core.pendingWithdrawals(await organizer.getAddress())).to.equal(0n);
    expect(await ethers.provider.getBalance(await organizer.getAddress())).to.equal(price);
    console.log("  [OK] Goi lai withdrawProceeds() trong receive() -> khong rut duoc lan 2 (pull-payment)");
  });

  // ---------- Moi trong v3: CTV soat ve ----------

  it("CTV: Organizer cap quyen -> CTV check-in duoc; thu hoi -> bi tu choi ngay", async function () {
    const { core, organizer, buyerA, buyerB, staff, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice }); // ticket 0
    await core.connect(buyerB).mintTicket(0, { value: standardPrice }); // ticket 1

    await expect(core.connect(staff).checkIn(0, 0)).to.be.revertedWithCustomError(core, "NotCheckInAuthorized");
    console.log("  [OK] Vi CTV chua duoc cap quyen -> revert NotCheckInAuthorized");

    await expect(core.connect(organizer).setStaff(0, staff.address, true))
      .to.emit(core, "StaffUpdated").withArgs(0, staff.address, true);
    expect(await core.isStaff(0, staff.address)).to.equal(true);
    await expect(core.connect(staff).checkIn(0, 0)).to.emit(core, "TicketCheckedIn").withArgs(0, buyerA.address);
    console.log("  [OK] Organizer cap quyen -> CTV check-in ve #0 thanh cong");

    await expect(core.connect(organizer).setStaff(0, staff.address, false))
      .to.emit(core, "StaffUpdated").withArgs(0, staff.address, false);
    await expect(core.connect(staff).checkIn(0, 1)).to.be.revertedWithCustomError(core, "NotCheckInAuthorized");
    console.log("  [OK] Thu hoi quyen -> CTV check-in ve #1 bi tu choi ngay");
  });

  it("CTV chi co quyen check-in: khong tao hang ve, khong cap quyen, khong rut tien", async function () {
    const { core, organizer, buyerA, staff, standardPrice } = await deployWithEventAndTiers();
    await core.connect(organizer).setStaff(0, staff.address, true);
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });

    await expect(core.connect(staff).createTier(0, "Hack", standardPrice, 10)).to.be.revertedWithCustomError(core, "NotOrganizer");
    await expect(core.connect(staff).setStaff(0, buyerA.address, true)).to.be.revertedWithCustomError(core, "NotOrganizer");
    await expect(core.connect(staff).withdrawProceeds()).to.be.revertedWithCustomError(core, "NothingToWithdraw");
    expect(await core.pendingWithdrawals(organizer.address)).to.equal(standardPrice);
    console.log("  [OK] CTV goi createTier / setStaff -> NotOrganizer; withdrawProceeds -> NothingToWithdraw; tien van cua Organizer");
  });

  it("setStaff: nguoi ngoai, dia chi 0, su kien khong ton tai deu bi tu choi", async function () {
    const { core, organizer, stranger, staff } = await deployWithEventAndTiers();
    await expect(core.connect(stranger).setStaff(0, staff.address, true)).to.be.revertedWithCustomError(core, "NotOrganizer");
    await expect(core.connect(organizer).setStaff(0, ethers.ZeroAddress, true)).to.be.revertedWithCustomError(core, "ZeroAddress");
    await expect(core.connect(organizer).setStaff(9, staff.address, true)).to.be.revertedWithCustomError(core, "EventDoesNotExist");
    console.log("  [OK] setStaff boi nguoi ngoai / dia chi 0 / su kien #9 -> NotOrganizer / ZeroAddress / EventDoesNotExist");
  });

  it("Ve sai su kien bi hop dong tu choi (ke ca Organizer to chuc ca 2 su kien); CTV su kien A khong soat duoc su kien B", async function () {
    const { core, organizer, buyerA, staff, standardPrice, futureTime } = await deployWithEventAndTiers();
    await core.connect(organizer).createEvent("Su kien B", futureTime, 11000, 4); // eventId 1
    await core.connect(organizer).createTier(1, "Standard", standardPrice, 5); // tierId 2
    await core.connect(buyerA).mintTicket(2, { value: standardPrice }); // ticket 0 thuoc su kien 1
    await core.connect(organizer).setStaff(0, staff.address, true); // CTV chi cua su kien 0

    await expect(core.connect(organizer).checkIn(0, 0)).to.be.revertedWithCustomError(core, "TicketNotInEvent");
    console.log("  [OK] Organizer dung o cong su kien A check-in ve cua su kien B -> revert TicketNotInEvent");

    await expect(core.connect(staff).checkIn(1, 0)).to.be.revertedWithCustomError(core, "NotCheckInAuthorized");
    console.log("  [OK] CTV cua su kien A check-in ve su kien B (dung eventId) -> revert NotCheckInAuthorized");

    await expect(core.connect(organizer).checkIn(1, 0)).to.emit(core, "TicketCheckedIn");
    console.log("  [OK] Dung su kien -> check-in thanh cong");
  });

  // ---------- Moi trong v3: go rao ban ----------

  it("cancelResale: chu ve go rao ban; nguoi khac khong go duoc; go xong khong ai mua duoc, rao lai duoc", async function () {
    const { core, buyerA, buyerB, stranger, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });

    await expect(core.connect(buyerA).cancelResale(0)).to.be.revertedWithCustomError(core, "TicketNotForSale");
    console.log("  [OK] Go rao ban khi chua rao -> revert TicketNotForSale");

    await core.connect(buyerA).listForResale(0, standardPrice);
    await expect(core.connect(stranger).cancelResale(0)).to.be.revertedWithCustomError(core, "NotTicketOwner");
    console.log("  [OK] Nguoi khong phai chu ve go rao ban -> revert NotTicketOwner");

    await expect(core.connect(buyerA).cancelResale(0)).to.emit(core, "TicketResaleCancelled").withArgs(0, buyerA.address);
    const t = await core.tickets(0);
    expect(t.forSale).to.equal(false);
    expect(t.resalePrice).to.equal(0n);
    await expect(core.connect(buyerB).buyResaleTicket(0, { value: standardPrice })).to.be.revertedWithCustomError(core, "TicketNotForSale");
    console.log("  [OK] Chu ve go rao ban -> forSale = false; nguoi khac mua -> revert TicketNotForSale");

    await core.connect(buyerA).listForResale(0, standardPrice);
    await core.connect(buyerB).buyResaleTicket(0, { value: standardPrice });
    expect((await core.tickets(0)).owner).to.equal(buyerB.address);
    console.log("  [OK] Rao lai sau khi go -> mua lai binh thuong");
  });

  it("Ve dang rao ban bi check-in -> khong ai mua duoc nua (R6 van giu sau khi them CTV)", async function () {
    const { core, organizer, buyerA, buyerB, staff, standardPrice } = await deployWithEventAndTiers();
    await core.connect(buyerA).mintTicket(0, { value: standardPrice });
    await core.connect(buyerA).listForResale(0, standardPrice);
    await core.connect(organizer).setStaff(0, staff.address, true);
    await core.connect(staff).checkIn(0, 0);
    await expect(core.connect(buyerB).buyResaleTicket(0, { value: standardPrice }))
      .to.be.revertedWithCustomError(core, "TicketCheckedInCannotResell");
    console.log("  [OK] CTV check-in ve dang rao ban -> buyResaleTicket revert TicketCheckedInCannotResell");
  });

  // ---------- Moi trong v4 ----------

  it("createEvent: tran gia phai trong 100-200%, so ve/vi toi da 100", async function () {
    const [org] = await ethers.getSigners();
    const core = await (await ethers.getContractFactory("ProjectCore")).deploy();
    const t = Math.floor(Date.now() / 1000) + 86400;
    await expect(core.connect(org).createEvent("A", t, 9999, 4)).to.be.revertedWithCustomError(core, "InvalidResaleCap").withArgs(9999);
    await expect(core.connect(org).createEvent("A", t, 20001, 4)).to.be.revertedWithCustomError(core, "InvalidResaleCap").withArgs(20001);
    await expect(core.connect(org).createEvent("A", t, 11000, 101)).to.be.revertedWithCustomError(core, "InvalidWalletLimit").withArgs(101);
    await expect(core.connect(org).createEvent("A", t, 20000, 0)).to.emit(core, "EventCreated").withArgs(0, org.address, t, 20000, 0);
    const e = await core.events(0);
    expect(e.maxResaleBps).to.equal(20000n);
    expect(e.maxPerWallet).to.equal(0n);
    console.log("  [OK] Tran 99.99% / 200.01% / 101 ve/vi bi tu choi; 200% + khong gioi han duoc chap nhan va luu tren chain");
  });

  it("Tran gia theo tung su kien: su kien 150% va su kien 100%", async function () {
    const [org, buyer] = await ethers.getSigners();
    const core = await (await ethers.getContractFactory("ProjectCore")).deploy();
    const t = Math.floor(Date.now() / 1000) + 86400;
    const price = ethers.parseEther("1");
    await core.connect(org).createEvent("Thoang", t, 15000, 0); // event 0: 150%
    await core.connect(org).createEvent("Chat", t, 10000, 0); // event 1: 100%
    await core.connect(org).createTier(0, "Std", price, 10); // tier 0
    await core.connect(org).createTier(1, "Std", price, 10); // tier 1
    await core.connect(buyer).mintTicket(0, { value: price }); // ticket 0 (event 0)
    await core.connect(buyer).mintTicket(1, { value: price }); // ticket 1 (event 1)

    await core.connect(buyer).listForResale(0, ethers.parseEther("1.5"));
    await expect(core.connect(buyer).listForResale(0, ethers.parseEther("1.51")))
      .to.be.revertedWithCustomError(core, "ResalePriceTooHigh").withArgs(ethers.parseEther("1.51"), ethers.parseEther("1.5"));
    console.log("  [OK] Su kien tran 150%: rao 150% duoc, 151% bi tu choi");

    await core.connect(buyer).listForResale(1, price);
    await expect(core.connect(buyer).listForResale(1, ethers.parseEther("1.01")))
      .to.be.revertedWithCustomError(core, "ResalePriceTooHigh").withArgs(ethers.parseEther("1.01"), price);
    console.log("  [OK] Su kien tran 100%: chi duoc ban lai toi da bang gia goc");
  });

  it("Gioi han ve moi vi: toi da 2 ve/vi (tinh chung cac hang), vi khac van mua duoc, mua lai khong tinh", async function () {
    const [org, a, b, c] = await ethers.getSigners();
    const core = await (await ethers.getContractFactory("ProjectCore")).deploy();
    const t = Math.floor(Date.now() / 1000) + 86400;
    const p = ethers.parseEther("0.01");
    await core.connect(org).createEvent("Gioi han", t, 11000, 2);
    await core.connect(org).createTier(0, "Std", p, 10); // tier 0
    await core.connect(org).createTier(0, "VIP", p, 10); // tier 1
    await core.connect(a).mintTicket(0, { value: p });
    await core.connect(a).mintTicket(1, { value: p }); // 2 ve, khac hang
    expect(await core.mintedBy(0, a.address)).to.equal(2n);
    await expect(core.connect(a).mintTicket(0, { value: p })).to.be.revertedWithCustomError(core, "WalletLimitReached").withArgs(2);
    console.log("  [OK] Vi A mua 2 ve (Std + VIP) roi ve thu 3 -> revert WalletLimitReached(2)");

    await core.connect(b).mintTicket(0, { value: p }); // ticket 2
    await core.connect(b).mintTicket(0, { value: p }); // ticket 3
    await core.connect(b).listForResale(2, p);
    await core.connect(a).buyResaleTicket(2, { value: p });
    expect((await core.tickets(2)).owner).to.equal(a.address);
    console.log("  [OK] Vi A da du 2 ve mua moi van mua lai duoc tren cho ban lai (tran gia da chan loi)");

    await core.connect(c).mintTicket(0, { value: p });
    console.log("  [OK] Vi khac van mua binh thuong");
  });

  it("maxPerWallet = 0: khong gioi han", async function () {
    const [org, a] = await ethers.getSigners();
    const core = await (await ethers.getContractFactory("ProjectCore")).deploy();
    const p = ethers.parseEther("0.01");
    await core.connect(org).createEvent("Tu do", Math.floor(Date.now() / 1000) + 86400, 11000, 0);
    await core.connect(org).createTier(0, "Std", p, 10);
    for (let i = 0; i < 6; i++) await core.connect(a).mintTicket(0, { value: p });
    expect(await core.mintedBy(0, a.address)).to.equal(6n);
    console.log("  [OK] Gioi han = 0 -> 1 vi mua 6 ve van duoc");
  });

  it("Sau gio bat dau: khong mint duoc nua, nhung van rao ban / mua lai / check-in duoc", async function () {
    const [org, a, b] = await ethers.getSigners();
    const core = await (await ethers.getContractFactory("ProjectCore")).deploy();
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const p = ethers.parseEther("0.01");
    await core.connect(org).createEvent("Sap dien ra", now + 3600, 11000, 4);
    await core.connect(org).createTier(0, "Std", p, 10);
    await core.connect(a).mintTicket(0, { value: p }); // ticket 0, truoc gio G

    await ethers.provider.send("evm_increaseTime", [7200]);
    await ethers.provider.send("evm_mine", []);
    await expect(core.connect(b).mintTicket(0, { value: p })).to.be.revertedWithCustomError(core, "EventAlreadyStarted");
    console.log("  [OK] Qua gio bat dau -> mintTicket revert EventAlreadyStarted");

    await core.connect(a).listForResale(0, p);
    await core.connect(b).buyResaleTicket(0, { value: p });
    await core.connect(org).checkIn(0, 0);
    expect((await core.tickets(0)).checkedIn).to.equal(true);
    console.log("  [OK] Sau gio bat dau van rao ban, mua lai va check-in duoc");
  });

  it("Phi ban quyen 5%: mua lai 1.1 ETH -> Organizer +0.055, nguoi ban +1.045; lam tron xuong khong mat wei", async function () {
    const [org, a, b, c, d] = await ethers.getSigners();
    const core = await (await ethers.getContractFactory("ProjectCore")).deploy();
    const t = Math.floor(Date.now() / 1000) + 86400;
    const price = ethers.parseEther("1");
    await core.connect(org).createEvent("Phi", t, 11000, 0);
    await core.connect(org).createTier(0, "Std", price, 10);
    await core.connect(org).createTier(0, "Le", 1000n, 10); // gia le (wei) de thu lam tron
    await core.connect(a).mintTicket(0, { value: price }); // ticket 0
    expect(await core.pendingWithdrawals(org.address)).to.equal(price);

    const resale = ethers.parseEther("1.1");
    await core.connect(a).listForResale(0, resale);
    await expect(core.connect(b).buyResaleTicket(0, { value: resale }))
      .to.emit(core, "TicketResold").withArgs(0, a.address, b.address, resale, ethers.parseEther("0.055"));
    expect(await core.pendingWithdrawals(org.address)).to.equal(price + ethers.parseEther("0.055"));
    expect(await core.pendingWithdrawals(a.address)).to.equal(ethers.parseEther("1.045"));
    console.log("  [OK] Ban lai 1.1 ETH: Organizer nhan them 0.055 ETH, nguoi ban 1.045 ETH");

    await core.connect(c).mintTicket(1, { value: 1000n }); // ticket 1, gia 1000 wei
    await core.connect(c).listForResale(1, 1099n); // 109.9%
    const orgBefore = await core.pendingWithdrawals(org.address);
    await core.connect(d).buyResaleTicket(1, { value: 1099n });
    const royalty = (await core.pendingWithdrawals(org.address)) - orgBefore;
    expect(royalty).to.equal(54n); // 1099 * 5% = 54.95 -> 54
    expect(await core.pendingWithdrawals(c.address)).to.equal(1045n);
    expect(royalty + 1045n).to.equal(1099n);
    console.log("  [OK] Gia 1099 wei: phi 54 wei (lam tron xuong), nguoi ban 1045 wei, tong khop 1099");

    const before = await ethers.provider.getBalance(a.address);
    const tx = await core.connect(a).withdrawProceeds();
    const rc = await tx.wait();
    expect((await ethers.provider.getBalance(a.address)) - before + rc.gasUsed * rc.gasPrice).to.equal(ethers.parseEther("1.045"));
    console.log("  [OK] Nguoi ban rut dung 1.045 ETH (pull-payment)");
  });
});
