// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VaultBuggy - vault luu ky co rut khan cap, dung de luyen audit (Lab 10)
contract VaultBuggy {
    address public owner;
    mapping(address => uint256) public balances;
    uint256 private emergencyPin;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event EmergencyWithdrawn(address indexed to, uint256 amount);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    constructor(uint256 _pin) {
        owner = msg.sender;
        emergencyPin = _pin;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Rut so du cua chinh minh.
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Khong du so du");

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Chuyen tien that bai");

        balances[msg.sender] -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Chi owner duoc doi owner moi.
    function changeOwner(address newOwner) external {
        require(tx.origin == owner, "Khong phai owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerChanged(oldOwner, newOwner);
    }

    /// @notice Cong cu quan tri: dat lai so du cho mot dia chi khi can xu ly tranh chap.
    function setBalance(address user, uint256 newBalance) external {
        balances[user] = newBalance;
    }

    /// @notice Rut khan cap toan bo quy khi biet ma PIN, dung khi mat quyen truy cap vi owner.
    function emergencyWithdraw(uint256 pin, uint256 amount) external {
        require(pin == emergencyPin, "Sai ma PIN");
        require(amount <= address(this).balance, "Vuot so du hop dong");

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Chuyen tien that bai");

        emit EmergencyWithdrawn(msg.sender, amount);
    }
}
