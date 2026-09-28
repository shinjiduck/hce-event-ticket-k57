// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProjectCore {
    function createEvent(string calldata name, uint256 startTime, uint256 maxSupply) external returns (uint256);
    function mintTicket(uint256 eventId, uint256 originalPrice) external returns (uint256);
    function withdrawProceeds() external;
}

/// @title ReentrantOrganizer - dong vai mot Organizer doc, thu goi lai withdrawProceeds()
/// ngay trong luc dang nhan tien, de kiem chung mo hinh pull-payment cua ProjectCore
/// (fix o Lab 10) co con dung khi bi tan cong theo kieu Lab 13 hay khong.
contract ReentrantOrganizer {
    IProjectCore public immutable core;
    uint256 public reentryAttempts;
    bool public reentrySucceeded;

    constructor(address coreAddress) {
        core = IProjectCore(coreAddress);
    }

    function setupEvent(uint256 startTime, uint256 maxSupply) external returns (uint256) {
        return core.createEvent("Reentrant Event", startTime, maxSupply);
    }

    function mint(uint256 eventId, uint256 price) external returns (uint256) {
        return core.mintTicket(eventId, price);
    }

    function pull() external {
        core.withdrawProceeds();
    }

    receive() external payable {
        reentryAttempts++;
        if (reentryAttempts == 1) {
            try core.withdrawProceeds() {
                reentrySucceeded = true;
            } catch {
                // ky vong revert NothingToWithdraw() vi pendingWithdrawals da ve 0
                // truoc khi ETH duoc gui - dung y do CEI cua Lab 10.
            }
        }
    }
}
