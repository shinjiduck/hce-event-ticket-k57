const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 14 - Tu ra soat: muc 9 (truong hop so 0)", function () {
  it("listForResale() voi price = 0 phai bi tu choi ZeroResalePrice", async function () {
    const [organizer, buyer] = await ethers.getSigners();
    const ProjectCore = await ethers.getContractFactory("ProjectCore");
    const core = await ProjectCore.deploy();

    await core.connect(organizer).createEvent("Su kien", 9999999999, 10);
    const price = ethers.parseEther("0.05");
    await core.connect(organizer).mintTicket(0, price);
    await core.connect(buyer).buyTicket(0, { value: price });

    await expect(core.connect(buyer).listForResale(0, 0)).to.be.revertedWithCustomError(
      core,
      "ZeroResalePrice"
    );
    console.log("  [OK] listForResale(ticketId, 0) bi revert dung ZeroResalePrice - da va xong finding Lab 14");
  });
});
