const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 13 - Negative test cho ProjectCore.sol", function () {
  it("Sai so tien: buyTicket() voi gia sai phai bi tu choi IncorrectPayment", async function () {
    const [organizer, buyer] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    await core.connect(organizer).createEvent("Su kien", 9999999999, 10);
    const price = ethers.parseEther("0.05");
    await core.connect(organizer).mintTicket(0, price);

    const wrongAmount = ethers.parseEther("0.04");
    await expect(core.connect(buyer).buyTicket(0, { value: wrongAmount }))
      .to.be.revertedWithCustomError(core, "IncorrectPayment")
      .withArgs(price, wrongAmount);
    console.log(`  [OK] buyTicket() gui sai gia (${ethers.formatEther(wrongAmount)} ETH thay vi ${ethers.formatEther(price)} ETH) -> revert IncorrectPayment dung nhu ky vong`);
  });

  it("Goi lai (reentrancy): Organizer doc thu goi lai withdrawProceeds() nhung khong rut duoc lan 2", async function () {
    const [, buyer, attackerOwner] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    const ReentrantOrganizer = await ethers.getContractFactory("ReentrantOrganizer");
    const organizer = await ReentrantOrganizer.connect(attackerOwner).deploy(await core.getAddress());

    await organizer.setupEvent(9999999999, 10);
    const price = ethers.parseEther("0.02");
    await organizer.mint(0, price);

    await core.connect(buyer).buyTicket(0, { value: price });
    expect(await core.pendingWithdrawals(await organizer.getAddress())).to.equal(price);

    // Organizer doc goi pull() -> withdrawProceeds() -> trong luc nhan tien,
    // receive() cua no thu goi lai withdrawProceeds() lan nua ngay lap tuc.
    await organizer.pull();

    console.log(`  [OK] So lan Organizer doc thu goi lai trong receive(): ${await organizer.reentryAttempts()} (ky vong 1)`);
    console.log(`  [OK] Lan goi lai co rut duoc them tien khong: ${await organizer.reentrySucceeded()} (ky vong false)`);

    expect(await organizer.reentryAttempts()).to.equal(1n);
    expect(await organizer.reentrySucceeded()).to.equal(false);
    expect(await core.pendingWithdrawals(await organizer.getAddress())).to.equal(0n);

    const organizerBalance = await ethers.provider.getBalance(await organizer.getAddress());
    expect(organizerBalance).to.equal(price);
    console.log(`  [OK] Organizer doc chi nhan dung ${ethers.formatEther(organizerBalance)} ETH (dung 1 lan, khong rut trung), pull-payment tu Lab 10 van dung`);
  });
});
