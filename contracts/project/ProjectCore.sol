// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FairTicket - luong loi: tao su kien, phat hanh ve, mua ve
/// @notice Lab 9: chi cai luong loi (R1, R2, R9 trong docs/SPEC.md).
///         Resale (R3, R4, R7, R8) va check-in (R5, R6) de danh cho Lab 10-11.
contract ProjectCore {
    struct EventInfo {
        string name;
        uint256 startTime;
        uint256 maxSupply;
        uint256 ticketsMinted;
        address organizer;
    }

    struct Ticket {
        uint256 eventId;
        address owner;
        uint256 originalPrice;
        bool sold;
    }

    uint256 public nextEventId;
    uint256 public nextTicketId;

    mapping(uint256 => EventInfo) public events;
    mapping(uint256 => Ticket) public tickets;

    event EventCreated(uint256 indexed eventId, address indexed organizer, uint256 maxSupply, uint256 startTime);
    event TicketMinted(uint256 indexed ticketId, uint256 indexed eventId, uint256 originalPrice);
    event TicketBought(uint256 indexed ticketId, address indexed buyer, uint256 amount);

    error EventDoesNotExist();
    error TicketDoesNotExist();
    error NotOrganizer();
    error MaxSupplyReached();
    error TicketAlreadySold();
    error IncorrectPayment(uint256 expected, uint256 sent);
    error TransferFailed();

    /// @notice Organizer tao mot su kien moi voi tran so ve co dinh.
    function createEvent(
        string calldata name,
        uint256 startTime,
        uint256 maxSupply
    ) external returns (uint256 eventId) {
        eventId = nextEventId++;
        events[eventId] = EventInfo({
            name: name,
            startTime: startTime,
            maxSupply: maxSupply,
            ticketsMinted: 0,
            organizer: msg.sender
        });

        emit EventCreated(eventId, msg.sender, maxSupply, startTime);
    }

    /// @notice R1 + R9: chi Organizer cua event duoc mint, khong vuot maxSupply.
    function mintTicket(uint256 eventId, uint256 originalPrice) external returns (uint256 ticketId) {
        // 1. Checks
        if (eventId >= nextEventId) revert EventDoesNotExist();
        EventInfo storage evt = events[eventId];
        if (msg.sender != evt.organizer) revert NotOrganizer();
        if (evt.ticketsMinted >= evt.maxSupply) revert MaxSupplyReached();

        // 2. Effects
        evt.ticketsMinted++;
        ticketId = nextTicketId++;
        tickets[ticketId] = Ticket({
            eventId: eventId,
            owner: evt.organizer,
            originalPrice: originalPrice,
            sold: false
        });

        emit TicketMinted(ticketId, eventId, originalPrice);
    }

    /// @notice R2: mua ve truc tiep tu Organizer, dung gia niem yet, doi chu mot lan.
    function buyTicket(uint256 ticketId) external payable {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (t.sold) revert TicketAlreadySold();
        if (msg.value != t.originalPrice) revert IncorrectPayment(t.originalPrice, msg.value);

        EventInfo storage evt = events[t.eventId];
        address organizer = evt.organizer;

        // 2. Effects - doi chu truoc khi chuyen tien ra ngoai
        t.owner = msg.sender;
        t.sold = true;
        emit TicketBought(ticketId, msg.sender, msg.value);

        // 3. Interactions - chuyen tien cho Organizer sau cung
        (bool ok, ) = payable(organizer).call{value: msg.value}("");
        if (!ok) revert TransferFailed();
    }
}
