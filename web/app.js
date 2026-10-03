/* ==========================================================================
   FairTicket — SPA app
   Vanilla JS, hash router, no build step, no backend.
   Reads/writes contracts/project/ProjectCore.sol directly via ethers.js.

   Honesty note on data that is NOT on-chain:
   ProjectCore.sol only stores (name, startTime, maxSupply, organizer) per
   event and (eventId, owner, originalPrice, sold, resalePrice, forSale) per
   ticket. It has no fields for description / location / end time / cover
   image / gallery. Those richer fields are saved in this browser's
   localStorage only (keyed by contract address + eventId) so the organizer
   who created the event sees them back; other visitors see a graceful
   fallback (sample photo, "Chưa có mô tả"). This is a known limitation of a
   no-backend static site, not a bug — see README.md.
   ========================================================================== */

(function () {
  "use strict";

  // ---------- Config ----------

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: dán địa chỉ Sepolia sau khi deploy
  let CONTRACT_ABI = null; // tự nạp từ ./ProjectCore.abi.json
  const SEPOLIA_CHAIN_ID = 11155111n;

  const STOCK_IMAGES = [
    "./assets/event-conference.jpg",
    "./assets/event-festival.jpg",
    "./assets/event-jazz.jpg",
    "./assets/hero.jpg",
  ];

  // ---------- Demo data mode ----------
  // Khi CHƯA cấu hình CONTRACT_ADDRESS/ABI thật, trang dùng dữ liệu minh họa
  // cố định (không phải chain thật) để nhóm xem/trình bày trọn vẹn giao diện
  // trước khi deploy. Mọi nơi dùng dữ liệu minh họa đều có badge "Minh họa".
  const DAY = 86400;
  const now = Math.floor(Date.now() / 1000);
  const MOCK_EVENTS = [
    { id: 0n, name: "UEH Music Night 2026", startTime: BigInt(now + 20 * DAY), maxSupply: 100n, ticketsMinted: 42n, organizer: "0x4f99DacFdFec762beFe11F98E5bA0a229297a04e" },
    { id: 1n, name: "Tech Conference Huế 2026", startTime: BigInt(now + 6 * DAY), maxSupply: 50n, ticketsMinted: 50n, organizer: "0x4f99DacFdFec762beFe11F98E5bA0a229297a04e" },
    { id: 2n, name: "Jazz Night Downtown", startTime: BigInt(now - 3 * DAY), maxSupply: 30n, ticketsMinted: 20n, organizer: "0x1234567890123456789012345678901234567890" },
  ];
  const MOCK_META = {
    0: { location: "Nhà văn hóa Huế", description: "Đêm nhạc sinh viên UEH quy tụ các ban nhạc indie nổi bật của trường, mở màn mùa lễ hội 2026.", image: "./assets/hero.jpg" },
    1: { location: "Trung tâm Hội nghị Quốc gia", description: "Hội nghị công nghệ thường niên với các diễn giả từ cộng đồng blockchain Việt Nam.", image: "./assets/event-conference.jpg" },
    2: { location: "Downtown Jazz Club", description: "Đêm nhạc jazz thân mật với ban nhạc khách mời quốc tế.", image: "./assets/event-jazz.jpg" },
  };
  function buildMockTickets() {
    const rows = [];
    let id = 0n;
    const tiers0 = [ethers.parseEther("0.02"), ethers.parseEther("0.035"), ethers.parseEther("0.06")];
    for (let i = 0; i < 42; i++) {
      const price = tiers0[i % 3];
      rows.push({ id: id++, eventId: 0n, owner: MOCK_EVENTS[0].organizer, originalPrice: price, sold: i < 30, resalePrice: 0n, forSale: false });
    }
    for (let i = 0; i < 50; i++) {
      rows.push({ id: id++, eventId: 1n, owner: MOCK_EVENTS[1].organizer, originalPrice: ethers.parseEther("0.05"), sold: true, resalePrice: 0n, forSale: false });
    }
    for (let i = 0; i < 20; i++) {
      rows.push({ id: id++, eventId: 2n, owner: MOCK_EVENTS[2].organizer, originalPrice: ethers.parseEther("0.03"), sold: true, resalePrice: 0n, forSale: false });
    }
    return rows;
  }
  let MOCK_TICKETS = null;

  const ERROR_MESSAGES = {
    EventDoesNotExist: "Sự kiện này không tồn tại.",
    TicketDoesNotExist: "Vé này không tồn tại.",
    NotOrganizer: "Chỉ Organizer của sự kiện mới làm được việc này.",
    MaxSupplyReached: "Sự kiện đã phát hành hết số vé tối đa.",
    TicketAlreadySold: "Vé này đã có người mua rồi.",
    IncorrectPayment: "Số ETH gửi không đúng với giá niêm yết.",
    WithdrawFailed: "Rút tiền thất bại, thử lại sau.",
    InvalidMaxSupply: "Tổng số vé tối đa phải lớn hơn 0.",
    InvalidPrice: "Giá vé phải lớn hơn 0.",
    NothingToWithdraw: "Bạn chưa có khoản tiền nào để rút.",
    NotTicketOwner: "Bạn không phải chủ sở hữu vé này.",
    TicketNotYetSold: "Vé này chưa được bán lần đầu, chưa thể rao bán lại.",
    ResalePriceTooHigh: "Giá rao bán vượt quá 110% giá gốc, không được phép.",
    TicketNotForSale: "Vé này hiện không được rao bán.",
    ZeroResalePrice: "Giá rao bán phải lớn hơn 0.",
  };

  // ---------- State ----------

  let provider, signer, contract, readContract, userAddress, chainId;
  let eventsCache = null; // [{id, name, startTime, maxSupply, ticketsMinted, organizer}]

  const $root = () => document.getElementById("app-root");

  // ---------- Utilities ----------

  function h(strings, ...values) {
    return strings.reduce((out, s, i) => out + s + (values[i] ?? ""), "");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function shortAddr(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function fmtEth(wei) {
    try {
      return ethers.formatEther(wei);
    } catch {
      return "0";
    }
  }

  function fmtDate(ts) {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function fmtDateTime(ts) {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
  }

  function stockImage(eventId) {
    const i = Number(eventId) % STOCK_IMAGES.length;
    return STOCK_IMAGES[i];
  }

  function friendlyError(err) {
    const raw = err?.shortMessage || err?.reason || err?.message || String(err);
    for (const name of Object.keys(ERROR_MESSAGES)) {
      if (raw.includes(name)) return ERROR_MESSAGES[name];
    }
    if (raw.toLowerCase().includes("user rejected")) return "Bạn đã huỷ xác nhận trong ví.";
    if (raw.toLowerCase().includes("insufficient funds")) return "Ví không đủ ETH để thực hiện giao dịch này.";
    if (raw.toLowerCase().includes("chưa cấu hình")) return raw;
    return "Giao dịch thất bại: " + raw.slice(0, 160);
  }

  let toastTimer;
  function toast(message, kind) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.className = "toast toast-" + (kind || "info");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
  }

  async function withBusy(btn, fn) {
    if (!btn) return fn();
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner' + (btn.classList.contains("btn-secondary") || btn.classList.contains("btn-ghost") ? " spinner-dark" : "") + '"></span> ' + original.replace(/<span class="spinner.*?<\/span>\s*/, "");
    try {
      await fn();
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  // ---------- Local metadata (non-chain fields) ----------

  function metaKey() {
    return "fairticket:meta:" + CONTRACT_ADDRESS.toLowerCase();
  }
  function getAllMeta() {
    try { return JSON.parse(localStorage.getItem(metaKey()) || "{}"); } catch { return {}; }
  }
  function getMeta(eventId) {
    const all = getAllMeta();
    if (all[String(eventId)]) return all[String(eventId)];
    if (!isConfigured() && MOCK_META[String(eventId)]) return MOCK_META[String(eventId)];
    return {};
  }
  function saveMeta(eventId, data) {
    const all = getAllMeta();
    all[String(eventId)] = Object.assign({}, all[String(eventId)], data);
    localStorage.setItem(metaKey(), JSON.stringify(all));
  }

  // ---------- Chain access ----------

  async function loadAbi() {
    if (CONTRACT_ABI) return;
    try {
      const res = await fetch("./ProjectCore.abi.json");
      if (res.ok) CONTRACT_ABI = await res.json();
    } catch (err) {
      console.warn("Không tự nạp được ABI.", err);
    }
  }

  function isConfigured() {
    return !!CONTRACT_ABI && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
  }

  async function ensureReadContract() {
    await loadAbi();
    if (!isConfigured()) return null;
    if (readContract) return readContract;
    const fallbackProvider = ethers.getDefaultProvider("sepolia");
    readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider || fallbackProvider);
    return readContract;
  }

  async function connectWallet() {
    if (!window.ethereum) {
      toast("Chưa cài MetaMask (hoặc ví tương thích) trên trình duyệt này.", "error");
      return;
    }
    await loadAbi();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    const net = await provider.getNetwork();
    chainId = net.chainId;

    if (isConfigured()) {
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      readContract = contract;
    }

    renderHeader();
    toast("Đã kết nối ví.", "success");
    route();
  }

  function requireWallet() {
    if (!userAddress) throw new Error("Chưa kết nối ví. Bấm “Kết nối ví” ở góc trên bên phải.");
  }
  function requireContract() {
    if (!isConfigured()) throw new Error("Chưa cấu hình CONTRACT_ADDRESS/ABI trong app.js.");
    if (!contract) throw new Error("Chưa kết nối ví.");
  }
  function requireRightNetwork() {
    if (chainId && chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error("Ví đang không ở mạng Sepolia. Đổi mạng trong MetaMask rồi thử lại.");
    }
  }

  async function fetchAllEvents(force) {
    if (!isConfigured()) { await loadAbi(); }
    if (!isConfigured()) return MOCK_EVENTS;
    const c = await ensureReadContract();
    if (!c) return [];
    if (eventsCache && !force) return eventsCache;
    const count = await c.nextEventId();
    const out = [];
    for (let i = 0n; i < count; i++) {
      const e = await c.events(i);
      out.push({
        id: i,
        name: e.name,
        startTime: e.startTime,
        maxSupply: e.maxSupply,
        ticketsMinted: e.ticketsMinted,
        organizer: e.organizer,
      });
    }
    eventsCache = out;
    return out;
  }

  async function fetchTicketsForEvent(eventId) {
    if (!isConfigured()) {
      if (!MOCK_TICKETS) MOCK_TICKETS = buildMockTickets();
      return MOCK_TICKETS.filter((t) => t.eventId === eventId);
    }
    const c = await ensureReadContract();
    if (!c) return [];
    const count = await c.nextTicketId();
    const out = [];
    for (let i = 0n; i < count; i++) {
      const t = await c.tickets(i);
      if (t.eventId === eventId) out.push(Object.assign({ id: i }, t));
    }
    return out;
  }

  function computeStatus(evt, tickets) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= Number(evt.startTime)) return { label: "Đã kết thúc", cls: "badge-neutral" };
    const unsold = tickets.filter((t) => !t.sold).length;
    if (evt.ticketsMinted > 0n && unsold > 0) return { label: "Đang bán vé", cls: "badge-success" };
    if (evt.ticketsMinted > 0n && unsold === 0) return { label: "Đã bán hết", cls: "badge-warning" };
    return { label: "Sắp diễn ra", cls: "badge-warning" };
  }

  function groupTiersByPrice(tickets) {
    const map = new Map();
    for (const t of tickets) {
      if (t.sold) continue;
      const key = t.originalPrice.toString();
      if (!map.has(key)) map.set(key, { price: t.originalPrice, ticketIds: [] });
      map.get(key).ticketIds.push(t.id);
    }
    const groups = Array.from(map.values()).sort((a, b) => (a.price < b.price ? -1 : a.price > b.price ? 1 : 0));
    const names = ["Standard", "Premium", "VIP", "Platinum"];
    return groups.map((g, i) => Object.assign({ name: names[i] || "Hạng " + (i + 1) }, g));
  }

  // ---------- Router ----------

  const routes = {};
  function route() {
    const hash = window.location.hash.slice(1) || "/";
    const parts = hash.split("/").filter(Boolean);
    renderHeader();
    if (parts.length === 0) return routes.home();
    if (parts[0] === "events" && parts[1]) return routes.eventDetail(parts[1]);
    if (parts[0] === "events") return routes.events();
    if (parts[0] === "create") return routes.create();
    if (parts[0] === "my-events") return routes.myEvents();
    if (parts[0] === "checkout" && parts[1]) return routes.checkout(parts[1], parts[2]);
    return routes.home();
  }
  window.addEventListener("hashchange", route);

  // ---------- Header ----------

  function renderHeader() {
    const hash = window.location.hash.slice(1) || "/";
    const base = hash.split("/").filter(Boolean)[0] || "";
    document.querySelectorAll(".main-nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.route === base);
    });
    const btn = document.getElementById("btn-connect");
    if (userAddress) {
      btn.innerHTML = '<span class="wallet-chip"><span class="wallet-chip__dot"></span><span class="mono">' + shortAddr(userAddress) + "</span></span>";
      btn.className = "";
      btn.onclick = () => { window.location.hash = "#/my-events"; };
    } else {
      btn.innerHTML = "Kết nối ví";
      btn.className = "btn btn-primary btn-sm";
      btn.onclick = (e) => withBusy(e.currentTarget, connectWallet);
    }
  }

  // ---------- Page: Home ----------

  routes.home = async function () {
    $root().innerHTML = h`
      <div class="page container">
        <section class="hero">
          <img class="hero__img" src="./assets/hero.jpg" alt="" />
          <div class="hero__scrim"></div>
          <div class="hero__content">
            <h1>Vé công bằng cho những sự kiện đáng nhớ</h1>
            <p>Ứng dụng blockchain giúp chống vé giả, hạn chế đầu cơ và mang lại trải nghiệm minh bạch cho người tham gia.</p>
            <div class="hero__cta">
              <a href="#/events" class="btn btn-primary btn-lg">Khám phá sự kiện →</a>
              <a href="#/create" class="btn btn-secondary btn-lg">Tạo sự kiện</a>
            </div>
          </div>
        </section>

        <section class="benefits">
          <div class="benefit">
            <h3>Chống vé giả</h3>
            <p>Mỗi vé là một token duy nhất trên blockchain, không thể sao chép hay làm giả.</p>
          </div>
          <div class="benefit">
            <h3>Hạn chế đầu cơ</h3>
            <p>Thiết lập trần giá khi chuyển nhượng — tối đa 110% giá gốc.</p>
          </div>
          <div class="benefit">
            <h3>Minh bạch</h3>
            <p>Kiểm tra nguồn gốc và toàn bộ lịch sử giao dịch của vé trực tiếp trên chuỗi.</p>
          </div>
        </section>

        <section>
          <div class="section-head">
            <div>
              <h2>Sự kiện nổi bật</h2>
              <p>Những sự kiện đang mở bán vé gần đây.</p>
            </div>
            <a href="#/events" class="btn btn-ghost btn-sm">Xem tất cả →</a>
          </div>
          <div id="home-events" class="grid-4">${skeletonCards(4)}</div>
        </section>
      </div>
    `;

    const evts = await fetchAllEvents();
    const list = document.getElementById("home-events");
    if (evts.length === 0) {
      list.innerHTML = emptyState("Chưa có sự kiện nào", isConfigured() ? "Hãy là người đầu tiên tạo sự kiện." : "Kết nối ví và cấu hình hợp đồng để xem sự kiện.");
      return;
    }
    const featured = evts.slice(-4).reverse();
    list.innerHTML = featured.map(eventCardHtml).join("");
  };

  function skeletonCards(n) {
    return Array.from({ length: n }).map(() => `
      <div class="event-card">
        <div class="event-card__img-wrap skel"></div>
        <div class="event-card__body">
          <div class="skel" style="height:12px;width:40%;margin-bottom:8px;"></div>
          <div class="skel" style="height:16px;width:80%;margin-bottom:8px;"></div>
          <div class="skel" style="height:12px;width:60%;"></div>
        </div>
      </div>`).join("");
  }

  function emptyState(title, body) {
    return `<div class="empty-state card" style="grid-column:1/-1;"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>`;
  }

  function eventCardHtml(evt) {
    const meta = getMeta(evt.id);
    const img = meta.image || stockImage(evt.id);
    const priceLabel = "Xem giá vé";
    return `
      <a class="event-card" href="#/events/${evt.id}">
        <div class="event-card__img-wrap"><img class="event-card__img" src="${img}" alt="" /></div>
        <div class="event-card__body">
          <div class="event-card__date">${fmtDate(evt.startTime)}</div>
          <div class="event-card__title">${escapeHtml(evt.name)}</div>
          <div class="event-card__meta">${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</div>
          <div class="event-card__price">${priceLabel}</div>
        </div>
      </a>`;
  }

  // ---------- Page: Events list ----------

  routes.events = async function () {
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h2>Sự kiện</h2><p>Tất cả sự kiện đang có trên FairTicket.</p></div>
        </div>
        <div id="events-grid" class="grid-4">${skeletonCards(8)}</div>
      </div>
    `;
    const evts = await fetchAllEvents();
    const grid = document.getElementById("events-grid");
    grid.innerHTML = evts.length
      ? evts.slice().reverse().map(eventCardHtml).join("")
      : emptyState("Chưa có sự kiện nào", isConfigured() ? "Hãy là người đầu tiên tạo sự kiện." : "Kết nối ví và cấu hình hợp đồng để xem sự kiện.");
  };

  // ---------- Page: Event detail ----------

  routes.eventDetail = async function (idStr) {
    const id = BigInt(idStr);
    $root().innerHTML = h`
      <div class="page container">
        <div style="margin-top: var(--sp-4);"><div class="skel" style="height:420px;border-radius:12px;"></div></div>
      </div>
    `;

    let evt;
    try {
      if (!isConfigured()) { await loadAbi(); }
      if (!isConfigured()) {
        evt = MOCK_EVENTS.find((e) => e.id === id);
        if (!evt) throw new Error("not-found");
      } else {
        const c = await ensureReadContract();
        if (!c) throw new Error("not-configured");
        evt = await c.events(id);
        if (!evt.organizer || evt.organizer === "0x0000000000000000000000000000000000000000") throw new Error("not-found");
      }
    } catch {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Không tìm thấy sự kiện</h3><p>Sự kiện #${idStr} không tồn tại hoặc chưa cấu hình kết nối hợp đồng.</p><a class="btn btn-secondary" href="#/events">← Quay lại danh sách</a></div></div>`;
      return;
    }

    const tickets = await fetchTicketsForEvent(id);
    const status = computeStatus(evt, tickets);
    const tiers = groupTiersByPrice(tickets);
    const meta = getMeta(id);
    const img = meta.image || stockImage(id);

    $root().innerHTML = h`
      <div class="page container">
        <div class="detail-layout">
          <div>
            <img class="cover-img" src="${img}" alt="" />
            <div class="gallery">
              <img src="${STOCK_IMAGES[0]}" alt="" /><img src="${STOCK_IMAGES[1]}" alt="" />
              <img src="${STOCK_IMAGES[2]}" alt="" /><img src="${STOCK_IMAGES[3]}" alt="" />
            </div>

            <div class="tabs" style="margin-top: var(--sp-5);">
              <button class="tab active" data-tab="intro">Giới thiệu</button>
              <button class="tab" data-tab="info">Thông tin chi tiết</button>
              <button class="tab" data-tab="terms">Điều khoản</button>
            </div>
            <div id="tab-intro">
              <p>${escapeHtml(meta.description || "Ban tổ chức chưa cập nhật mô tả chi tiết cho sự kiện này.")}</p>
            </div>
            <div id="tab-info" hidden>
              <div class="info-list">
                <div class="info-row"><div class="info-row__label">Thời gian</div><div class="info-row__value">${fmtDateTime(evt.startTime)}</div></div>
                <div class="info-row"><div class="info-row__label">Địa điểm</div><div class="info-row__value">${escapeHtml(meta.location || "Cập nhật sau")}</div></div>
                <div class="info-row"><div class="info-row__label">Đơn vị tổ chức</div><div class="info-row__value mono">${shortAddr(evt.organizer)}</div></div>
                <div class="info-row"><div class="info-row__label">Blockchain</div><div class="info-row__value">Ethereum Sepolia</div></div>
                <div class="info-row"><div class="info-row__label">Giới hạn chuyển nhượng</div><div class="info-row__value">Tối đa 110% giá gốc</div></div>
                <div class="info-row"><div class="info-row__label">Loại vé</div><div class="info-row__value">On-chain ticket (ProjectCore.sol)</div></div>
              </div>
            </div>
            <div id="tab-terms" hidden>
              <p class="text-secondary">Vé đã mua không hoàn tiền trực tiếp từ Ban tổ chức. Chủ vé có thể rao bán lại trong giới hạn giá cho phép của hệ thống. Mọi giao dịch được ghi nhận công khai trên blockchain.</p>
            </div>
          </div>

          <aside class="buy-panel">
            <h2>${escapeHtml(evt.name)}</h2>
            <div class="buy-panel__meta">
              <div class="buy-panel__meta-row">📅 ${fmtDate(evt.startTime)}</div>
              <div class="buy-panel__meta-row">🕒 ${new Date(Number(evt.startTime) * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
              <div class="buy-panel__meta-row">📍 ${escapeHtml(meta.location || "Cập nhật sau")}</div>
              <div class="buy-panel__meta-row"><span class="badge ${status.cls}">${status.label}</span></div>
            </div>

            <div class="card" style="padding: var(--sp-3) var(--sp-3) var(--sp-1);">
              <h3 style="margin-bottom:4px;">Hạng vé</h3>
              <div id="tier-list">${tierListHtml(tiers)}</div>
            </div>

            <button id="btn-go-checkout" class="btn btn-primary btn-block btn-lg" style="margin-top: var(--sp-3);" ${tiers.length === 0 ? "disabled" : ""}>
              ${tiers.length === 0 ? "Hết vé" : "Mua vé →"}
            </button>
          </aside>
        </div>
      </div>
    `;

    // Tabs
    $root().querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $root().querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        ["intro", "info", "terms"].forEach((k) => {
          document.getElementById("tab-" + k).hidden = k !== btn.dataset.tab;
        });
      });
    });

    // Tier selection state
    let selected = tiers[0] ? { index: 0, qty: 1 } : null;
    wireTierList(tiers, (s) => { selected = s; });

    document.getElementById("btn-go-checkout")?.addEventListener("click", () => {
      if (!selected) return;
      const tier = tiers[selected.index];
      const ids = tier.ticketIds.slice(0, selected.qty).map((x) => x.toString());
      window.location.hash = "#/checkout/" + id.toString() + "/" + ids.join(",");
    });
  };

  function tierListHtml(tiers) {
    if (tiers.length === 0) {
      return `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Hiện chưa có vé nào còn trống cho sự kiện này.</p>`;
    }
    return tiers.map((t, i) => `
      <div class="tier-row" data-tier="${i}">
        <div>
          <div class="tier-row__name">${t.name}</div>
          <div class="tier-row__sub">còn ${t.ticketIds.length} vé</div>
        </div>
        <div style="display:flex; align-items:center; gap: var(--sp-3);">
          <div class="tier-row__price tabular-nums">${fmtEth(t.price)} ETH</div>
          <div class="qty-control" data-qty-for="${i}" ${i === 0 ? "" : "hidden"}>
            <button type="button" data-qty-minus>−</button>
            <span data-qty-val>1</span>
            <button type="button" data-qty-plus>+</button>
          </div>
          <input type="radio" name="tier" value="${i}" ${i === 0 ? "checked" : ""} aria-label="Chọn ${t.name}" />
        </div>
      </div>
    `).join("");
  }

  function wireTierList(tiers, onChange) {
    const root = document.getElementById("tier-list");
    if (!root) return;
    root.querySelectorAll('input[name="tier"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const idx = Number(radio.value);
        root.querySelectorAll("[data-qty-for]").forEach((el) => { el.hidden = Number(el.dataset.qtyFor) !== idx; });
        onChange({ index: idx, qty: Number(root.querySelector(`[data-qty-for="${idx}"] [data-qty-val]`).textContent) });
      });
    });
    root.querySelectorAll("[data-qty-for]").forEach((wrap) => {
      const idx = Number(wrap.dataset.qtyFor);
      const max = tiers[idx].ticketIds.length;
      const valEl = wrap.querySelector("[data-qty-val]");
      wrap.querySelector("[data-qty-minus]").addEventListener("click", () => {
        const v = Math.max(1, Number(valEl.textContent) - 1);
        valEl.textContent = v;
        onChange({ index: idx, qty: v });
      });
      wrap.querySelector("[data-qty-plus]").addEventListener("click", () => {
        const v = Math.min(max, Number(valEl.textContent) + 1);
        valEl.textContent = v;
        onChange({ index: idx, qty: v });
      });
    });
  }

  // ---------- Page: Create event (wizard) ----------

  routes.create = function () {
    let step = 1;
    const data = { name: "", description: "", startTime: "", endTime: "", location: "", image: "", maxSupply: "", price: "" };

    function render() {
      $root().innerHTML = h`
        <div class="page container" style="max-width: 760px;">
          <h2 style="margin-top: var(--sp-5);">Tạo sự kiện mới</h2>
          <p class="text-secondary" style="margin-top:4px;">Bạn sẽ là Organizer của sự kiện này trên blockchain.</p>

          <div class="wizard-steps">
            ${wizardStepHtml(1, "Thông tin cơ bản", step)}
            <div class="wizard-divider"></div>
            ${wizardStepHtml(2, "Cấu hình vé", step)}
            <div class="wizard-divider"></div>
            ${wizardStepHtml(3, "Triển khai", step)}
          </div>

          <div class="wizard-panel" id="wizard-panel"></div>
        </div>
      `;
      renderStep();
    }

    function wizardStepHtml(n, label, current) {
      const cls = n < current ? "done" : n === current ? "active" : "";
      return `<div class="wizard-step ${cls}"><div class="wizard-step__dot">${n < current ? "✓" : n}</div><div class="wizard-step__label">${label}</div></div>`;
    }

    function renderStep() {
      const panel = document.getElementById("wizard-panel");
      if (step === 1) {
        panel.innerHTML = `
          <div class="field">
            <label for="f-name">Tên sự kiện</label>
            <input id="f-name" placeholder="VD: UEH Music Night 2026" value="${escapeHtml(data.name)}" />
          </div>
          <div class="field">
            <label for="f-desc">Mô tả</label>
            <textarea id="f-desc" placeholder="Giới thiệu ngắn về sự kiện...">${escapeHtml(data.description)}</textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-start">Thời gian bắt đầu</label>
              <input id="f-start" type="datetime-local" value="${data.startTime}" />
            </div>
            <div class="field">
              <label for="f-end">Thời gian kết thúc</label>
              <input id="f-end" type="datetime-local" value="${data.endTime}" />
            </div>
          </div>
          <div class="field">
            <label for="f-loc">Địa điểm</label>
            <input id="f-loc" placeholder="VD: Nhà văn hóa Huế" value="${escapeHtml(data.location)}" />
          </div>
          <div class="field">
            <label>Ảnh sự kiện</label>
            <div class="upload-box">Kéo-thả hoặc chọn ảnh (lưu cục bộ trong trình duyệt — chưa hỗ trợ upload lên server).<br/>
              <input type="file" id="f-image" accept="image/*" style="margin-top:8px;" />
            </div>
          </div>
          <div class="wizard-actions">
            <a href="#/my-events" class="btn btn-ghost">Hủy</a>
            <button id="btn-next-1" class="btn btn-primary">Tiếp tục →</button>
          </div>
        `;
        document.getElementById("btn-next-1").addEventListener("click", () => {
          data.name = document.getElementById("f-name").value.trim();
          data.description = document.getElementById("f-desc").value.trim();
          data.startTime = document.getElementById("f-start").value;
          data.endTime = document.getElementById("f-end").value;
          data.location = document.getElementById("f-loc").value.trim();
          if (!data.name || !data.startTime) { toast("Điền tên sự kiện và thời gian bắt đầu.", "error"); return; }
          const file = document.getElementById("f-image").files[0];
          const goNext = () => { step = 2; render(); };
          if (file) {
            const reader = new FileReader();
            reader.onload = () => { data.image = reader.result; goNext(); };
            reader.readAsDataURL(file);
          } else goNext();
        });
      } else if (step === 2) {
        panel.innerHTML = `
          <div class="field-row">
            <div class="field">
              <label for="f-supply">Tổng số vé tối đa</label>
              <input id="f-supply" type="number" min="1" step="1" placeholder="VD: 100" value="${escapeHtml(data.maxSupply)}" />
            </div>
            <div class="field">
              <label for="f-price">Giá vé (ETH)</label>
              <input id="f-price" type="number" min="0" step="0.0001" placeholder="VD: 0.02" value="${escapeHtml(data.price)}" />
              <p class="hint">Dùng khi phát hành vé ở bước sau (mỗi lần phát hành có thể đặt giá khác nhau để tạo nhiều hạng vé).</p>
            </div>
          </div>
          <div class="field">
            <label>Giới hạn bán lại (trần giá)</label>
            <input value="Tối đa 110% giá gốc" disabled />
            <p class="hint">Quy tắc cố định của hệ thống, áp dụng cho mọi sự kiện — không thể chỉnh ở bước này.</p>
          </div>
          <div class="wizard-actions">
            <button id="btn-back-2" class="btn btn-ghost">← Quay lại</button>
            <button id="btn-next-2" class="btn btn-primary">Tiếp tục →</button>
          </div>
        `;
        document.getElementById("btn-back-2").addEventListener("click", () => { step = 1; render(); });
        document.getElementById("btn-next-2").addEventListener("click", () => {
          data.maxSupply = document.getElementById("f-supply").value;
          data.price = document.getElementById("f-price").value;
          if (!data.maxSupply || Number(data.maxSupply) < 1) { toast("Nhập tổng số vé tối đa hợp lệ.", "error"); return; }
          step = 3; render();
        });
      } else {
        const startTs = data.startTime ? Math.floor(new Date(data.startTime).getTime() / 1000) : 0;
        panel.innerHTML = `
          <div class="card" style="padding: var(--sp-4);">
            <h3 style="margin-bottom: var(--sp-2);">Xem lại trước khi triển khai</h3>
            <div class="review-list">
              <div class="review-row"><span class="review-row__label">Tên sự kiện</span><span class="review-row__value">${escapeHtml(data.name)}</span></div>
              <div class="review-row"><span class="review-row__label">Thời gian</span><span class="review-row__value">${data.startTime ? new Date(data.startTime).toLocaleString("vi-VN") : "—"}</span></div>
              <div class="review-row"><span class="review-row__label">Địa điểm</span><span class="review-row__value">${escapeHtml(data.location || "—")}</span></div>
              <div class="review-row"><span class="review-row__label">Tổng số vé</span><span class="review-row__value">${escapeHtml(data.maxSupply)}</span></div>
              <div class="review-row"><span class="review-row__label">Giá vé khởi điểm</span><span class="review-row__value">${escapeHtml(data.price || "0")} ETH</span></div>
              <div class="review-row"><span class="review-row__label">Giới hạn bán lại</span><span class="review-row__value">110%</span></div>
              <div class="review-row"><span class="review-row__label">Organizer wallet</span><span class="review-row__value mono">${userAddress ? shortAddr(userAddress) : "Chưa kết nối ví"}</span></div>
              <div class="review-row"><span class="review-row__label">Network</span><span class="review-row__value">Ethereum Sepolia</span></div>
            </div>
          </div>
          ${!isConfigured() ? '<div class="banner">Chưa cấu hình <code>CONTRACT_ADDRESS</code>/<code>CONTRACT_ABI</code> trong <code>web/app.js</code>.</div>' : ""}
          <div class="wizard-actions">
            <button id="btn-back-3" class="btn btn-ghost">← Quay lại</button>
            <button id="btn-deploy" class="btn btn-dark btn-lg">Deploy & tạo sự kiện</button>
          </div>
        `;
        document.getElementById("btn-back-3").addEventListener("click", () => { step = 2; render(); });
        document.getElementById("btn-deploy").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
          requireWallet();
          requireContract();
          requireRightNetwork();
          const tx = await contract.createEvent(data.name, startTs, BigInt(data.maxSupply));
          toast("Đang xác nhận giao dịch…", "info");
          const receipt = await tx.wait();
          const log = receipt.logs.map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } }).find((l) => l && l.name === "EventCreated");
          const newId = log ? log.args.eventId : null;
          if (newId !== null) saveMeta(newId, { description: data.description, location: data.location, image: data.image });
          toast("Tạo sự kiện thành công!", "success");
          eventsCache = null;
          window.location.hash = newId !== null ? "#/events/" + newId.toString() : "#/my-events";
        }));
      }
    }

    render();
  };

  // ---------- Page: My events ----------

  routes.myEvents = async function () {
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h2>Vé &amp; Lịch sử</h2><p>Sự kiện bạn tổ chức và vé bạn sở hữu, tất cả đọc trực tiếp từ blockchain.</p></div>
          <a href="#/create" class="btn btn-primary">+ Tạo sự kiện mới</a>
        </div>

        <div class="tabs">
          <button class="tab active" data-subtab="organizer">Sự kiện của tôi</button>
          <button class="tab" data-subtab="tickets">Vé của tôi</button>
        </div>

        <div id="panel-organizer">
          <div class="filter-row">
            <button class="chip active" data-f="all">Tất cả</button>
            <button class="chip" data-f="upcoming">Sắp diễn ra</button>
            <button class="chip" data-f="selling">Đang bán vé</button>
            <button class="chip" data-f="ended">Đã kết thúc</button>
          </div>
          <div class="card" id="my-events-list" style="padding: var(--sp-2) var(--sp-3);">
            <p class="text-secondary" style="padding: var(--sp-4) 0;">Đang tải…</p>
          </div>
        </div>

        <div id="panel-tickets" hidden>
          <div class="card" style="padding: var(--sp-3) var(--sp-4); margin-bottom: var(--sp-4); display:flex; align-items:center; justify-content:space-between; gap: var(--sp-3); flex-wrap: wrap;">
            <div>
              <div class="text-sm text-secondary">Tiền chờ rút (tiền bán vé, kể cả bán lại)</div>
              <div id="pending-balance" class="h3 tabular-nums" style="margin-top:4px;">— ETH</div>
            </div>
            <button id="btn-withdraw" class="btn btn-dark">Rút tiền về ví</button>
          </div>
          <div class="card" id="my-tickets-list" style="padding: var(--sp-2) var(--sp-3); margin-bottom: var(--sp-4);">
            <p class="text-secondary" style="padding: var(--sp-4) 0;">Đang tải…</p>
          </div>
          <h3 style="margin-bottom: var(--sp-2);">Lịch sử giao dịch</h3>
          <div class="card" id="history-list" style="padding: var(--sp-2) var(--sp-3);">
            <p class="text-secondary" style="padding: var(--sp-4) 0;">Đang tải…</p>
          </div>
        </div>
      </div>
    `;

    $root().querySelectorAll('[data-subtab]').forEach((btn) => {
      btn.addEventListener("click", () => {
        $root().querySelectorAll('[data-subtab]').forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("panel-organizer").hidden = btn.dataset.subtab !== "organizer";
        document.getElementById("panel-tickets").hidden = btn.dataset.subtab !== "tickets";
      });
    });

    if (!userAddress) {
      document.getElementById("my-events-list").innerHTML = `<div class="empty-state"><h3>Chưa kết nối ví</h3><p>Kết nối ví để xem sự kiện bạn đã tạo.</p></div>`;
      document.getElementById("my-tickets-list").innerHTML = `<div class="empty-state"><h3>Chưa kết nối ví</h3><p>Kết nối ví để xem vé bạn sở hữu.</p></div>`;
      return;
    }

    renderMyTickets();

    const all = await fetchAllEvents();
    const mine = all.filter((e) => e.organizer.toLowerCase() === userAddress.toLowerCase());
    const rows = [];
    for (const evt of mine) {
      const tickets = await fetchTicketsForEvent(evt.id);
      rows.push({ evt, tickets, status: computeStatus(evt, tickets) });
    }

    function renderRows(filter) {
      const list = document.getElementById("my-events-list");
      const map = { upcoming: "Sắp diễn ra", selling: "Đang bán vé", ended: "Đã kết thúc" };
      const filtered = filter === "all" ? rows : rows.filter((r) => r.status.label === map[filter] || (filter === "selling" && r.status.label === "Đã bán hết"));
      if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><h3>Chưa có sự kiện nào</h3><p>Tạo sự kiện đầu tiên của bạn.</p></div>`;
        return;
      }
      list.innerHTML = filtered.map(({ evt, status }) => {
        const meta = getMeta(evt.id);
        return `
          <div class="event-row">
            <img class="event-row__thumb" src="${meta.image || stockImage(evt.id)}" alt="" />
            <div class="event-row__main">
              <div class="event-row__title">${escapeHtml(evt.name)}</div>
              <div class="event-row__meta">${fmtDate(evt.startTime)} · ${escapeHtml(meta.location || "Chưa có địa điểm")} · ${evt.ticketsMinted}/${evt.maxSupply} vé đã phát hành</div>
            </div>
            <div class="event-row__actions">
              <span class="badge ${status.cls}">${status.label}</span>
              <a href="#/events/${evt.id}" class="btn btn-secondary btn-sm">Quản lý</a>
              <button class="btn btn-ghost btn-sm" data-mint="${evt.id}" aria-label="Phát hành thêm vé">Phát hành vé</button>
            </div>
          </div>`;
      }).join("");

      list.querySelectorAll("[data-mint]").forEach((btn) => {
        btn.addEventListener("click", () => mintPrompt(BigInt(btn.dataset.mint)));
      });
    }

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderRows(chip.dataset.f);
      });
    });

    renderRows("all");
  };

  async function renderMyTickets() {
    const c = await ensureReadContract();
    const balEl = document.getElementById("pending-balance");
    const listEl = document.getElementById("my-tickets-list");
    const histEl = document.getElementById("history-list");
    if (!c || !userAddress) return;

    const pending = await c.pendingWithdrawals(userAddress);
    balEl.textContent = fmtEth(pending) + " ETH";

    document.getElementById("btn-withdraw").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      requireWallet();
      requireContract();
      const tx = await contract.withdrawProceeds();
      toast("Đang xác nhận giao dịch…", "info");
      await tx.wait();
      toast("Đã rút tiền về ví.", "success");
      await renderMyTickets();
    }));

    const ticketCount = await c.nextTicketId();
    const owned = [];
    for (let i = 0n; i < ticketCount; i++) {
      const t = await c.tickets(i);
      if (t.owner.toLowerCase() === userAddress.toLowerCase()) owned.push(Object.assign({ id: i }, t));
    }

    if (owned.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><h3>Chưa sở hữu vé nào</h3><p>Mua vé ở trang Sự kiện để thấy vé tại đây.</p></div>`;
    } else {
      const rows = [];
      for (const t of owned) {
        const evt = await c.events(t.eventId);
        rows.push(`
          <div class="event-row">
            <div class="event-row__main">
              <div class="event-row__title">${escapeHtml(evt.name)} <span class="text-tertiary">· Vé #${t.id}</span></div>
              <div class="event-row__meta">Giá gốc ${fmtEth(t.originalPrice)} ETH ${t.forSale ? "· đang rao bán " + fmtEth(t.resalePrice) + " ETH" : ""}</div>
            </div>
            <div class="event-row__actions">
              ${t.forSale
                ? '<span class="badge badge-primary">Đang rao bán</span>'
                : `<button class="btn btn-secondary btn-sm" data-resell="${t.id}" data-price="${t.originalPrice}">Rao bán lại</button>`}
            </div>
          </div>`);
      }
      listEl.innerHTML = rows.join("");
      listEl.querySelectorAll("[data-resell]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const max = (BigInt(btn.dataset.price) * 11000n) / 10000n;
          const input = window.prompt(`Giá rao bán (ETH), tối đa ${fmtEth(max)} ETH:`);
          if (!input) return;
          try {
            requireWallet(); requireContract();
            const tx = await contract.listForResale(BigInt(btn.dataset.resell), ethers.parseEther(input));
            toast("Đang xác nhận giao dịch…", "info");
            await tx.wait();
            toast("Đã rao bán vé.", "success");
            renderMyTickets();
          } catch (err) { toast(friendlyError(err), "error"); }
        });
      });
    }

    // History: events touching this wallet
    const filters = [
      { name: "Mua vé", filter: contract?.filters?.TicketBought(null, userAddress) },
      { name: "Nhận tiền bán vé", filter: contract?.filters?.TicketResold(null, userAddress, null) },
      { name: "Mua lại vé", filter: contract?.filters?.TicketResold(null, null, userAddress) },
      { name: "Rao bán vé", filter: contract?.filters?.TicketListedForResale(null, userAddress) },
      { name: "Rút tiền", filter: contract?.filters?.ProceedsWithdrawn(userAddress) },
    ].filter((f) => f.filter);

    if (!contract) {
      histEl.innerHTML = `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Kết nối ví để xem lịch sử.</p>`;
      return;
    }
    let events = [];
    for (const { name, filter } of filters) {
      const logs = await contract.queryFilter(filter, 0, "latest");
      events = events.concat(logs.map((l) => ({ name, log: l })));
    }
    events.sort((a, b) => b.log.blockNumber - a.log.blockNumber);
    histEl.innerHTML = events.length
      ? events.slice(0, 20).map(({ name, log }) => `
          <div class="event-row">
            <div class="event-row__main"><div class="event-row__title">${name}</div></div>
            <a class="mono text-sm" target="_blank" rel="noopener" href="https://sepolia.etherscan.io/tx/${log.transactionHash}">${log.transactionHash.slice(0, 10)}…</a>
          </div>`).join("")
      : `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Chưa có giao dịch nào.</p>`;
  }

  async function mintPrompt(eventId) {
    const price = window.prompt("Giá vé muốn phát hành (ETH), ví dụ 0.02:");
    if (!price) return;
    try {
      requireWallet();
      requireContract();
      const tx = await contract.mintTicket(eventId, ethers.parseEther(price));
      toast("Đang xác nhận giao dịch…", "info");
      await tx.wait();
      toast("Phát hành vé thành công.", "success");
      eventsCache = null;
      route();
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  // ---------- Page: Checkout ----------

  routes.checkout = async function (eventIdStr, idsStr) {
    const eventId = BigInt(eventIdStr);
    const ticketIds = (idsStr || "").split(",").filter(Boolean).map((x) => BigInt(x));

    $root().innerHTML = `<div class="page container"><div class="checkout-wrap"><div class="skel" style="height:300px;"></div></div></div>`;

    if (!isConfigured()) { await loadAbi(); }
    const demo = !isConfigured();
    const evt = demo ? MOCK_EVENTS.find((e) => e.id === eventId) : await (await ensureReadContract()).events(eventId);
    const meta = getMeta(eventId);
    if (ticketIds.length === 0) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Chưa chọn vé</h3><a class="btn btn-secondary" href="#/events/${eventId}">← Quay lại sự kiện</a></div></div>`;
      return;
    }
    const firstTickets = await fetchTicketsForEvent(eventId);
    const first = demo ? firstTickets.find((t) => t.id === ticketIds[0]) : await (await ensureReadContract()).tickets(ticketIds[0]);
    const unitPrice = first.originalPrice;
    const total = unitPrice * BigInt(ticketIds.length);

    $root().innerHTML = h`
      <div class="page container">
        <div class="checkout-wrap">
          <div class="checkout-steps"><b>Thông tin vé</b> → Xác nhận → Thanh toán</div>

          <div class="card mini-event-card">
            <img src="${meta.image || stockImage(eventId)}" alt="" />
            <div>
              <div style="font-weight:600; font-size:14px;">${escapeHtml(evt.name)}</div>
              <div class="text-secondary text-sm">${fmtDate(evt.startTime)} · ${escapeHtml(meta.location || "Cập nhật sau")}</div>
            </div>
          </div>

          <div class="card" style="padding: var(--sp-4);">
            <div class="checkout-row"><span>Hạng vé</span><span>Vé #${ticketIds.map(String).join(", #")}</span></div>
            <div class="checkout-row"><span>Đơn giá</span><span class="tabular-nums">${fmtEth(unitPrice)} ETH</span></div>
            <div class="checkout-row"><span>Số lượng</span><span class="tabular-nums">${ticketIds.length}</span></div>
            <div class="checkout-divider"></div>
            <div class="checkout-total"><span>Tổng cộng</span><span class="tabular-nums">${fmtEth(total)} ETH</span></div>
          </div>

          ${!isConfigured() ? '<div class="banner">Chưa cấu hình hợp đồng — không thể thanh toán thật.</div>' : ""}

          <button id="btn-pay" class="btn btn-primary btn-block btn-lg" style="margin-top: var(--sp-4);">Tiếp tục thanh toán →</button>
          <a href="#/events/${eventId}" class="btn btn-ghost btn-block" style="margin-top: var(--sp-2);">← Quay lại</a>
        </div>
      </div>
    `;

    document.getElementById("btn-pay").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      requireWallet();
      requireContract();
      requireRightNetwork();
      for (let i = 0; i < ticketIds.length; i++) {
        toast(`Đang xác nhận vé ${i + 1}/${ticketIds.length}…`, "info");
        const tx = await contract.buyTicket(ticketIds[i], { value: unitPrice });
        await tx.wait();
      }
      toast("Mua vé thành công! Xem trong “Vé & lịch sử”.", "success");
      eventsCache = null;
      window.location.hash = "#/events/" + eventId.toString();
    }));
  };

  // ---------- Boot ----------

  function initNavClicks() {
    document.getElementById("btn-connect").onclick = (e) => withBusy(e.currentTarget, connectWallet);
  }

  window.addEventListener("DOMContentLoaded", async () => {
    initNavClicks();
    await loadAbi();
    const etherscanLink = document.getElementById("etherscan-link");
    if (etherscanLink && isConfigured()) {
      etherscanLink.href = "https://sepolia.etherscan.io/address/" + CONTRACT_ADDRESS;
    }
    if (!isConfigured()) {
      const banner = document.getElementById("global-banner");
      if (banner) {
        banner.hidden = false;
        banner.innerHTML = `Chưa cấu hình kết nối hợp đồng. Điền <code>CONTRACT_ADDRESS</code> ở đầu <code>web/app.js</code> sau khi triển khai <code>ProjectCore.sol</code> lên Sepolia.`;
      }
    }
    route();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  });
})();
