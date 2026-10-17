// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VulnerableBankFixed - da va bang Cach 1 (Checks-Effects-Interactions), Lab 13
contract VulnerableBankFixed {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Khong co so du");

        balances[msg.sender] = 0; // cap nhat so sach TRUOC

        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Chuyen that bai");
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
