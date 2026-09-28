const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lab 13 - Reentrancy: mat tien va cach khac phuc", function () {
  it("VulnerableBank: Attacker rut can 7 ETH (6 ETH cua 3 nguoi + 1 ETH cua chinh no)", async function () {
    const [d1, d2, d3, attackerOwner] = await ethers.getSigners();

    const Bank = await ethers.getContractFactory("VulnerableBank");
    const bank = await Bank.deploy();

    for (const depositor of [d1, d2, d3]) {
      await bank.connect(depositor).deposit({ value: ethers.parseEther("2") });
    }
    expect(await bank.bankBalance()).to.equal(ethers.parseEther("6"));
    console.log("  [OK] 3 tai khoan da deposit 2 ETH moi nguoi -> bankBalance() = 6 ETH");

    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.connect(attackerOwner).deploy(await bank.getAddress());

    await attacker.connect(attackerOwner).attack({ value: ethers.parseEther("1") });

    const bankBalanceAfter = await bank.bankBalance();
    const attackerBalance = await ethers.provider.getBalance(await attacker.getAddress());

    console.log(`  [OK] Sau attack(): bankBalance() = ${ethers.formatEther(bankBalanceAfter)} ETH (ky vong 0)`);
    console.log(`  [OK] So du hop dong Attacker = ${ethers.formatEther(attackerBalance)} ETH (ky vong 7)`);

    expect(bankBalanceAfter).to.equal(0n);
    expect(attackerBalance).to.equal(ethers.parseEther("7"));
  });

  it("VulnerableBankFixed (Cach 1 - doi thu tu CEI): attack() khong con rut duoc gi ngoai phan cua chinh no", async function () {
    const [d1, d2, d3, attackerOwner] = await ethers.getSigners();

    const Bank = await ethers.getContractFactory("VulnerableBankFixed");
    const bank = await Bank.deploy();

    for (const depositor of [d1, d2, d3]) {
      await bank.connect(depositor).deposit({ value: ethers.parseEther("2") });
    }
    expect(await bank.bankBalance()).to.equal(ethers.parseEther("6"));

    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.connect(attackerOwner).deploy(await bank.getAddress());

    // Vi so sach da cap nhat TRUOC khi chuyen tien (Effects truoc Interactions):
    // lan goi lai trong receive() thay balances[attacker] = 0 -> withdraw() revert
    // "Khong co so du" -> loi nay lam call{value}() o lan goi ngoai cung tra ve
    // ok = false -> require(ok, "Chuyen that bai") revert -> CA GIAO DICH attack()
    // bi hoan tac hoan toan (ke ca phan deposit 1 ETH cua chinh ke tan cong).
    await expect(
      attacker.connect(attackerOwner).attack({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("Chuyen that bai");

    const bankBalanceAfter = await bank.bankBalance();
    const attackerBalance = await ethers.provider.getBalance(await attacker.getAddress());

    console.log(`  [OK] attack() bi REVERT toan bo tren ban da va (loi "Chuyen that bai")`);
    console.log(`  [OK] bankBalance() sau khi attack that bai = ${ethers.formatEther(bankBalanceAfter)} ETH (ky vong 6, tien cua 3 nguoi hoan toan an toan)`);
    console.log(`  [OK] So du hop dong Attacker = ${ethers.formatEther(attackerBalance)} ETH (ky vong 0, ke tan cong khong lay duoc gi, ke ca von bo ra)`);

    expect(bankBalanceAfter).to.equal(ethers.parseEther("6"));
    expect(attackerBalance).to.equal(0n);
  });
});
