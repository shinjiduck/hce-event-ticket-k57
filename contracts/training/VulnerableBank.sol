// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VulnerableBank - ngan hang mo phong, CO LOI REENTRANCY CO Y de luyen tap (Lab 13)
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    /// @notice LOI: chuyen tien ra ngoai (Interactions) TRUOC KHI cap nhat so sach (Effects).
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Khong co so du");

        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Chuyen that bai");

        balances[msg.sender] = 0;
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
