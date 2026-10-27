// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FairTicket - luong loi: tao su kien, tao hang ve, ai cung tu mint,
///        ban lai co tran gia, check-in khoa ve.
/// @notice Lab 9: luong loi ban dau (R1, R2, R9 trong docs/SPEC.md).
///         Lab 11: R3 - tran gia ban lai (listForResale/buyResaleTicket).
///         Thiet ke lai sau Lab 15 - doi tu mo hinh "Organizer phat hanh
///         tung ve" sang mo hinh "public mint" kieu NFT: Organizer chi tao
///         hang ve (gia + tong cung), AI CUNG tu goi mintTicket() de nhan ve
///         truc tiep trong gioi han hang, khong can Organizer phat hanh ho
///         tung cai mot. Dong thoi them R5 + R6 (check-in va khoa ve sau
///         check-in). R7, R8 (han resale theo thoi gian, cam transfer tu do
///         ngoai he thong) van de danh cho lab sau.
///         v3: them vai tro CTV soat ve (setStaff - Organizer cap/thu hoi theo
///         tung su kien), checkIn(eventId, ticketId) tu chan ve sai su kien,
///         cancelResale cho chu ve go rao ban.
contract ProjectCore {
    uint256 public constant MAX_RESALE_BPS = 11_000; // 110% = 11000 / 10000

    struct EventInfo {
        string name;
        uint256 startTime;
        address organizer;
        uint256 tierCount;
    }

    struct Tier {
        uint256 eventId;
        string name; // vd "Standard", "VIP" - chi de hien thi, khong dung de so sanh logic
        uint256 price;
        uint256 maxSupply;
        uint256 minted;
    }

    struct Ticket {
        uint256 eventId;
        uint256 tierId;
        address owner;
        uint256 originalPrice; // = gia cua tier tai thoi diem mint
        uint256 resalePrice;
        bool forSale;
        bool checkedIn;
    }

    uint256 public nextEventId;
    uint256 public nextTierId;
    uint256 public nextTicketId;

    mapping(uint256 => EventInfo) public events;
    mapping(uint256 => Tier) public tiers;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256) public pendingWithdrawals;
    /// @notice isStaff[eventId][vi] = true: vi do duoc check-in ve cua su kien
    ///         nay (CTV soat ve). Chi co quyen check-in - khong rut tien, khong
    ///         tao hang ve, khong cap quyen cho nguoi khac.
    mapping(uint256 => mapping(address => bool)) public isStaff;

    event EventCreated(uint256 indexed eventId, address indexed organizer, uint256 startTime);
    event TierCreated(uint256 indexed tierId, uint256 indexed eventId, string name, uint256 price, uint256 maxSupply);
    event TicketMinted(uint256 indexed ticketId, uint256 indexed tierId, uint256 indexed eventId, address buyer, uint256 price);
    event ProceedsWithdrawn(address indexed organizer, uint256 amount);
    event TicketListedForResale(uint256 indexed ticketId, address indexed seller, uint256 resalePrice);
    event TicketResold(uint256 indexed ticketId, address indexed from, address indexed to, uint256 amount);
    event TicketCheckedIn(uint256 indexed ticketId, address indexed owner);
    event StaffUpdated(uint256 indexed eventId, address indexed staff, bool allowed);
    event TicketResaleCancelled(uint256 indexed ticketId, address indexed seller);

    error EventDoesNotExist();
    error TierDoesNotExist();
    error TicketDoesNotExist();
    error NotOrganizer();
    error TierSupplyReached();
    error IncorrectPayment(uint256 expected, uint256 sent);
    error WithdrawFailed();
    error InvalidMaxSupply();
    error InvalidPrice();
    error NothingToWithdraw();
    error NotTicketOwner();
    error ResalePriceTooHigh(uint256 attempted, uint256 limit);
    error TicketNotForSale();
    error ZeroResalePrice();
    error TicketAlreadyCheckedIn();
    error TicketCheckedInCannotResell();
    error NotCheckInAuthorized();
    error TicketNotInEvent();
    error ZeroAddress();

    /// @notice Ai cung tao duoc su kien, nguoi goi tu dong thanh Organizer.
    function createEvent(string calldata name, uint256 startTime) external returns (uint256 eventId) {
        eventId = nextEventId++;
        events[eventId] = EventInfo({
            name: name,
            startTime: startTime,
            organizer: msg.sender,
            tierCount: 0
        });

        emit EventCreated(eventId, msg.sender, startTime);
    }

    /// @notice R9: chi Organizer cua event duoc tao hang ve (gia + tong cung co dinh).
    /// Moi su kien tao duoc nhieu hang (vd Standard/Premium/VIP), moi hang 1 gia rieng.
    function createTier(
        uint256 eventId,
        string calldata name,
        uint256 price,
        uint256 maxSupply
    ) external returns (uint256 tierId) {
        // 1. Checks
        if (eventId >= nextEventId) revert EventDoesNotExist();
        EventInfo storage evt = events[eventId];
        if (msg.sender != evt.organizer) revert NotOrganizer();
        if (price == 0) revert InvalidPrice();
        if (maxSupply == 0) revert InvalidMaxSupply();

        // 2. Effects
        tierId = nextTierId++;
        tiers[tierId] = Tier({
            eventId: eventId,
            name: name,
            price: price,
            maxSupply: maxSupply,
            minted: 0
        });
        evt.tierCount++;

        emit TierCreated(tierId, eventId, name, price, maxSupply);
    }

    /// @notice R1 (thiet ke moi): AI CUNG tu mint duoc ve, khong rieng Organizer.
    /// Tra dung gia cua hang ve, het hang (maxSupply) thi khong mint them duoc.
    function mintTicket(uint256 tierId) external payable returns (uint256 ticketId) {
        // 1. Checks
        if (tierId >= nextTierId) revert TierDoesNotExist();
        Tier storage tier = tiers[tierId];
        if (tier.minted >= tier.maxSupply) revert TierSupplyReached();
        if (msg.value != tier.price) revert IncorrectPayment(tier.price, msg.value);

        EventInfo storage evt = events[tier.eventId];

        // 2. Effects
        tier.minted++;
        ticketId = nextTicketId++;
        tickets[ticketId] = Ticket({
            eventId: tier.eventId,
            tierId: tierId,
            owner: msg.sender,
            originalPrice: tier.price,
            resalePrice: 0,
            forSale: false,
            checkedIn: false
        });
        pendingWithdrawals[evt.organizer] += msg.value;

        emit TicketMinted(ticketId, tierId, tier.eventId, msg.sender, tier.price);
    }

    /// @notice R3 + R4: chu ve hien tai rao ban lai, gia toi da 110% gia goc.
    /// R6: ve da check-in thi khoa, khong rao ban lai duoc nua.
    function listForResale(uint256 ticketId, uint256 price) external {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (msg.sender != t.owner) revert NotTicketOwner();
        if (t.checkedIn) revert TicketCheckedInCannotResell();
        if (price == 0) revert ZeroResalePrice();

        uint256 maxResalePrice = (t.originalPrice * MAX_RESALE_BPS) / 10_000;
        if (price > maxResalePrice) revert ResalePriceTooHigh(price, maxResalePrice);

        // 2. Effects
        t.resalePrice = price;
        t.forSale = true;

        emit TicketListedForResale(ticketId, msg.sender, price);
    }

    /// @notice Mua lai ve dang rao ban, doi chu va tra tien cho chu cu qua pull-payment.
    /// R6: kiem tra lai checkedIn phong truong hop ve bi check-in sau khi da rao ban.
    function buyResaleTicket(uint256 ticketId) external payable {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (!t.forSale) revert TicketNotForSale();
        if (t.checkedIn) revert TicketCheckedInCannotResell();
        if (msg.value != t.resalePrice) revert IncorrectPayment(t.resalePrice, msg.value);

        address seller = t.owner;

        // 2. Effects - doi chu va ghi nhan tien cho nguoi ban rut sau
        t.owner = msg.sender;
        t.forSale = false;
        t.resalePrice = 0;
        pendingWithdrawals[seller] += msg.value;

        emit TicketResold(ticketId, seller, msg.sender, msg.value);
    }

    /// @notice Organizer cap (allowed = true) hoac thu hoi (false) quyen soat ve
    ///         cua 1 vi CTV cho rieng su kien cua minh. Thu hoi co hieu luc ngay.
    function setStaff(uint256 eventId, address staff, bool allowed) external {
        // 1. Checks
        if (eventId >= nextEventId) revert EventDoesNotExist();
        if (msg.sender != events[eventId].organizer) revert NotOrganizer();
        if (staff == address(0)) revert ZeroAddress();

        // 2. Effects
        isStaff[eventId][staff] = allowed;

        emit StaffUpdated(eventId, staff, allowed);
    }

    /// @notice R5: Organizer hoac CTV cua su kien check-in ve thuoc su kien do.
    /// Truyen kem eventId (su kien dang soat o cong): ve cua su kien khac bi
    /// tu choi ngay tren hop dong, ke ca khi nguoi goi to chuc ca 2 su kien.
    /// Moi ve chi check-in duoc dung 1 lan (khong co ham nao dat lai false).
    function checkIn(uint256 eventId, uint256 ticketId) external {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (t.eventId != eventId) revert TicketNotInEvent();
        if (msg.sender != events[eventId].organizer && !isStaff[eventId][msg.sender]) revert NotCheckInAuthorized();
        if (t.checkedIn) revert TicketAlreadyCheckedIn();

        // 2. Effects
        t.checkedIn = true;

        emit TicketCheckedIn(ticketId, t.owner);
    }

    /// @notice Chu ve go rao ban (truoc day hop dong khong co cach go).
    function cancelResale(uint256 ticketId) external {
        // 1. Checks
        if (ticketId >= nextTicketId) revert TicketDoesNotExist();
        Ticket storage t = tickets[ticketId];
        if (msg.sender != t.owner) revert NotTicketOwner();
        if (!t.forSale) revert TicketNotForSale();

        // 2. Effects
        t.forSale = false;
        t.resalePrice = 0;

        emit TicketResaleCancelled(ticketId, msg.sender);
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
