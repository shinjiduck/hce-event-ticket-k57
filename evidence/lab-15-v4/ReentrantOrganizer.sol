// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProjectCore {
    function createEvent(string calldata name, uint256 startTime, uint256 maxResaleBps, uint256 maxPerWallet) external returns (uint256);
    function createTier(uint256 eventId, string calldata name, uint256 price, uint256 maxSupply) external returns (uint256);
    function withdrawProceeds() external;
}

contract ReentrantOrganizer {
    IProjectCore public immutable core;
    uint256 public reentryAttempts;
    bool public reentrySucceeded;

    constructor(address coreAddress) {
        core = IProjectCore(coreAddress);
    }

    function setupEvent(uint256 startTime) external returns (uint256) {
        return core.createEvent("Reentrant Event", startTime, 11000, 0);
    }

    function setupTier(uint256 eventId, uint256 price, uint256 maxSupply) external returns (uint256) {
        return core.createTier(eventId, "Standard", price, maxSupply);
    }

    function pull() external {
        core.withdrawProceeds();
    }

    receive() external payable {
        reentryAttempts++;
        if (reentryAttempts == 1) {
            try core.withdrawProceeds() {
                reentrySucceeded = true;
            } catch {}
        }
    }
}
