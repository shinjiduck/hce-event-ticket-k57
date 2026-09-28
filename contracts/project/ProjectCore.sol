// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FairTicket - luong loi: tao su kien, phat hanh ve, mua ve, ban lai co tran gia
/// @notice Lab 9: luong loi (R1, R2, R9 trong docs/SPEC.md).
///         Lab 11: R3 - tran gia ban lai (listForResale/buyResaleTicket).
///         R4, R7, R8 (quyen ban lai, han resale, cam transfer tu do) va check-in (R5, R6) de danh cho Lab sau.
contract ProjectCore {
    uint256 public constant MAX_RESALE_BPS = 11_000; // 110% = 11000 / 10000

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
        uint256 resalePrice;
        bool forSale;
    }

    uint256 public nextEventId;
    uint256 public nextTicketId;

    mapping(uint256 => EventInfo) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256) public pendingWithdrawals;

    event EventCreated(uint256 indexed eventId, address indexed organizer, uint256 maxSupply, uint256 startTime);
    event TicketMinted(uint256 indexed ticketId, uint256 indexed eventId, uint256 originalPrice);
    event TicketBought(uint256 indexed ticketId, address indexed buyer, uint256 amount);
    event ProceedsWithdrawn(address indexed organizer, uint256 amount);
    event TicketListedForResale(uint256 indexed ticketId, address indexed seller, uint256 resalePrice);
    event TicketResold(uint256 indexed ticketId, address indexed from, address indexed to, uint256 amount);

    error EventDoesNotExist();
    error TicketDoesNotExist();
    error NotOrganizer();
    error MaxSupplyReached();
    error TicketAlreadySold();
    error IncorrectPayment(uint256 expected, uint256 sent);
    error WithdrawFailed();
    error InvalidMaxSupply();
    error InvalidPrice();
    error NothingToWithdraw();
    error NotTicketOwner();
    error TicketNotYetSold();
    error ResalePriceTooHigh(uint256 attempted, uint256 limit);
    error TicketNotForSale();

    /// @notice Organizer tao mot su kien moi voi tran so ve co dinh.
    function createEvent(
        string calldata name,
        uint256 startTime,
        uint256 maxSupply
    ) external returns (uint256 eventId) {
        // Lab 10 - audit finding: thieu kiem tra maxSupply, truoc day cho phep
        // tao event khong the ban duoc ve nao (maxSupply = 0).
        if (maxSupply == 0) revert InvalidMaxSupply();

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
        // Lab 10 - audit finding: thieu kiem tra originalPrice, truoc day
        // Organizer co the mint ve gia 0 ma khong ai phat hien duoc la loi hay co y.
        if (originalPrice == 0) revert InvalidPrice();

        // 2. Effects
        evt.ticketsMinted++;
        ticketId = nextTicketId++;
        tickets[ticketId] = Ticket({
            eventId: eventId,
            owner: evt.organizer,
            originalPrice: originalPrice,
            sold: false,
            resalePrice: 0,
            forSale: false
        });

        emit TicketMinted(ticketId, eventId, originalPrice);
    }

    /// @notice R2: mua ve truc tiep tu Organizer, dung gia niem yet, doi chu mot lan.
    /// Lab 10 - audit finding: ban dau ham nay "day" tien thang cho Organizer bang
    /// call() ngay trong buyTicket(). Neu dia chi Organizer khong nhan duoc ETH
    /// (hop dong khong co receive/fallback, hoac co doi tuong choi nhan), call()
    /// that bai lam ca giao dich revert -> ve cua event do bi khoa vinh vien,
    /// khong ai mua duoc nua (tu-DoS). Sua bang mo hinh pull-payment: ghi nhan
    /// so tien Organizer duoc nhan vao pendingWithdrawals, Organizer tu goi
    /// withdrawProceeds() de rut, tach rieng khoi luong mua ve cua nguoi khac.
    function buyTicket(uint256 ticketId) external payable {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (t.sold) revert TicketAlreadySold();
        if (msg.value != t.originalPrice) revert IncorrectPayment(t.originalPrice, msg.value);

        EventInfo storage evt = events[t.eventId];
        address organizer = evt.organizer;

        // 2. Effects - doi chu va ghi nhan tien cho Organizer rut sau
        t.owner = msg.sender;
        t.sold = true;
        pendingWithdrawals[organizer] += msg.value;
        emit TicketBought(ticketId, msg.sender, msg.value);
    }

    /// @notice R3 + R4: chu ve hien tai rao ban lai, gia toi da 110% gia goc.
    /// Lab 11 - quy tac kinh te: dung basis point (10_000 = 100%) de tinh
    /// tran gia vi Solidity khong co so thap phan.
    function listForResale(uint256 ticketId, uint256 price) external {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (!t.sold) revert TicketNotYetSold();
        if (msg.sender != t.owner) revert NotTicketOwner();

        uint256 maxResalePrice = (t.originalPrice * MAX_RESALE_BPS) / 10_000;
        if (price > maxResalePrice) revert ResalePriceTooHigh(price, maxResalePrice);

        // 2. Effects
        t.resalePrice = price;
        t.forSale = true;

        emit TicketListedForResale(ticketId, msg.sender, price);
    }

    /// @notice Mua lai ve dang rao ban, doi chu va tra tien cho chu cu qua pull-payment.
    function buyResaleTicket(uint256 ticketId) external payable {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (!t.forSale) revert TicketNotForSale();
        if (msg.value != t.resalePrice) revert IncorrectPayment(t.resalePrice, msg.value);

        address seller = t.owner;

        // 2. Effects - doi chu va ghi nhan tien cho nguoi ban rut sau
        t.owner = msg.sender;
        t.forSale = false;
        t.resalePrice = 0;
        pendingWithdrawals[seller] += msg.value;

        emit TicketResold(ticketId, seller, msg.sender, msg.value);
    }

    /// @notice Organizer tu rut tien ban ve cua minh (pull-payment).
    function withdrawProceeds() external {
        // 1. Checks
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        // 2. Effects
        pendingWithdrawals[msg.sender] = 0;
        emit ProceedsWithdrawn(msg.sender, amount);

        // 3. Interactions
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert WithdrawFailed();
    }
}
