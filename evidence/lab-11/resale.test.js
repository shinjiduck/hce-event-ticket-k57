const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 11 - R3 tran gia ban lai", function () {
  it("Ca hop le: list + mua lai voi gia <= 110% thanh cong", async function () {
    const [organizer, buyer, resaleBuyer] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    await core.connect(organizer).createEvent("Hoi thao K58", 9999999999, 10);
    const price = ethers.parseEther("0.01");
    await core.connect(organizer).mintTicket(0, price);
    await core.connect(buyer).buyTicket(0, { value: price });

    const maxResale = (price * 11000n) / 10000n; // 110%
    const tx = await core.connect(buyer).listForResale(0, maxResale);
    await expect(tx)
      .to.emit(core, "TicketListedForResale")
      .withArgs(0, buyer.address, maxResale);
    console.log(`  [OK] listForResale gia = ${ethers.formatEther(maxResale)} ETH (dung 110% tran = ${ethers.formatEther(maxResale)} ETH)`);

    const buyTx = await core.connect(resaleBuyer).buyResaleTicket(0, { value: maxResale });
    await expect(buyTx)
      .to.emit(core, "TicketResold")
      .withArgs(0, buyer.address, resaleBuyer.address, maxResale);
    const t = await core.tickets(0);
    expect(t.owner).to.equal(resaleBuyer.address);
    console.log(`  [OK] buyResaleTicket thanh cong, ve doi chu sang ${resaleBuyer.address}`);
  });

  it("Ca vi pham: list gia > 110% goc bi tu choi voi ResalePriceTooHigh", async function () {
    const [organizer, buyer] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    await core.connect(organizer).createEvent("Hoi thao K58", 9999999999, 10);
    const price = ethers.parseEther("0.01");
    await core.connect(organizer).mintTicket(0, price);
    await core.connect(buyer).buyTicket(0, { value: price });

    const overLimit = (price * 12000n) / 10000n; // 120% - vuot tran 110%
    const maxAllowed = (price * 11000n) / 10000n;

    await expect(core.connect(buyer).listForResale(0, overLimit))
      .to.be.revertedWithCustomError(core, "ResalePriceTooHigh")
      .withArgs(overLimit, maxAllowed);
    console.log(`  [OK] listForResale gia = ${ethers.formatEther(overLimit)} ETH (>110%) bi revert dung ResalePriceTooHigh(attempted=${ethers.formatEther(overLimit)}, limit=${ethers.formatEther(maxAllowed)})`);
  });
});
