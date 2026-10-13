/* ==========================================================================
   FairTicket — SPA app (v2: public mint theo hang ve + check-in)
   Vanilla JS, hash router, no build step, no backend.
   Reads/writes contracts/project/ProjectCore.sol directly via ethers.js.

   Thay doi lon so voi v1:
   - Event khong con maxSupply/price rieng. Organizer tao Tier (gia + tong
     cung) cho event, AI CUNG tu mintTicket(tierId) de nhan ve truc tiep -
     khong con buyTicket(ticketId) tren ve co san.
   - Them checkIn(ticketId): chi Organizer, 1 lan, khoa resale sau do.
   - QR ve = ma hoa ticketId (MVP tinh, khong chong chup man hinh chia se -
     xem ghi chu "Ngoai pham vi" trong docs/SPEC.md).

   Honesty note ve du lieu KHONG nam tren chain:
   mo ta (description), dia diem, anh bia su kien van chi luu trong
   localStorage trinh duyet nay (khong co truong tren contract) - xem
   README.md.
   ========================================================================== */

(function () {
  "use strict";

  // ---------- Config ----------

  const CONTRACT_ADDRESS = "0x0f96cafe4C603D706c786C503A5c903090706916"; // ProjectCore.sol v2 (public mint + check-in) da deploy tren Sepolia
  let CONTRACT_ABI = null; // tự nạp từ ./ProjectCore.abi.json
  const SEPOLIA_CHAIN_ID = 11155111n;

  const STOCK_IMAGES = [
    "./assets/event-conference.jpg",
    "./assets/event-festival.jpg",
    "./assets/event-jazz.jpg",
    "./assets/hero.jpg",
  ];

  const ERROR_MESSAGES = {
    EventDoesNotExist: "Sự kiện này không tồn tại.",
    TierDoesNotExist: "Hạng vé này không tồn tại.",
    TicketDoesNotExist: "Vé này không tồn tại.",
    NotOrganizer: "Chỉ Organizer của sự kiện mới làm được việc này.",
    TierSupplyReached: "Hạng vé này đã bán hết.",
    IncorrectPayment: "Số ETH gửi không đúng với giá niêm yết.",
    WithdrawFailed: "Rút tiền thất bại, thử lại sau.",
    InvalidMaxSupply: "Tổng số vé của hạng phải lớn hơn 0.",
    InvalidPrice: "Giá vé phải lớn hơn 0.",
    NothingToWithdraw: "Bạn chưa có khoản tiền nào để rút.",
    NotTicketOwner: "Bạn không phải chủ sở hữu vé này.",
    ResalePriceTooHigh: "Giá rao bán vượt quá 110% giá gốc, không được phép.",
    TicketNotForSale: "Vé này hiện không được rao bán.",
    ZeroResalePrice: "Giá rao bán phải lớn hơn 0.",
    TicketAlreadyCheckedIn: "Vé này đã được check-in rồi.",
    TicketCheckedInCannotResell: "Vé đã check-in, không thể rao bán lại.",
  };

  // ---------- Demo data mode ----------
  // Khi CHUA cau hinh CONTRACT_ADDRESS/ABI that, trang dung du lieu minh hoa
  // co dinh de nhom xem/trinh bay tron ven giao dien truoc khi deploy.
  const DAY = 86400;
  const now = Math.floor(Date.now() / 1000);
  const MOCK_EVENTS = [
    { id: 0n, name: "UEH Music Night 2026", startTime: BigInt(now + 20 * DAY), organizer: "0x4f99DacFdFec762beFe11F98E5bA0a229297a04e", tierCount: 3n },
    { id: 1n, name: "Tech Conference Huế 2026", startTime: BigInt(now + 6 * DAY), organizer: "0x4f99DacFdFec762beFe11F98E5bA0a229297a04e", tierCount: 1n },
    { id: 2n, name: "Jazz Night Downtown", startTime: BigInt(now - 3 * DAY), organizer: "0x1234567890123456789012345678901234567890", tierCount: 1n },
  ];
  const MOCK_META = {
    0: { location: "Nhà văn hóa Huế", description: "Đêm nhạc sinh viên UEH quy tụ các ban nhạc indie nổi bật của trường, mở màn mùa lễ hội 2026.", image: "./assets/hero.jpg" },
    1: { location: "Trung tâm Hội nghị Quốc gia", description: "Hội nghị công nghệ thường niên với các diễn giả từ cộng đồng blockchain Việt Nam.", image: "./assets/event-conference.jpg" },
    2: { location: "Downtown Jazz Club", description: "Đêm nhạc jazz thân mật với ban nhạc khách mời quốc tế.", image: "./assets/event-jazz.jpg" },
  };
  function ethp(s) { return ethers.parseEther(s); }
  const MOCK_TIERS = [
    { id: 0n, eventId: 0n, name: "Standard", price: ethp("0.02"), maxSupply: 50n, minted: 38n },
    { id: 1n, eventId: 0n, name: "Premium", price: ethp("0.035"), maxSupply: 30n, minted: 30n },
    { id: 2n, eventId: 0n, name: "VIP", price: ethp("0.06"), maxSupply: 10n, minted: 4n },
    { id: 3n, eventId: 1n, name: "Standard", price: ethp("0.05"), maxSupply: 50n, minted: 50n },
    { id: 4n, eventId: 2n, name: "Standard", price: ethp("0.03"), maxSupply: 20n, minted: 20n },
  ];
  function buildMockTickets() {
    const rows = [];
    let id = 0n;
    for (const tier of MOCK_TIERS) {
      const evt = MOCK_EVENTS.find((e) => e.id === tier.eventId);
      for (let i = 0n; i < tier.minted; i++) {
        rows.push({ id: id++, eventId: tier.eventId, tierId: tier.id, owner: evt.organizer, originalPrice: tier.price, resalePrice: 0n, forSale: false, checkedIn: false });
      }
    }
    return rows;
  }
  let MOCK_TICKETS = null;

  // ---------- State ----------

  let provider, signer, contract, readContract, userAddress, chainId;
  let eventsCache = null;
  let tiersCache = null;

  let renderToken = 0;

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
    try { return ethers.formatEther(wei); } catch { return "0"; }
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
    if (raw.toLowerCase().includes("chưa cấu hình") || raw.toLowerCase().includes("chưa kết nối")) return raw;
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

  async function withBusy(btn, fn, opts) {
    if (!btn) return fn();
    const keepContentOnSuccess = opts && opts.keepContentOnSuccess;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner' + (btn.classList.contains("btn-secondary") || btn.classList.contains("btn-ghost") ? " spinner-dark" : "") + '"></span> ' + original.replace(/<span class="spinner.*?<\/span>\s*/, "");
    try {
      await fn();
      btn.disabled = false;
      if (!keepContentOnSuccess) btn.innerHTML = original;
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), "error");
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  /// Modal nhap gia (ETH) - thay cho window.prompt() (de bi bo sot/chan).
  function promptPriceModal({ title, label, hint, confirmText }) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true">
          <h3>${escapeHtml(title)}</h3>
          <div class="field" style="margin-top: var(--sp-3); margin-bottom: 0;">
            <label for="modal-price-input">${escapeHtml(label)}</label>
            <input id="modal-price-input" type="number" min="0" step="0.0001" placeholder="VD: 0.02" />
            ${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ""}
          </div>
          <div class="wizard-actions" style="margin-top: var(--sp-4); padding-top: 0; border-top: none;">
            <button type="button" class="btn btn-ghost" data-action="cancel">Hủy</button>
            <button type="button" class="btn btn-primary" data-action="confirm">${escapeHtml(confirmText || "Xác nhận")}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector("#modal-price-input");
      input.focus();
      function close(value) { overlay.remove(); resolve(value); }
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
      overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => close(null));
      overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => close(input.value || null));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") close(input.value || null);
        if (e.key === "Escape") close(null);
      });
    });
  }

  /// Modal tao hang ve moi (ten + gia + tong cung).
  function promptTierModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true">
          <h3>Tạo hạng vé mới</h3>
          <div class="field" style="margin-top: var(--sp-3);">
            <label for="modal-tier-name">Tên hạng vé</label>
            <input id="modal-tier-name" placeholder="VD: Standard, VIP" />
          </div>
          <div class="field-row">
            <div class="field" style="margin-bottom: 0;">
              <label for="modal-tier-price">Giá (ETH)</label>
              <input id="modal-tier-price" type="number" min="0" step="0.0001" placeholder="VD: 0.02" />
            </div>
            <div class="field" style="margin-bottom: 0;">
              <label for="modal-tier-supply">Tổng số vé</label>
              <input id="modal-tier-supply" type="number" min="1" step="1" placeholder="VD: 50" />
            </div>
          </div>
          <div class="wizard-actions" style="margin-top: var(--sp-4); padding-top: 0; border-top: none;">
            <button type="button" class="btn btn-ghost" data-action="cancel">Hủy</button>
            <button type="button" class="btn btn-primary" data-action="confirm">Tạo hạng vé</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector("#modal-tier-name").focus();
      function close(value) { overlay.remove(); resolve(value); }
      function submit() {
        const name = overlay.querySelector("#modal-tier-name").value.trim();
        const price = overlay.querySelector("#modal-tier-price").value;
        const supply = overlay.querySelector("#modal-tier-supply").value;
        if (!name || !price || !supply) return;
        close({ name, price, supply });
      }
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
      overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => close(null));
      overlay.querySelector('[data-action="confirm"]').addEventListener("click", submit);
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") close(null);
      });
    });
  }

  // ---------- QR (hien thi ve) ----------

  /// Ve QR don gian ngay trong canvas, ma hoa 1 chuoi ngan (ticketId).
  /// Dung thu vien qrcode-generator (nho, khong phu thuoc gi khac).
  function renderQrInto(container, text) {
    if (!window.qrcode) { container.textContent = "(Không tải được thư viện QR)"; return; }
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    container.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2 });
  }

  // ---------- Local metadata (non-chain fields) ----------

  function metaKey() { return "fairticket:meta:" + CONTRACT_ADDRESS.toLowerCase(); }
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

  async function setupWalletSession() {
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    const net = await provider.getNetwork();
    chainId = net.chainId;
    if (isConfigured()) {
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      readContract = contract;
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      toast("Chưa cài MetaMask (hoặc ví tương thích) trên trình duyệt này.", "error");
      return;
    }
    await loadAbi();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await setupWalletSession();
    renderHeader();
    toast("Đã kết nối ví.", "success");
    route();
  }

  async function trySilentReconnect() {
    if (!window.ethereum) return;
    try {
      await loadAbi();
      provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);
      if (!accounts || accounts.length === 0) return;
      await setupWalletSession();
      renderHeader();
    } catch (err) {
      console.warn("Khong tu ket noi lai duoc vi:", err);
    }
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
      out.push({ id: i, name: e.name, startTime: e.startTime, organizer: e.organizer, tierCount: e.tierCount });
    }
    eventsCache = out;
    return out;
  }

  async function fetchAllTiers(force) {
    if (!isConfigured()) return MOCK_TIERS;
    const c = await ensureReadContract();
    if (!c) return [];
    if (tiersCache && !force) return tiersCache;
    const count = await c.nextTierId();
    const out = [];
    for (let i = 0n; i < count; i++) {
      const t = await c.tiers(i);
      out.push({ id: i, eventId: t.eventId, name: t.name, price: t.price, maxSupply: t.maxSupply, minted: t.minted });
    }
    tiersCache = out;
    return out;
  }

  async function fetchTiersForEvent(eventId) {
    const all = await fetchAllTiers();
    return all.filter((t) => t.eventId === eventId);
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

  function computeStatus(evt, tiers) {
    const nowTs = Math.floor(Date.now() / 1000);
    if (nowTs >= Number(evt.startTime)) return { label: "Đã kết thúc", cls: "badge-neutral" };
    if (tiers.length === 0) return { label: "Sắp diễn ra", cls: "badge-warning" };
    const totalSupply = tiers.reduce((s, t) => s + t.maxSupply, 0n);
    const totalMinted = tiers.reduce((s, t) => s + t.minted, 0n);
    if (totalMinted < totalSupply) return { label: "Đang bán vé", cls: "badge-success" };
    return { label: "Đã bán hết", cls: "badge-warning" };
  }

  // ---------- Router ----------

  const routes = {};
  function route() {
    renderToken++;
    const hash = window.location.hash.slice(1) || "/";
    const parts = hash.split("/").filter(Boolean);
    renderHeader();
    if (parts.length === 0) return routes.home();
    if (parts[0] === "events" && parts[1]) return routes.eventDetail(parts[1]);
    if (parts[0] === "events") return routes.events();
    if (parts[0] === "create") return routes.create();
    if (parts[0] === "my-events") return routes.myEvents();
    if (parts[0] === "checkout" && parts[1] && parts[2]) return routes.checkout(parts[1], parts[2], parts[3] || "1");
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
      btn.onclick = (e) => withBusy(e.currentTarget, connectWallet, { keepContentOnSuccess: true });
    }
  }

  // ---------- Page: Home ----------

  routes.home = async function () {
    const myToken = renderToken;
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
    if (myToken !== renderToken) return;
    const list = document.getElementById("home-events");
    if (!list) return;
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
    return `
      <a class="event-card" href="#/events/${evt.id}">
        <div class="event-card__img-wrap"><img class="event-card__img" src="${img}" alt="" /></div>
        <div class="event-card__body">
          <div class="event-card__date">${fmtDate(evt.startTime)}</div>
          <div class="event-card__title">${escapeHtml(evt.name)}</div>
          <div class="event-card__meta">${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</div>
          <div class="event-card__price">Xem giá vé</div>
        </div>
      </a>`;
  }

  // ---------- Page: Events list ----------

  routes.events = async function () {
    const myToken = renderToken;
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h2>Sự kiện</h2><p>Tất cả sự kiện đang có trên FairTicket.</p></div>
        </div>
        <div id="events-grid" class="grid-4">${skeletonCards(8)}</div>
      </div>
    `;
    const evts = await fetchAllEvents();
    if (myToken !== renderToken) return;
    const grid = document.getElementById("events-grid");
    if (!grid) return;
    grid.innerHTML = evts.length
      ? evts.slice().reverse().map(eventCardHtml).join("")
      : emptyState("Chưa có sự kiện nào", isConfigured() ? "Hãy là người đầu tiên tạo sự kiện." : "Kết nối ví và cấu hình hợp đồng để xem sự kiện.");
  };

  // ---------- Page: Event detail ----------

  routes.eventDetail = async function (idStr) {
    const myToken = renderToken;
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
      if (myToken !== renderToken) return;
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Không tìm thấy sự kiện</h3><p>Sự kiện #${idStr} không tồn tại hoặc chưa cấu hình kết nối hợp đồng.</p><a class="btn btn-secondary" href="#/events">← Quay lại danh sách</a></div></div>`;
      return;
    }
    if (myToken !== renderToken) return;

    const tiers = await fetchTiersForEvent(id);
    if (myToken !== renderToken) return;
    const status = computeStatus(evt, tiers);
    const meta = getMeta(id);
    const img = meta.image || stockImage(id);
    const isDemo = !isConfigured();
    const isOrganizer = userAddress && evt.organizer && userAddress.toLowerCase() === evt.organizer.toLowerCase();

    $root().innerHTML = h`
      <div class="page container">
        <div class="detail-layout">
          <div>
            <img class="cover-img" src="${img}" alt="" />
            ${isDemo ? `
            <div class="gallery">
              <img src="${STOCK_IMAGES[0]}" alt="" /><img src="${STOCK_IMAGES[1]}" alt="" />
              <img src="${STOCK_IMAGES[2]}" alt="" /><img src="${STOCK_IMAGES[3]}" alt="" />
            </div>` : ""}

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
              <p class="text-secondary">Vé mint trực tiếp từ hợp đồng, không hoàn tiền. Chủ vé có thể rao bán lại trong giới hạn giá cho phép, trừ khi vé đã được check-in tại sự kiện. Mọi giao dịch được ghi nhận công khai trên blockchain.</p>
            </div>

            ${isOrganizer ? organizerPanelHtml(id, tiers) : ""}
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
              ${tiers.length === 0 ? "Chưa có hạng vé" : "Mua vé →"}
            </button>
          </aside>
        </div>
      </div>
    `;

    $root().querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $root().querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        ["intro", "info", "terms"].forEach((k) => {
          const el = document.getElementById("tab-" + k);
          if (el) el.hidden = k !== btn.dataset.tab;
        });
      });
    });

    let selected = tiers[0] ? { index: 0, qty: 1 } : null;
    wireTierList(tiers, (s) => { selected = s; });

    document.getElementById("btn-go-checkout")?.addEventListener("click", () => {
      if (!selected) return;
      const tier = tiers[selected.index];
      window.location.hash = "#/checkout/" + id.toString() + "/" + tier.id.toString() + "/" + selected.qty;
    });

    if (isOrganizer) wireOrganizerPanel(id);
  };

  function tierListHtml(tiers) {
    if (tiers.length === 0) {
      return `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Sự kiện này chưa có hạng vé nào.</p>`;
    }
    return tiers.map((t, i) => {
      const remaining = t.maxSupply - t.minted;
      return `
      <div class="tier-row" data-tier="${i}">
        <div>
          <div class="tier-row__name">${escapeHtml(t.name)}</div>
          <div class="tier-row__sub">còn ${remaining} / ${t.maxSupply} vé</div>
        </div>
        <div style="display:flex; align-items:center; gap: var(--sp-3);">
          <div class="tier-row__price tabular-nums">${fmtEth(t.price)} ETH</div>
          ${remaining > 0n ? `
          <div class="qty-control" data-qty-for="${i}" ${i === 0 ? "" : "hidden"}>
            <button type="button" data-qty-minus>−</button>
            <span data-qty-val>1</span>
            <button type="button" data-qty-plus>+</button>
          </div>
          <input type="radio" name="tier" value="${i}" ${i === 0 ? "checked" : ""} aria-label="Chọn ${escapeHtml(t.name)}" />
          ` : `<span class="badge badge-neutral">Hết vé</span>`}
        </div>
      </div>
    `;
    }).join("");
  }

  function wireTierList(tiers, onChange) {
    const root = document.getElementById("tier-list");
    if (!root) return;
    root.querySelectorAll('input[name="tier"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const idx = Number(radio.value);
        root.querySelectorAll("[data-qty-for]").forEach((el) => { el.hidden = Number(el.dataset.qtyFor) !== idx; });
        const valEl = root.querySelector(`[data-qty-for="${idx}"] [data-qty-val]`);
        onChange({ index: idx, qty: valEl ? Number(valEl.textContent) : 1 });
      });
    });
    root.querySelectorAll("[data-qty-for]").forEach((wrap) => {
      const idx = Number(wrap.dataset.qtyFor);
      const max = tiers[idx].maxSupply - tiers[idx].minted;
      const valEl = wrap.querySelector("[data-qty-val]");
      wrap.querySelector("[data-qty-minus]").addEventListener("click", () => {
        const v = Math.max(1, Number(valEl.textContent) - 1);
        valEl.textContent = v;
        onChange({ index: idx, qty: v });
      });
      wrap.querySelector("[data-qty-plus]").addEventListener("click", () => {
        const v = Math.min(Number(max), Number(valEl.textContent) + 1);
        valEl.textContent = v;
        onChange({ index: idx, qty: v });
      });
    });
  }

  function organizerPanelHtml(eventId, tiers) {
    return `
      <div class="card" style="padding: var(--sp-4); margin-top: var(--sp-5);">
        <div class="section-head" style="margin-bottom: var(--sp-3);">
          <div><h3>Quản lý sự kiện (chỉ Organizer thấy)</h3><p class="text-secondary text-sm">Thêm hạng vé mới hoặc check-in vé tại cửa.</p></div>
          <button id="btn-add-tier" class="btn btn-secondary btn-sm">+ Thêm hạng vé</button>
        </div>

        <div class="field" style="margin-top: var(--sp-3);">
          <label for="checkin-ticket-id">Check-in vé (nhập mã vé từ QR khách xuất trình)</label>
          <div style="display:flex; gap: var(--sp-2);">
            <input id="checkin-ticket-id" type="number" min="0" step="1" placeholder="VD: 7" style="flex:1;" />
            <button id="btn-checkin" class="btn btn-dark">Check-in</button>
          </div>
        </div>
        <div id="checkin-result" style="margin-top: var(--sp-2);"></div>
      </div>
    `;
  }

  function wireOrganizerPanel(eventId) {
    document.getElementById("btn-add-tier")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      const result = await promptTierModal();
      if (!result) return;
      requireWallet();
      requireContract();
      requireRightNetwork();
      const tx = await contract.createTier(eventId, result.name, ethers.parseEther(result.price), BigInt(result.supply));
      toast("Đang xác nhận giao dịch…", "info");
      await tx.wait();
      toast("Đã tạo hạng vé mới.", "success");
      tiersCache = null;
      route();
    }));

    document.getElementById("btn-checkin")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      const idInput = document.getElementById("checkin-ticket-id").value;
      if (idInput === "") { toast("Nhập mã vé cần check-in.", "error"); return; }
      requireWallet();
      requireContract();
      requireRightNetwork();
      const ticketId = BigInt(idInput);
      const c = await ensureReadContract();
      const t = await c.tickets(ticketId);
      const resultEl = document.getElementById("checkin-result");
      if (t.checkedIn) {
        resultEl.innerHTML = `<div class="banner" style="background:var(--danger-bg); color:var(--danger-text);">Vé #${ticketId} đã được check-in từ trước (chủ vé: <span class="mono">${shortAddr(t.owner)}</span>).</div>`;
        return;
      }
      const tx = await contract.checkIn(ticketId);
      toast("Đang xác nhận giao dịch…", "info");
      await tx.wait();
      resultEl.innerHTML = `<div class="banner" style="background:var(--success-bg); color:var(--success-text);">✓ Check-in thành công vé #${ticketId} — chủ vé: <span class="mono">${shortAddr(t.owner)}</span>.</div>`;
      toast("Check-in thành công.", "success");
    }));
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
              <label for="f-supply">Tổng số vé (hạng Standard)</label>
              <input id="f-supply" type="number" min="1" step="1" placeholder="VD: 100" value="${escapeHtml(data.maxSupply)}" />
            </div>
            <div class="field">
              <label for="f-price">Giá vé (ETH)</label>
              <input id="f-price" type="number" min="0" step="0.0001" placeholder="VD: 0.02" value="${escapeHtml(data.price)}" />
            </div>
          </div>
          <p class="hint">Đây là hạng vé đầu tiên ("Standard"). Sau khi tạo sự kiện, vào trang quản lý sự kiện để thêm các hạng khác (VD: VIP) nếu muốn.</p>
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
          if (!data.maxSupply || Number(data.maxSupply) < 1) { toast("Nhập tổng số vé hợp lệ.", "error"); return; }
          if (!data.price || Number(data.price) <= 0) { toast("Nhập giá vé hợp lệ.", "error"); return; }
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
              <div class="review-row"><span class="review-row__label">Hạng Standard</span><span class="review-row__value">${escapeHtml(data.maxSupply)} vé × ${escapeHtml(data.price)} ETH</span></div>
              <div class="review-row"><span class="review-row__label">Giới hạn bán lại</span><span class="review-row__value">110%</span></div>
              <div class="review-row"><span class="review-row__label">Organizer wallet</span><span class="review-row__value mono">${userAddress ? shortAddr(userAddress) : "Chưa kết nối ví"}</span></div>
              <div class="review-row"><span class="review-row__label">Network</span><span class="review-row__value">Ethereum Sepolia</span></div>
            </div>
          </div>
          ${!isConfigured() ? '<div class="banner">Chưa cấu hình <code>CONTRACT_ADDRESS</code>/<code>CONTRACT_ABI</code> trong <code>web/app.js</code>.</div>' : ""}
          <p class="hint" style="margin-top: var(--sp-3);">Bấm Deploy sẽ gửi <strong>2 giao dịch</strong> lần lượt: tạo sự kiện, rồi tạo hạng vé Standard — xác nhận trong MetaMask cả 2 lần.</p>
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

          toast("Đang tạo sự kiện… (giao dịch 1/2)", "info");
          const tx1 = await contract.createEvent(data.name, startTs);
          const receipt1 = await tx1.wait();
          const log1 = receipt1.logs.map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } }).find((l) => l && l.name === "EventCreated");
          const newEventId = log1 ? log1.args.eventId : null;
          if (newEventId === null) throw new Error("Không đọc được eventId vừa tạo.");
          saveMeta(newEventId, { description: data.description, location: data.location, image: data.image });

          toast("Đang tạo hạng vé Standard… (giao dịch 2/2)", "info");
          const tx2 = await contract.createTier(newEventId, "Standard", ethers.parseEther(data.price), BigInt(data.maxSupply));
          await tx2.wait();

          toast("Tạo sự kiện thành công!", "success");
          eventsCache = null;
          tiersCache = null;
          window.location.hash = "#/events/" + newEventId.toString();
        }));
      }
    }

    render();
  };

  // ---------- Page: My events ----------

  routes.myEvents = async function () {
    const myToken = renderToken;
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
    if (myToken !== renderToken) return;
    const mine = all.filter((e) => e.organizer.toLowerCase() === userAddress.toLowerCase());
    const rows = [];
    for (const evt of mine) {
      const tiers = await fetchTiersForEvent(evt.id);
      if (myToken !== renderToken) return;
      rows.push({ evt, tiers, status: computeStatus(evt, tiers) });
    }

    function renderRows(filter) {
      const list = document.getElementById("my-events-list");
      if (!list) return;
      const map = { upcoming: "Sắp diễn ra", selling: "Đang bán vé", ended: "Đã kết thúc" };
      const filtered = filter === "all" ? rows : rows.filter((r) => r.status.label === map[filter] || (filter === "selling" && r.status.label === "Đã bán hết"));
      if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><h3>Chưa có sự kiện nào</h3><p>Tạo sự kiện đầu tiên của bạn.</p></div>`;
        return;
      }
      list.innerHTML = filtered.map(({ evt, tiers, status }) => {
        const meta = getMeta(evt.id);
        const totalMinted = tiers.reduce((s, t) => s + t.minted, 0n);
        const totalSupply = tiers.reduce((s, t) => s + t.maxSupply, 0n);
        return `
          <div class="event-row">
            <img class="event-row__thumb" src="${meta.image || stockImage(evt.id)}" alt="" />
            <div class="event-row__main">
              <div class="event-row__title">${escapeHtml(evt.name)}</div>
              <div class="event-row__meta">${fmtDate(evt.startTime)} · ${escapeHtml(meta.location || "Chưa có địa điểm")} · ${totalMinted}/${totalSupply} vé đã mint</div>
            </div>
            <div class="event-row__actions">
              <span class="badge ${status.cls}">${status.label}</span>
              <a href="#/events/${evt.id}" class="btn btn-secondary btn-sm">Quản lý</a>
            </div>
          </div>`;
      }).join("");
    }

    if (myToken !== renderToken) return;
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
    const myToken = renderToken;
    const c = await ensureReadContract();
    if (myToken !== renderToken) return;
    const balEl = document.getElementById("pending-balance");
    const listEl = document.getElementById("my-tickets-list");
    const histEl = document.getElementById("history-list");
    if (!c || !userAddress || !balEl || !listEl || !histEl) return;

    const pending = await c.pendingWithdrawals(userAddress);
    if (myToken !== renderToken) return;
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
    if (myToken !== renderToken) return;
    const owned = [];
    for (let i = 0n; i < ticketCount; i++) {
      const t = await c.tickets(i);
      if (myToken !== renderToken) return;
      if (t.owner.toLowerCase() === userAddress.toLowerCase()) owned.push(Object.assign({ id: i }, t));
    }

    if (owned.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><h3>Chưa sở hữu vé nào</h3><p>Mua vé ở trang Sự kiện để thấy vé tại đây.</p></div>`;
    } else {
      const rows = [];
      for (const t of owned) {
        const evt = await c.events(t.eventId);
        const tier = await c.tiers(t.tierId);
        if (myToken !== renderToken) return;
        rows.push({ t, evt, tier });
      }
      listEl.innerHTML = rows.map(({ t, evt, tier }) => `
          <div class="event-row" style="align-items:flex-start;">
            <div class="qr-thumb" data-qr="${t.id}" style="width:64px;height:64px;flex-shrink:0;"></div>
            <div class="event-row__main">
              <div class="event-row__title">${escapeHtml(evt.name)} <span class="text-tertiary">· ${escapeHtml(tier.name)} · Vé #${t.id}</span></div>
              <div class="event-row__meta">Giá gốc ${fmtEth(t.originalPrice)} ETH ${t.forSale ? "· đang rao bán " + fmtEth(t.resalePrice) + " ETH" : ""} ${t.checkedIn ? "· đã check-in" : ""}</div>
            </div>
            <div class="event-row__actions">
              ${t.checkedIn
                ? '<span class="badge badge-neutral">Đã check-in</span>'
                : t.forSale
                  ? '<span class="badge badge-primary">Đang rao bán</span>'
                  : `<button class="btn btn-secondary btn-sm" data-resell="${t.id}" data-price="${t.originalPrice}">Rao bán lại</button>`}
            </div>
          </div>`).join("");

      listEl.querySelectorAll("[data-qr]").forEach((el) => renderQrInto(el, el.dataset.qr));

      listEl.querySelectorAll("[data-resell]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const max = (BigInt(btn.dataset.price) * 11000n) / 10000n;
          const input = await promptPriceModal({
            title: "Rao bán lại vé",
            label: "Giá rao bán (ETH)",
            hint: `Tối đa ${fmtEth(max)} ETH (110% giá gốc).`,
            confirmText: "Rao bán",
          });
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

    const filters = [
      { name: "Mint vé", filter: contract?.filters?.TicketMinted(null, null, null, userAddress) },
      { name: "Nhận tiền bán vé", filter: contract?.filters?.TicketResold(null, userAddress, null) },
      { name: "Mua lại vé", filter: contract?.filters?.TicketResold(null, null, userAddress) },
      { name: "Rao bán vé", filter: contract?.filters?.TicketListedForResale(null, userAddress) },
      { name: "Rút tiền", filter: contract?.filters?.ProceedsWithdrawn(userAddress) },
    ].filter((f) => f.filter);

    if (!contract) {
      histEl.innerHTML = `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Kết nối ví để xem lịch sử.</p>`;
      return;
    }
    let evts = [];
    for (const { name, filter } of filters) {
      const logs = await contract.queryFilter(filter, 0, "latest");
      if (myToken !== renderToken) return;
      evts = evts.concat(logs.map((l) => ({ name, log: l })));
    }
    evts.sort((a, b) => b.log.blockNumber - a.log.blockNumber);
    histEl.innerHTML = evts.length
      ? evts.slice(0, 20).map(({ name, log }) => `
          <div class="event-row">
            <div class="event-row__main"><div class="event-row__title">${name}</div></div>
            <a class="mono text-sm" target="_blank" rel="noopener" href="https://sepolia.etherscan.io/tx/${log.transactionHash}">${log.transactionHash.slice(0, 10)}…</a>
          </div>`).join("")
      : `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Chưa có giao dịch nào.</p>`;
  }

  // ---------- Page: Checkout ----------

  routes.checkout = async function (eventIdStr, tierIdStr, qtyStr) {
    const myToken = renderToken;
    const eventId = BigInt(eventIdStr);
    const tierId = BigInt(tierIdStr);
    const qty = Math.max(1, parseInt(qtyStr, 10) || 1);

    $root().innerHTML = `<div class="page container"><div class="checkout-wrap"><div class="skel" style="height:300px;"></div></div></div>`;

    if (!isConfigured()) { await loadAbi(); }
    if (myToken !== renderToken) return;
    const demo = !isConfigured();
    const evt = demo ? MOCK_EVENTS.find((e) => e.id === eventId) : await (await ensureReadContract()).events(eventId);
    if (myToken !== renderToken) return;
    const tier = demo ? MOCK_TIERS.find((t) => t.id === tierId) : await (await ensureReadContract()).tiers(tierId);
    if (myToken !== renderToken) return;
    const meta = getMeta(eventId);

    if (!evt || !tier) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Không tìm thấy hạng vé</h3><a class="btn btn-secondary" href="#/events/${eventId}">← Quay lại sự kiện</a></div></div>`;
      return;
    }

    const total = tier.price * BigInt(qty);

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
            <div class="checkout-row"><span>Hạng vé</span><span>${escapeHtml(tier.name)}</span></div>
            <div class="checkout-row"><span>Đơn giá</span><span class="tabular-nums">${fmtEth(tier.price)} ETH</span></div>
            <div class="checkout-row"><span>Số lượng</span><span class="tabular-nums">${qty}</span></div>
            <div class="checkout-divider"></div>
            <div class="checkout-total"><span>Tổng cộng</span><span class="tabular-nums">${fmtEth(total)} ETH</span></div>
          </div>

          ${!isConfigured() ? '<div class="banner">Chưa cấu hình hợp đồng — không thể thanh toán thật.</div>' : ""}
          ${qty > 1 ? `<p class="hint">Mint ${qty} vé = ${qty} giao dịch riêng, xác nhận trong MetaMask từng lần.</p>` : ""}

          <button id="btn-pay" class="btn btn-primary btn-block btn-lg" style="margin-top: var(--sp-4);">Tiếp tục thanh toán →</button>
          <a href="#/events/${eventId}" class="btn btn-ghost btn-block" style="margin-top: var(--sp-2);">← Quay lại</a>
        </div>
      </div>
    `;

    document.getElementById("btn-pay").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      requireWallet();
      requireContract();
      requireRightNetwork();
      for (let i = 0; i < qty; i++) {
        toast(qty > 1 ? `Đang xác nhận vé ${i + 1}/${qty}…` : "Đang xác nhận giao dịch…", "info");
        const tx = await contract.mintTicket(tierId, { value: tier.price });
        await tx.wait();
      }
      toast(qty > 1 ? `Đã mint ${qty} vé thành công!` : "Mint vé thành công!", "success");
      eventsCache = null;
      tiersCache = null;
      window.location.hash = "#/events/" + eventId.toString();
    }));
  };

  // ---------- Boot ----------

  function initNavClicks() {
    document.getElementById("btn-connect").onclick = (e) => withBusy(e.currentTarget, connectWallet, { keepContentOnSuccess: true });
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
    await trySilentReconnect();
    route();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  });
})();
