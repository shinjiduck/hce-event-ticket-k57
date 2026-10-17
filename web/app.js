/* ==========================================================================
   FairTicket — SPA app (v2: public mint theo hang ve + check-in)
   Vanilla JS, hash router, no build step.
   Reads/writes contracts/project/ProjectCore.sol directly via ethers.js.

   Thay doi lon so voi v1:
   - Event khong con maxSupply/price rieng. Organizer tao Tier (gia + tong
     cung) cho event, AI CUNG tu mintTicket(tierId) de nhan ve truc tiep -
     khong con buyTicket(ticketId) tren ve co san.
   - Them checkIn(ticketId): chi Organizer, 1 lan, khoa resale sau do.
   - QR ve = ma hoa ticketId (MVP tinh, khong chong chup man hinh chia se -
     xem ghi chu "Ngoai pham vi" trong docs/SPEC.md).

   Honesty note ve du lieu KHONG nam tren chain:
   mo ta (description), dia diem, anh bia su kien khong co truong tren
   contract (de tiet kiem gas) - duoc cache trong localStorage trinh duyet
   nay VA dong bo qua ./api/metadata.js (Vercel Function + Vercel Blob) de
   hien thi dung tren moi thiet bi/trinh duyet. Ghi (POST) doi hoi ky vi -
   server xac minh chu ky khop voi organizer cua su kien tren chain, khong
   dung tai khoan/mat khau truyen thong. Xem README.md.
   ========================================================================== */

(function () {
  "use strict";

  // ---------- Config ----------

  const CONTRACT_ADDRESS = "0x0f96cafe4C603D706c786C503A5c903090706916"; // ProjectCore.sol v2 (public mint + check-in) da deploy tren Sepolia
  let CONTRACT_ABI = null; // tự nạp từ ./ProjectCore.abi.json
  const SEPOLIA_CHAIN_ID = 11155111n;
  const SEPOLIA_CHAIN_HEX = "0xaa36a7";
  // Khach chua ket noi vi van xem duoc su kien: doc qua RPC cong khai nay
  // (da kiem tra cho phep CORS tu trinh duyet), khong phu thuoc MetaMask.
  const PUBLIC_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
  const ETHERSCAN = "https://sepolia.etherscan.io";

  // Danh muc la du lieu OFF-CHAIN (luu cung metadata qua /api/metadata),
  // ProjectCore.sol khong co truong nay. Su kien cu chua chon -> "Khác".
  const CATEGORIES = [
    { id: "music", label: "Nhạc sống", icon: "music" },
    { id: "art", label: "Nghệ thuật", icon: "palette" },
    { id: "sport", label: "Thể thao", icon: "trophy" },
    { id: "workshop", label: "Workshop", icon: "tool" },
    { id: "conference", label: "Hội thảo", icon: "mic" },
    { id: "experience", label: "Trải nghiệm", icon: "compass" },
    { id: "other", label: "Khác", icon: "grid" },
  ];
  const ICON_PATHS = {
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-4.9-4.5-8.6-10-8.6z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2 6-6 2 2-6z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    pin: '<path d="M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    scale: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
  };
  function icon(name, cls) {
    return `<svg class="${cls || "icon-sm"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
  }
  function categoryOf(id) {
    return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  }

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
    0: { location: "Nhà văn hóa Huế", description: "Đêm nhạc sinh viên UEH quy tụ các ban nhạc indie nổi bật của trường, mở màn mùa lễ hội 2026.", image: "./assets/hero.jpg", category: "music" },
    1: { location: "Trung tâm Hội nghị Quốc gia", description: "Hội nghị công nghệ thường niên với các diễn giả từ cộng đồng blockchain Việt Nam.", image: "./assets/event-conference.jpg", category: "conference" },
    2: { location: "Downtown Jazz Club", description: "Đêm nhạc jazz thân mật với ban nhạc khách mời quốc tế.", image: "./assets/event-jazz.jpg", category: "music" },
  };
  function ethp(s) { return ethers.parseEther(s); }
  const MOCK_TIERS = [
    { id: 0n, eventId: 0n, name: "Standard", price: ethp("0.02"), maxSupply: 50n, minted: 38n },
    { id: 1n, eventId: 0n, name: "Premium", price: ethp("0.035"), maxSupply: 30n, minted: 30n },
    { id: 2n, eventId: 0n, name: "VIP", price: ethp("0.06"), maxSupply: 10n, minted: 4n },
    { id: 3n, eventId: 1n, name: "Standard", price: ethp("0.05"), maxSupply: 50n, minted: 50n },
    { id: 4n, eventId: 2n, name: "Standard", price: ethp("0.03"), maxSupply: 20n, minted: 20n },
  ];

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

  // escapeHtml (textContent -> innerHTML) KHONG thoat dau nhay, nen gia tri
  // dat trong thuoc tinh HTML phai qua ham nay.
  function escapeAttr(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Anh su kien den tu metadata do organizer gui len -> chi chap nhan anh
  // data:image base64 (tu FileReader) hoac asset noi bo, con lai dung anh mac
  // dinh. Chan chen thuoc tinh/URL la vao <img src>.
  const SAFE_IMAGE_RE = /^(data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+|\.\/assets\/[\w.-]+)$/;
  function eventImage(meta, eventId) {
    return meta && typeof meta.image === "string" && SAFE_IMAGE_RE.test(meta.image) ? meta.image : stockImage(eventId);
  }

  function fmtCardDate(ts) {
    const d = new Date(Number(ts) * 1000);
    const date = d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return date + " · " + time;
  }

  // Loi da viet san bang tieng Viet cho nguoi dung -> friendlyError giu nguyen.
  function userError(message) {
    const err = new Error(message);
    err.userFacing = true;
    return err;
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
    if (err?.userFacing) return err.message;
    if (err?.code === "ACTION_REJECTED" || err?.code === 4001) return "Bạn đã từ chối giao dịch trong ví.";
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

  /// Modal xem chi tiet 1 ve: QR to de quet tai cong + day du thong tin
  /// (ten su kien, hang ve, gia, trang thai) - truoc day chi co o thu nho
  /// 64x64 trong danh sach, khong du de dua man hinh cho ban to chuc quet.
  function showTicketDetailModal(t, evt, tier) {
    const meta = getMeta(t.eventId);
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="text-align:center;">
        <div class="qr-thumb" id="modal-qr" style="width:220px;height:220px;margin:0 auto var(--sp-3);"></div>
        <h3>${escapeHtml(evt.name)}</h3>
        <p class="text-secondary text-sm" style="margin-top:4px;">${escapeHtml(tier.name)} · Vé #${t.id}</p>
        <div class="info-list" style="text-align:left; margin-top: var(--sp-3);">
          <div class="info-row"><div class="info-row__label">Thời gian</div><div class="info-row__value">${fmtDateTime(evt.startTime)}</div></div>
          <div class="info-row"><div class="info-row__label">Địa điểm</div><div class="info-row__value">${escapeHtml(meta.location || "Cập nhật sau")}</div></div>
          <div class="info-row"><div class="info-row__label">Giá gốc</div><div class="info-row__value">${fmtEth(t.originalPrice)} ETH</div></div>
          <div class="info-row"><div class="info-row__label">Trạng thái</div><div class="info-row__value">${t.checkedIn ? "Đã check-in" : t.forSale ? "Đang rao bán · " + fmtEth(t.resalePrice) + " ETH" : "Chưa check-in"}</div></div>
        </div>
        <div class="wizard-actions" style="margin-top: var(--sp-4); padding-top: 0; border-top: none;">
          <button type="button" class="btn btn-primary btn-block" data-action="close">Đóng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    renderQrInto(overlay.querySelector("#modal-qr"), String(t.id));
    function close() { overlay.remove(); }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('[data-action="close"]').addEventListener("click", close);
    overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
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

  // localStorage la theo-trinh-duyet nen metadata (anh/mo ta/dia diem) tao
  // tren may nay se "bien mat" khi xem bang may/trinh duyet khac. Dong bo
  // 1 lan/su kien/lan tai trang qua ./api/metadata.js (Vercel Blob) de du
  // lieu hien thi dung cho moi nguoi, khong chi nguoi tao.
  const metaSynced = new Set();

  async function syncMeta(eventId) {
    const key = String(eventId);
    if (metaSynced.has(key)) return false;
    metaSynced.add(key);
    try {
      const res = await fetch("/api/metadata?eventId=" + key);
      if (!res.ok) return false;
      const remote = await res.json();
      if (!remote || (!remote.description && !remote.location && !remote.image && !remote.category)) return false;
      const before = JSON.stringify(getAllMeta()[key] || {});
      saveMeta(eventId, remote);
      return JSON.stringify(getAllMeta()[key]) !== before;
    } catch (err) {
      console.warn("Không đồng bộ được metadata cho #" + key, err);
      return false;
    }
  }

  // Goi khi danh sach su kien da render xong (optimistic, dung cache cu);
  // neu co du lieu moi cho bat ky su kien nao, goi onChanged() de ve lai.
  function syncMetaThenRefresh(eventIds, onChanged) {
    const ids = eventIds.filter((id) => !metaSynced.has(String(id)));
    if (ids.length === 0) return;
    Promise.all(ids.map(syncMeta)).then((results) => {
      if (results.some(Boolean)) onChanged();
    });
  }

  async function publishMetaToServer(eventId, data) {
    if (!signer) return;
    try {
      const timestamp = Date.now();
      // Phai khop CHINH XAC voi buildMessage() trong web/api/metadata.js -
      // server tu dung lai message tu (eventId, timestamp), khong tin
      // noi dung message do client gui len.
      const message = "FairTicket: cập nhật metadata sự kiện #" + eventId + " lúc " + timestamp;
      const signature = await signer.signMessage(message);
      await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: Number(eventId), data, timestamp, signature }),
      });
      metaSynced.add(String(eventId)); // da la nguon moi nhat, khong can tu doc lai
    } catch (err) {
      console.warn("Không đồng bộ được metadata lên server (vẫn lưu được trên máy này):", err);
    }
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
    // Vi dang o sai mang thi doc qua vi se ra du lieu chain khac -> luc do
    // (hoac khi chua co vi) doc qua RPC Sepolia cong khai.
    const walletOnSepolia = provider && userAddress && chainId === SEPOLIA_CHAIN_ID;
    readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, walletOnSepolia ? provider : getPublicProvider());
    return readContract;
  }

  let publicProvider = null;
  function getPublicProvider() {
    if (!publicProvider) {
      const net = ethers.Network.from(SEPOLIA_CHAIN_ID);
      publicProvider = new ethers.JsonRpcProvider(PUBLIC_RPC_URL, net, { staticNetwork: net });
    }
    return publicProvider;
  }

  function range(count) {
    return Array.from({ length: Number(count) }, (_, i) => BigInt(i));
  }

  async function setupWalletSession() {
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    const net = await provider.getNetwork();
    chainId = net.chainId;
    if (isConfigured()) {
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      readContract = chainId === SEPOLIA_CHAIN_ID ? contract : null;
    }
  }

  // MetaMask khong co API "dang xuat" chuan: thu thu hoi quyen (ho tro tu
  // MetaMask 11+), dong thoi danh dau de trang khong tu ket noi lai im lang.
  const DISCONNECTED_KEY = "fairticket:disconnected";
  async function disconnectWallet() {
    try { await window.ethereum?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch {}
    try { localStorage.setItem(DISCONNECTED_KEY, "1"); } catch {}
    userAddress = null; signer = null; contract = null; readContract = null; chainId = null;
    eventsCache = null; tiersCache = null;
    toast("Đã ngắt kết nối ví.", "info");
    route();
  }

  async function switchToSepolia() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX }] });
    } catch (err) {
      toast(err?.code === 4001 ? "Bạn đã huỷ đổi mạng trong ví." : "Không đổi được mạng tự động — hãy chọn Sepolia trong MetaMask.", "error");
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      toast("Chưa cài MetaMask (hoặc ví tương thích) trên trình duyệt này.", "error");
      return;
    }
    try { localStorage.removeItem(DISCONNECTED_KEY); } catch {}
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
    try { if (localStorage.getItem(DISCONNECTED_KEY)) return; } catch {}
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
    if (!userAddress) throw userError("Chưa kết nối ví. Bấm “Kết nối ví” ở góc trên bên phải.");
  }
  function requireContract() {
    if (!isConfigured()) throw userError("Chưa cấu hình CONTRACT_ADDRESS/ABI trong app.js.");
    if (!contract) throw userError("Chưa kết nối ví.");
  }
  function requireRightNetwork() {
    if (chainId && chainId !== SEPOLIA_CHAIN_ID) {
      throw userError("Vui lòng chuyển ví sang mạng Ethereum Sepolia rồi thử lại.");
    }
  }

  async function fetchAllEvents(force) {
    if (!isConfigured()) { await loadAbi(); }
    if (!isConfigured()) return MOCK_EVENTS;
    const c = await ensureReadContract();
    if (!c) return [];
    if (eventsCache && !force) return eventsCache;
    const ids = range(await c.nextEventId());
    const rows = await Promise.all(ids.map((i) => c.events(i)));
    const out = rows.map((e, i) => ({ id: ids[i], name: e.name, startTime: e.startTime, organizer: e.organizer, tierCount: e.tierCount }));
    eventsCache = out;
    return out;
  }

  async function fetchAllTiers(force) {
    if (!isConfigured()) return MOCK_TIERS;
    const c = await ensureReadContract();
    if (!c) return [];
    if (tiersCache && !force) return tiersCache;
    const ids = range(await c.nextTierId());
    const rows = await Promise.all(ids.map((i) => c.tiers(i)));
    const out = rows.map((t, i) => ({ id: ids[i], eventId: t.eventId, name: t.name, price: t.price, maxSupply: t.maxSupply, minted: t.minted }));
    tiersCache = out;
    return out;
  }

  async function fetchTiersForEvent(eventId) {
    const all = await fetchAllTiers();
    return all.filter((t) => t.eventId === eventId);
  }

  // Ve dang rao ban lai: doc thang trang thai hien tai tren contract
  // (forSale && chua check-in), khong suy ra tu log - log rao ban cu co the
  // da het hieu luc vi ve da duoc mua/chu ve doi.
  async function fetchResaleListings() {
    if (!isConfigured()) return [];
    const c = await ensureReadContract();
    if (!c) return [];
    const ids = range(await c.nextTicketId());
    const rows = await Promise.all(ids.map((i) => c.tickets(i)));
    return rows
      .map((t, i) => ({ id: ids[i], eventId: t.eventId, tierId: t.tierId, owner: t.owner, originalPrice: t.originalPrice, resalePrice: t.resalePrice, forSale: t.forSale, checkedIn: t.checkedIn }))
      .filter((t) => t.forSale && !t.checkedIn);
  }

  function tiersByEvent(tiers) {
    const map = new Map();
    for (const t of tiers) {
      const key = String(t.eventId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }

  // Tom tat ban ve cua 1 su kien tu du lieu tier that tren chain.
  function salesSummary(evt, tiers) {
    const nowTs = Math.floor(Date.now() / 1000);
    const ended = Number(evt.startTime) <= nowTs;
    const supply = tiers.reduce((s, t) => s + t.maxSupply, 0n);
    const minted = tiers.reduce((s, t) => s + t.minted, 0n);
    const open = tiers.filter((t) => t.minted < t.maxSupply);
    const minPrice = (open.length ? open : tiers).reduce((m, t) => (m === null || t.price < m ? t.price : m), null);
    const remaining = supply - minted;
    let badge = null;
    if (ended) badge = { label: "Đã diễn ra", cls: "badge-neutral" };
    else if (tiers.length && remaining === 0n) badge = { label: "Hết vé", cls: "badge-danger" };
    else if (tiers.length && remaining * 10n <= supply) badge = { label: "Sắp hết vé", cls: "badge-warning" };
    return { ended, supply, minted, remaining, minPrice, hasTiers: tiers.length > 0, soldOut: tiers.length > 0 && remaining === 0n, badge };
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
  function parseHash() {
    const raw = window.location.hash.slice(1) || "/";
    const [path, qs] = raw.split("?");
    return { parts: path.split("/").filter(Boolean), query: new URLSearchParams(qs || "") };
  }
  function route() {
    renderToken++;
    closeWalletMenu();
    const { parts, query } = parseHash();
    renderHeader();
    window.scrollTo(0, 0);
    if (parts.length === 0) return routes.home();
    if (parts[0] === "events" && parts[1]) return routes.eventDetail(parts[1]);
    if (parts[0] === "events") return routes.events(query);
    if (parts[0] === "resale") return routes.resale();
    if (parts[0] === "create") return routes.create();
    if (parts[0] === "my-events") return routes.myEvents("organizer");
    if (parts[0] === "my-tickets") return routes.myEvents("tickets");
    if (parts[0] === "checkout" && parts[1] && parts[2]) return routes.checkout(parts[1], parts[2], parts[3] || "1");
    return routes.home();
  }
  window.addEventListener("hashchange", route);

  // ---------- Header ----------

  function renderHeader() {
    const base = parseHash().parts[0] || "";
    document.querySelectorAll(".main-nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.route === base);
    });
    const myLink = document.querySelector(".header-mytickets");
    if (myLink) myLink.classList.toggle("btn-secondary", base === "my-tickets");

    const btn = document.getElementById("btn-connect");
    const wrongNetwork = !!(userAddress && chainId && chainId !== SEPOLIA_CHAIN_ID);
    if (userAddress) {
      btn.innerHTML = `<span class="wallet-chip"><span class="wallet-chip__dot${wrongNetwork ? " wallet-chip__dot--bad" : ""}"></span><span class="mono">${shortAddr(userAddress)}</span></span>`;
      btn.className = "wallet-btn";
      btn.setAttribute("aria-haspopup", "menu");
      btn.setAttribute("aria-expanded", "false");
      btn.onclick = (e) => { e.stopPropagation(); toggleWalletMenu(); };
    } else {
      btn.innerHTML = "Kết nối ví";
      btn.className = "btn btn-primary btn-sm";
      btn.removeAttribute("aria-haspopup");
      btn.removeAttribute("aria-expanded");
      btn.onclick = (e) => withBusy(e.currentTarget, connectWallet, { keepContentOnSuccess: true });
    }

    // Canh bao SOM neu vi dang ket noi nhung sai mang, kem nut doi mang.
    const netBanner = document.getElementById("network-banner");
    if (netBanner) {
      netBanner.hidden = !wrongNetwork;
      if (wrongNetwork) {
        netBanner.innerHTML = `<div class="banner-row"><span>Ví đang ở mạng khác (không phải Ethereum Sepolia) — chưa thể tạo sự kiện hay mua vé.</span><button type="button" class="btn btn-sm btn-dark" id="btn-switch-net">Chuyển sang Sepolia</button></div>`;
        document.getElementById("btn-switch-net").onclick = switchToSepolia;
      }
    }
  }

  function walletMenuHtml() {
    const wrongNetwork = chainId && chainId !== SEPOLIA_CHAIN_ID;
    return `
      <div class="wallet-dropdown__head">
        <div class="wallet-dropdown__addr"><span class="mono">${shortAddr(userAddress)}</span><button type="button" class="copy-btn" data-copy="${userAddress}">Sao chép</button></div>
        <div class="wallet-dropdown__net"><span class="wallet-chip__dot${wrongNetwork ? " wallet-chip__dot--bad" : ""}"></span>${wrongNetwork ? "Sai mạng — cần Ethereum Sepolia" : "Ethereum Sepolia"}</div>
      </div>
      ${wrongNetwork ? `<button type="button" class="menu-item" data-action="switch">${icon("wallet")} Chuyển sang Sepolia</button>` : ""}
      <a href="#/my-tickets" role="menuitem">${icon("ticket")} Vé của tôi</a>
      <a href="#/my-events" role="menuitem">${icon("calendar")} Sự kiện của tôi</a>
      <a href="${ETHERSCAN}/address/${userAddress}" target="_blank" rel="noopener" role="menuitem">${icon("external")} Xem ví trên Etherscan</a>
      <button type="button" class="menu-item menu-item--danger" data-action="disconnect" role="menuitem">${icon("logout")} Ngắt kết nối</button>`;
  }

  function toggleWalletMenu() {
    const dd = document.getElementById("wallet-dropdown");
    if (!dd) return;
    if (!dd.hidden) return closeWalletMenu();
    dd.innerHTML = walletMenuHtml();
    dd.hidden = false;
    document.getElementById("btn-connect").setAttribute("aria-expanded", "true");
    dd.querySelector('[data-action="disconnect"]').onclick = () => { closeWalletMenu(); disconnectWallet(); };
    const sw = dd.querySelector('[data-action="switch"]');
    if (sw) sw.onclick = () => { closeWalletMenu(); switchToSepolia(); };
    dd.querySelectorAll("[data-copy]").forEach(bindCopy);
    dd.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeWalletMenu));
  }

  function closeWalletMenu() {
    const dd = document.getElementById("wallet-dropdown");
    if (dd && !dd.hidden) {
      dd.hidden = true;
      document.getElementById("btn-connect")?.setAttribute("aria-expanded", "false");
    }
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#wallet-menu")) closeWalletMenu();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeWalletMenu(); });

  function bindCopy(btn) {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const old = btn.textContent;
        btn.textContent = "Đã chép";
        setTimeout(() => { btn.textContent = old; }, 1200);
      } catch {
        toast("Không sao chép được — hãy bôi đen và copy thủ công.", "error");
      }
    });
  }

  // ---------- Page: Home ----------

  routes.home = async function () {
    const myToken = renderToken;
    $root().innerHTML = h`
      <div class="page container">
        <h1 class="sr-only">FairTicket — khám phá và mua vé sự kiện</h1>
        <nav class="category-bar" aria-label="Danh mục sự kiện">
          <a class="cat-chip active" href="#/events">${icon("grid")} Tất cả</a>
          ${CATEGORIES.map((c) => `<a class="cat-chip" href="#/events?cat=${c.id}">${icon(c.icon)} ${c.label}</a>`).join("")}
        </nav>

        <section class="hero-carousel" id="hero-carousel" aria-roledescription="carousel" aria-label="Sự kiện tiêu điểm">
          ${brandSlideHtml(true)}
        </section>

        <section class="home-section">
          <div class="section-head">
            <div><h2>Sự kiện nổi bật</h2><p>Các sự kiện mới nhất đang mở bán trên FairTicket.</p></div>
            <a href="#/events" class="btn btn-ghost btn-sm">Xem tất cả ${icon("chevronRight")}</a>
          </div>
          <div id="home-featured" class="grid-4">${skeletonCards(4)}</div>
        </section>

        <section class="home-section">
          <div class="section-head">
            <div><h2>Sắp diễn ra</h2><p>Sắp xếp theo thời gian bắt đầu gần nhất.</p></div>
            <a href="#/events?sort=soon" class="btn btn-ghost btn-sm">Xem lịch ${icon("chevronRight")}</a>
          </div>
          <div id="home-upcoming" class="upcoming-list">${skeletonRows(4)}</div>
        </section>

        <section class="home-section">
          <div class="section-head"><div><h2>Khám phá theo danh mục</h2><p>Chọn loại sự kiện bạn quan tâm.</p></div></div>
          <div id="home-cats" class="cat-grid">${categoryTilesHtml(null)}</div>
        </section>

        <section class="home-section">
          <div class="section-head">
            <div><h2>Vé bán lại minh bạch</h2><p>Vé do người dùng rao bán lại — trạng thái đọc trực tiếp từ hợp đồng.</p></div>
            <a href="#/resale" class="btn btn-ghost btn-sm">Xem tất cả ${icon("chevronRight")}</a>
          </div>
          ${resaleRuleBanner()}
          <div id="home-resale" class="grid-4">${skeletonCards(4)}</div>
        </section>

        <section class="home-section">
          <div class="section-head"><div><h2>Vì sao chọn FairTicket?</h2></div></div>
          <div class="benefit-grid">
            ${benefitHtml("shield", "Vé xác thực on-chain", "Mỗi vé là một bản ghi duy nhất trên hợp đồng ProjectCore — không thể làm giả hay nhân bản.")}
            ${benefitHtml("scale", "Giới hạn đầu cơ", "Hợp đồng từ chối mọi giá bán lại vượt 110% giá gốc.")}
            ${benefitHtml("eye", "Sở hữu minh bạch", "Ai đang giữ vé nào đều kiểm chứng được công khai trên Etherscan.")}
            ${benefitHtml("history", "Theo dõi giao dịch", "Mua, bán lại, check-in đều để lại lịch sử không thể sửa đổi.")}
          </div>
        </section>
      </div>
    `;

    let evts, tiers;
    try {
      [evts, tiers] = await Promise.all([fetchAllEvents(), fetchAllTiers()]);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được sự kiện:", err);
      ["home-featured", "home-upcoming", "home-resale"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = errorStateHtml("Không tải được dữ liệu từ blockchain", "Mạng/RPC đang chập chờn.");
      });
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    const byEvent = tiersByEvent(tiers);
    const draw = () => { if (myToken === renderToken) renderHomeData(evts, byEvent); };
    draw();
    syncMetaThenRefresh(evts.map((e) => e.id), draw);
    loadResaleInto("home-resale", myToken, evts, tiers, 4);
  };

  function renderHomeData(evts, byEvent) {
    const nowTs = Math.floor(Date.now() / 1000);
    const tiersOf = (e) => byEvent.get(String(e.id)) || [];
    const upcoming = evts.filter((e) => Number(e.startTime) > nowTs).sort((a, b) => Number(a.startTime) - Number(b.startTime));

    // Carousel: su kien sap dien ra da co hang ve (toi da 5), cuoi cung la slide gioi thieu.
    const heroEvents = upcoming.filter((e) => tiersOf(e).length > 0).slice(0, 5);
    const carousel = document.getElementById("hero-carousel");
    if (carousel) {
      mountCarousel(carousel, [
        ...heroEvents.map((e, i) => eventSlideHtml(e, tiersOf(e), i === 0)),
        brandSlideHtml(heroEvents.length === 0),
      ]);
    }

    // Noi bat = moi nhat con mo ban (chua dien ra, con ve); thieu thi bu bang su kien sap dien ra khac.
    const newest = upcoming.slice().sort((a, b) => Number(b.id - a.id));
    const selling = newest.filter((e) => { const s = salesSummary(e, tiersOf(e)); return s.hasTiers && !s.soldOut; });
    let featured = selling.concat(newest.filter((e) => !selling.includes(e))).slice(0, 8);
    // Khong con su kien sap dien ra -> hien su kien gan nhat (co nhan "Đã diễn ra") thay vi de trong.
    if (featured.length < 4) {
      const past = evts.filter((e) => Number(e.startTime) <= nowTs).sort((a, b) => Number(b.startTime) - Number(a.startTime));
      featured = featured.concat(past.slice(0, 4 - featured.length));
    }
    const featEl = document.getElementById("home-featured");
    if (featEl) {
      featEl.innerHTML = featured.length
        ? featured.map((e) => eventCardHtml(e, tiersOf(e))).join("")
        : emptyState("Chưa có sự kiện nào", isConfigured() ? "Hãy là người đầu tiên tạo sự kiện trên FairTicket." : "Chưa cấu hình kết nối hợp đồng.", `<a class="btn btn-primary" href="#/create" style="margin-top:16px;">Tạo sự kiện</a>`);
    }

    const upEl = document.getElementById("home-upcoming");
    if (upEl) {
      upEl.innerHTML = upcoming.length
        ? upcoming.slice(0, 6).map((e) => upcomingItemHtml(e, tiersOf(e))).join("")
        : emptyState("Chưa có sự kiện sắp diễn ra", "Các sự kiện mới mở bán sẽ xuất hiện tại đây.", evts.length ? `<a class="btn btn-secondary btn-sm" href="#/events?past=1" style="margin-top:16px;">Xem sự kiện đã diễn ra</a>` : "");
    }

    const counts = {};
    for (const e of evts) {
      const id = categoryOf(getMeta(e.id).category).id;
      counts[id] = (counts[id] || 0) + 1;
    }
    const catEl = document.getElementById("home-cats");
    if (catEl) catEl.innerHTML = categoryTilesHtml(counts);
  }

  function brandSlideHtml(active) {
    return `
      <div class="hero-slide${active ? " is-active" : ""}" role="group" aria-roledescription="slide" aria-label="Giới thiệu FairTicket">
        <img class="hero-slide__img" src="./assets/hero.jpg" alt="" />
        <div class="hero-slide__scrim"></div>
        <div class="hero-slide__content">
          <span class="hero-slide__eyebrow">FairTicket</span>
          <h2 class="hero-slide__title">Vé công bằng cho những sự kiện đáng nhớ</h2>
          <p class="hero-slide__lead">Mua vé ghi nhận trên blockchain — chống vé giả, giá bán lại không vượt 110% giá gốc.</p>
          <div class="hero-slide__cta">
            <a href="#/events" class="btn btn-primary btn-lg">Khám phá sự kiện</a>
            <a href="#/create" class="btn btn-secondary btn-lg">Tạo sự kiện</a>
          </div>
        </div>
      </div>`;
  }

  function eventSlideHtml(evt, tiers, active) {
    const meta = getMeta(evt.id);
    const s = salesSummary(evt, tiers);
    const canBuy = s.hasTiers && !s.soldOut && !s.ended;
    return `
      <div class="hero-slide${active ? " is-active" : ""}" role="group" aria-roledescription="slide" aria-label="${escapeAttr(evt.name)}">
        <img class="hero-slide__img" src="${eventImage(meta, evt.id)}" alt="" />
        <div class="hero-slide__scrim"></div>
        <div class="hero-slide__content">
          <span class="hero-slide__eyebrow">${categoryOf(meta.category).label}${s.badge ? " · " + s.badge.label : ""}</span>
          <h2 class="hero-slide__title">${escapeHtml(evt.name)}</h2>
          <div class="hero-slide__meta">
            <span>${icon("calendar")} ${fmtCardDate(evt.startTime)}</span>
            <span>${icon("pin")} ${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</span>
            ${s.hasTiers ? `<span>${icon("ticket")} Từ ${fmtEth(s.minPrice)} ETH</span>` : ""}
          </div>
          <div class="hero-slide__cta">
            ${canBuy ? `<a href="#/events/${evt.id}" class="btn btn-accent btn-lg">Mua vé</a>` : ""}
            <a href="#/events/${evt.id}" class="btn btn-secondary btn-lg">Xem chi tiết</a>
          </div>
        </div>
      </div>`;
  }

  let carouselTimer = null;
  function mountCarousel(root, slides) {
    clearInterval(carouselTimer);
    const n = slides.length;
    root.innerHTML = slides.join("") + (n > 1 ? `
      <button type="button" class="carousel-nav carousel-nav--prev" aria-label="Slide trước">${icon("chevronLeft", "icon")}</button>
      <button type="button" class="carousel-nav carousel-nav--next" aria-label="Slide sau">${icon("chevronRight", "icon")}</button>
      <div class="carousel-dots">${slides.map((_, i) => `<button type="button" class="carousel-dot${i === 0 ? " is-active" : ""}" aria-label="Tới slide ${i + 1}"></button>`).join("")}</div>` : "");
    const els = root.querySelectorAll(".hero-slide");
    const dots = root.querySelectorAll(".carousel-dot");
    let idx = 0;
    function go(i) {
      idx = (i + n) % n;
      els.forEach((el, k) => {
        el.classList.toggle("is-active", k === idx);
        el.inert = k !== idx;
      });
      dots.forEach((d, k) => { d.classList.toggle("is-active", k === idx); d.setAttribute("aria-current", k === idx ? "true" : "false"); });
    }
    go(0);
    if (n <= 1) return;
    root.querySelector(".carousel-nav--prev").addEventListener("click", () => go(idx - 1));
    root.querySelector(".carousel-nav--next").addEventListener("click", () => go(idx + 1));
    dots.forEach((d, k) => d.addEventListener("click", () => go(k)));

    let paused = false;
    root.addEventListener("mouseenter", () => { paused = true; });
    root.addEventListener("mouseleave", () => { paused = false; });
    root.addEventListener("focusin", () => { paused = true; });
    root.addEventListener("focusout", () => { paused = false; });
    let touchX = null;
    root.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; paused = true; }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (touchX !== null) {
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      }
      touchX = null;
      paused = false;
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    carouselTimer = setInterval(() => {
      if (!document.body.contains(root)) { clearInterval(carouselTimer); return; }
      if (!paused && !document.hidden) go(idx + 1);
    }, 6000);
  }

  function upcomingItemHtml(evt, tiers) {
    const meta = getMeta(evt.id);
    const d = new Date(Number(evt.startTime) * 1000);
    const s = salesSummary(evt, tiers);
    const right = s.badge
      ? `<span class="badge ${s.badge.cls}">${s.badge.label}</span>`
      : s.hasTiers ? `<span class="text-sm tabular-nums" style="font-weight:600;">${fmtEth(s.minPrice)} ETH</span>` : `<span class="badge badge-neutral">Chưa mở bán</span>`;
    return `
      <a class="upcoming-item" href="#/events/${evt.id}">
        <div class="date-block" aria-hidden="true">
          <div class="date-block__month">Thg ${d.getMonth() + 1}</div>
          <div class="date-block__day">${String(d.getDate()).padStart(2, "0")}</div>
        </div>
        <img class="upcoming-item__img" src="${eventImage(meta, evt.id)}" alt="" loading="lazy" />
        <div class="upcoming-item__main">
          <div class="upcoming-item__title">${escapeHtml(evt.name)}</div>
          <div class="upcoming-item__meta">${fmtCardDate(evt.startTime)} · ${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</div>
        </div>
        ${right}
      </a>`;
  }

  function categoryTilesHtml(counts) {
    return CATEGORIES.filter((c) => c.id !== "other").map((c) => `
      <a class="cat-tile" href="#/events?cat=${c.id}">
        <span class="cat-tile__icon">${icon(c.icon, "icon")}</span>
        <span>
          <span class="cat-tile__name">${c.label}</span><br />
          <span class="cat-tile__count">${counts ? (counts[c.id] || 0) + " sự kiện" : "&nbsp;"}</span>
        </span>
      </a>`).join("");
  }

  function benefitHtml(iconName, title, text) {
    return `<div class="benefit-card"><div class="benefit-card__icon">${icon(iconName, "icon")}</div><h3>${title}</h3><p>${text}</p></div>`;
  }

  function resaleRuleBanner() {
    return `<div class="resale-banner">${icon("scale", "icon")}<span>Giá bán lại được <strong>giới hạn tối đa 110% giá gốc</strong> — chính hợp đồng ProjectCore từ chối mọi mức giá cao hơn, không chỉ là quy định hiển thị.</span></div>`;
  }

  function skeletonCards(n) {
    return Array.from({ length: n }).map(() => `
      <div class="event-card" aria-hidden="true">
        <div class="event-card__img-wrap skel"></div>
        <div class="event-card__body">
          <div class="skel" style="height:12px;width:40%;margin-bottom:8px;"></div>
          <div class="skel" style="height:16px;width:80%;margin-bottom:8px;"></div>
          <div class="skel" style="height:12px;width:60%;"></div>
        </div>
      </div>`).join("");
  }

  function skeletonRows(n) {
    return Array.from({ length: n }).map(() => `<div class="upcoming-item" aria-hidden="true"><div class="skel" style="width:60px;height:62px;"></div><div style="flex:1;"><div class="skel" style="height:14px;width:70%;margin-bottom:8px;"></div><div class="skel" style="height:12px;width:45%;"></div></div></div>`).join("");
  }

  function emptyState(title, body, extraHtml) {
    return `<div class="empty-state card" style="grid-column:1/-1;"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${extraHtml || ""}</div>`;
  }

  function errorStateHtml(title, body) {
    return `<div class="empty-state card" style="grid-column:1/-1;"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p><button type="button" class="btn btn-secondary btn-sm" data-retry style="margin-top:16px;">Thử lại</button></div>`;
  }
  function wireRetry() {
    $root().querySelectorAll("[data-retry]").forEach((b) => b.addEventListener("click", () => { eventsCache = null; tiersCache = null; route(); }));
  }

  function eventCardHtml(evt, tiers) {
    const meta = getMeta(evt.id);
    const s = tiers ? salesSummary(evt, tiers) : null;
    const price = !s ? "Xem giá vé" : s.hasTiers ? `Từ <strong>${fmtEth(s.minPrice)} ETH</strong>` : "Chưa mở bán";
    return `
      <a class="event-card" href="#/events/${evt.id}">
        <div class="event-card__img-wrap">
          <img class="event-card__img" src="${eventImage(meta, evt.id)}" alt="" loading="lazy" />
          <div class="event-card__tags"><span class="event-card__cat">${categoryOf(meta.category).label}</span>${s && s.badge ? `<span class="badge ${s.badge.cls}">${s.badge.label}</span>` : ""}</div>
        </div>
        <div class="event-card__body">
          <div class="event-card__date">${fmtCardDate(evt.startTime)}</div>
          <div class="event-card__title">${escapeHtml(evt.name)}</div>
          <div class="event-card__meta">${icon("pin")}<span>${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</span></div>
          <div class="event-card__price-wrap"><div class="event-card__price"><span>Giá vé</span><span>${price}</span></div></div>
        </div>
      </a>`;
  }

  // ---------- Resale (vé bán lại) ----------

  async function loadResaleInto(elId, myToken, evts, tiers, limit) {
    const el = document.getElementById(elId);
    if (!el) return;
    let listings;
    try {
      listings = await fetchResaleListings();
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được vé bán lại:", err);
      el.innerHTML = errorStateHtml("Không tải được vé bán lại", "Mạng/RPC đang chập chờn.");
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    const shown = listings.slice().sort((a, b) => Number(b.id - a.id)).slice(0, limit || listings.length);
    if (shown.length === 0) {
      el.innerHTML = emptyState("Chưa có vé nào đang được rao bán lại", "Khi chủ vé rao bán, vé sẽ xuất hiện tại đây với giá không vượt 110% giá gốc.");
      return;
    }
    const evtMap = new Map(evts.map((e) => [String(e.id), e]));
    const tierMap = new Map(tiers.map((t) => [String(t.id), t]));
    el.innerHTML = shown.map((l) => resaleCardHtml(l, evtMap.get(String(l.eventId)), tierMap.get(String(l.tierId)))).join("");
    el.querySelectorAll("[data-buy-resale]").forEach((btn) => {
      btn.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        const id = BigInt(btn.dataset.buyResale);
        const listing = shown.find((l) => l.id === id);
        await buyResaleFlow(listing, evtMap.get(String(listing.eventId)), tierMap.get(String(listing.tierId)));
      }));
    });
  }

  function resaleCardHtml(l, evt, tier) {
    const meta = getMeta(l.eventId);
    const diffBps = l.originalPrice > 0n ? Number(((l.resalePrice - l.originalPrice) * 10000n) / l.originalPrice) : 0;
    const pct = (diffBps / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    const isMine = userAddress && l.owner.toLowerCase() === userAddress.toLowerCase();
    const ended = evt && Number(evt.startTime) <= Math.floor(Date.now() / 1000);
    return `
      <article class="resale-card">
        <img class="resale-card__img" src="${eventImage(meta, l.eventId)}" alt="" loading="lazy" />
        <div class="resale-card__body">
          <div>
            <div class="resale-card__title">${escapeHtml(evt ? evt.name : "Sự kiện #" + l.eventId)}</div>
            <div class="resale-card__sub">${escapeHtml(tier ? tier.name : "Hạng #" + l.tierId)} · Vé #${l.id}${evt ? " · " + fmtDate(evt.startTime) : ""}</div>
          </div>
          <div class="price-compare">
            <div class="price-compare__row"><span>Giá gốc</span><span class="tabular-nums">${fmtEth(l.originalPrice)} ETH</span></div>
            <div class="price-compare__row"><span>Giá bán lại</span><span class="price-compare__resale">${fmtEth(l.resalePrice)} ETH</span></div>
            <div class="price-compare__row"><span>Chênh lệch</span><span class="${diffBps > 0 ? "diff-up" : "diff-down"} tabular-nums">${diffBps > 0 ? "+" : ""}${pct}%</span></div>
          </div>
          <div class="resale-card__foot">
            <span class="text-sm text-secondary">Người bán <span class="mono">${shortAddr(l.owner)}</span></span>
            ${isMine ? `<span class="badge badge-neutral">Vé của bạn</span>` : ended ? `<span class="badge badge-neutral">Đã diễn ra</span>` : `<button type="button" class="btn btn-accent btn-sm" data-buy-resale="${l.id}">Mua lại</button>`}
          </div>
        </div>
      </article>`;
  }

  function confirmResaleModal(l, evt, tier) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="resale-modal-title">
          <h3 id="resale-modal-title">Xác nhận mua lại vé</h3>
          <div class="review-list" style="margin-top: var(--sp-3);">
            <div class="review-row"><span class="review-row__label">Sự kiện</span><span class="review-row__value">${escapeHtml(evt ? evt.name : "#" + l.eventId)}</span></div>
            <div class="review-row"><span class="review-row__label">Hạng vé</span><span class="review-row__value">${escapeHtml(tier ? tier.name : "#" + l.tierId)} · Vé #${l.id}</span></div>
            <div class="review-row"><span class="review-row__label">Giá gốc</span><span class="review-row__value tabular-nums">${fmtEth(l.originalPrice)} ETH</span></div>
            <div class="review-row"><span class="review-row__label">Người bán</span><span class="review-row__value mono">${shortAddr(l.owner)}</span></div>
            <div class="review-row"><span class="review-row__label">Ví của bạn</span><span class="review-row__value mono">${shortAddr(userAddress)}</span></div>
            <div class="review-row"><span class="review-row__label">Mạng</span><span class="review-row__value">Ethereum Sepolia</span></div>
            <div class="review-row" style="font-size:16px;"><span class="review-row__label">Thanh toán</span><span class="review-row__value tabular-nums">${fmtEth(l.resalePrice)} ETH</span></div>
          </div>
          <p class="hint" style="margin-top: var(--sp-3); font-size:13px; color: var(--text-secondary);">Chưa gồm phí gas (ví sẽ hiển thị). Sau khi blockchain xác nhận, vé chuyển sang ví của bạn; nếu bán lại, giá vẫn bị giới hạn tối đa 110% giá gốc.</p>
          <div class="wizard-actions" style="margin-top: var(--sp-4); padding-top: 0; border-top: none;">
            <button type="button" class="btn btn-ghost" data-action="cancel">Huỷ</button>
            <button type="button" class="btn btn-accent" data-action="confirm">Xác nhận mua</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const confirmBtn = overlay.querySelector('[data-action="confirm"]');
      confirmBtn.focus();
      function close(v) { overlay.remove(); resolve(v); }
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
      overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(false); });
      overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => close(false));
      confirmBtn.addEventListener("click", () => close(true));
    });
  }

  // Mua lai ve: doc lai trang thai ve NGAY truoc khi gui giao dich (listing
  // co the da bi mua/go tu luc tai trang), chi bao thanh cong khi receipt
  // co status = 1 (khong dua vao viec MetaMask da mo hay da co tx hash).
  async function buyResaleFlow(listing, evt, tier) {
    if (!userAddress) {
      await connectWallet();
      if (!userAddress) return;
    }
    requireContract();
    requireRightNetwork();
    const fresh = await contract.tickets(listing.id);
    if (!fresh.forSale || fresh.checkedIn) throw userError("Vé này không còn được rao bán (đã có người mua hoặc chủ vé đã gỡ).");
    if (fresh.owner.toLowerCase() === userAddress.toLowerCase()) throw userError("Đây là vé của chính bạn.");
    if (evt && Number(evt.startTime) <= Math.floor(Date.now() / 1000)) throw userError("Sự kiện đã diễn ra, không thể mua lại vé.");
    const l = { id: listing.id, eventId: fresh.eventId, tierId: fresh.tierId, owner: fresh.owner, originalPrice: fresh.originalPrice, resalePrice: fresh.resalePrice };
    const ok = await confirmResaleModal(l, evt, tier);
    if (!ok) return;
    toast("Vui lòng xác nhận giao dịch trong ví…", "info");
    const tx = await contract.buyResaleTicket(l.id, { value: l.resalePrice });
    toast("Đã gửi giao dịch — đang chờ blockchain xác nhận…", "info");
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw userError("Giao dịch bị từ chối trên blockchain. Kiểm tra chi tiết trên Etherscan.");
    toast("Mua lại vé thành công — vé đã chuyển vào ví của bạn.", "success");
    route();
  }

  routes.resale = async function () {
    const myToken = renderToken;
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h1 class="h2">Vé bán lại</h1><p>Mọi vé dưới đây đang được rao bán lại trên hợp đồng ProjectCore.</p></div>
        </div>
        ${resaleRuleBanner()}
        <div id="resale-grid" class="grid-4">${skeletonCards(8)}</div>
      </div>
    `;
    let evts, tiers;
    try {
      [evts, tiers] = await Promise.all([fetchAllEvents(), fetchAllTiers()]);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error(err);
      document.getElementById("resale-grid").innerHTML = errorStateHtml("Không tải được dữ liệu", "Mạng/RPC đang chập chờn.");
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    await loadResaleInto("resale-grid", myToken, evts, tiers);
    syncMetaThenRefresh(evts.map((e) => e.id), () => { if (myToken === renderToken) loadResaleInto("resale-grid", myToken, evts, tiers); });
  };

  // ---------- Page: Events list (khám phá) ----------

  function normalizeText(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  }

  routes.events = async function (query) {
    const myToken = renderToken;
    const state = {
      q: query.get("q") || "",
      cat: query.get("cat") || "",
      sort: ["new", "soon", "price"].includes(query.get("sort")) ? query.get("sort") : "new",
      past: query.get("past") === "1",
    };
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5); margin-bottom: 0;">
          <div><h1 class="h2">Khám phá sự kiện</h1><p>Tìm sự kiện theo tên, địa điểm hoặc danh mục.</p></div>
        </div>
        <nav class="category-bar" id="ev-cats" aria-label="Lọc theo danh mục">
          <button type="button" class="cat-chip" data-cat="">${icon("grid")} Tất cả</button>
          ${CATEGORIES.map((c) => `<button type="button" class="cat-chip" data-cat="${c.id}">${icon(c.icon)} ${c.label}</button>`).join("")}
        </nav>
        <div class="events-toolbar">
          <label class="field-search">${icon("search")}<input type="search" id="ev-q" placeholder="Tên sự kiện, địa điểm…" aria-label="Tìm sự kiện" value="${escapeAttr(state.q)}" /></label>
          <select id="ev-sort" aria-label="Sắp xếp">
            <option value="new">Mới nhất</option>
            <option value="soon">Sắp diễn ra</option>
            <option value="price">Giá thấp đến cao</option>
          </select>
          <label class="toggle-label"><input type="checkbox" id="ev-past" ${state.past ? "checked" : ""} /> Hiện sự kiện đã diễn ra</label>
        </div>
        <div class="result-count" id="ev-count" aria-live="polite"></div>
        <div id="events-grid" class="grid-4">${skeletonCards(8)}</div>
      </div>
    `;
    document.getElementById("ev-sort").value = state.sort;
    const qInput = document.getElementById("ev-q");
    if (query.get("focus") === "1") qInput.focus();

    let evts = null, byEvent = new Map();

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      if (state.cat) p.set("cat", state.cat);
      if (state.sort !== "new") p.set("sort", state.sort);
      if (state.past) p.set("past", "1");
      const qs = p.toString();
      history.replaceState(null, "", "#/events" + (qs ? "?" + qs : ""));
    }

    function apply() {
      if (myToken !== renderToken) return;
      document.querySelectorAll("#ev-cats [data-cat]").forEach((b) => {
        const on = b.dataset.cat === state.cat;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (!evts) return;
      const grid = document.getElementById("events-grid");
      const countEl = document.getElementById("ev-count");
      const nowTs = Math.floor(Date.now() / 1000);
      const q = normalizeText(state.q.trim());
      const tiersOf = (e) => byEvent.get(String(e.id)) || [];
      let list = evts.filter((e) => {
        const meta = getMeta(e.id);
        if (!state.past && Number(e.startTime) <= nowTs) return false;
        if (state.cat && categoryOf(meta.category).id !== state.cat) return false;
        if (q && !normalizeText(e.name + " " + (meta.location || "")).includes(q)) return false;
        return true;
      });
      if (state.sort === "new") list.sort((a, b) => Number(b.id - a.id));
      if (state.sort === "soon") list.sort((a, b) => {
        const ea = Number(a.startTime) <= nowTs, eb = Number(b.startTime) <= nowTs;
        if (ea !== eb) return ea ? 1 : -1;
        return Number(a.startTime) - Number(b.startTime);
      });
      if (state.sort === "price") list.sort((a, b) => {
        const pa = salesSummary(a, tiersOf(a)).minPrice, pb = salesSummary(b, tiersOf(b)).minPrice;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      });
      countEl.textContent = evts.length ? `${list.length} sự kiện` : "";
      if (list.length) {
        grid.innerHTML = list.map((e) => eventCardHtml(e, tiersOf(e))).join("");
      } else if (evts.length === 0) {
        grid.innerHTML = emptyState("Chưa có sự kiện nào", isConfigured() ? "Hãy là người đầu tiên tạo sự kiện." : "Chưa cấu hình kết nối hợp đồng.", `<a class="btn btn-primary" href="#/create" style="margin-top:16px;">Tạo sự kiện</a>`);
      } else {
        grid.innerHTML = emptyState("Không tìm thấy sự kiện phù hợp", state.past ? "Thử từ khoá hoặc danh mục khác." : "Thử từ khoá khác, hoặc bật “Hiện sự kiện đã diễn ra”.", `<button type="button" class="btn btn-secondary btn-sm" id="ev-reset" style="margin-top:16px;">Xoá bộ lọc</button>`);
        document.getElementById("ev-reset").addEventListener("click", () => {
          state.q = ""; state.cat = ""; state.past = false;
          qInput.value = "";
          document.getElementById("ev-past").checked = false;
          syncUrl(); apply();
        });
      }
    }

    let debounce;
    qInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.q = qInput.value; syncUrl(); apply(); }, 250);
    });
    document.getElementById("ev-sort").addEventListener("change", (e) => { state.sort = e.target.value; syncUrl(); apply(); });
    document.getElementById("ev-past").addEventListener("change", (e) => { state.past = e.target.checked; syncUrl(); apply(); });
    document.querySelectorAll("#ev-cats [data-cat]").forEach((b) => b.addEventListener("click", () => { state.cat = b.dataset.cat; syncUrl(); apply(); }));
    apply();

    try {
      const [e, t] = await Promise.all([fetchAllEvents(), fetchAllTiers()]);
      if (myToken !== renderToken) return;
      evts = e;
      byEvent = tiersByEvent(t);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được sự kiện:", err);
      document.getElementById("events-grid").innerHTML = errorStateHtml("Không tải được danh sách sự kiện", "Mạng/RPC đang chập chờn.");
      wireRetry();
      return;
    }
    apply();
    syncMetaThenRefresh(evts.map((e) => e.id), apply);
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
    // ProjectCore.mintTicket() KHONG chan mint sau gio bat dau -> chan o giao dien.
    const eventEnded = Math.floor(Date.now() / 1000) >= Number(evt.startTime);
    const meta = getMeta(id);
    const img = eventImage(meta, id);
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
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                <h3>Hạng vé</h3>
                <button id="btn-refresh-tiers" type="button" class="btn btn-ghost btn-sm" aria-label="Tải lại hạng vé">↻ Tải lại</button>
              </div>
              <div id="tier-list">${tierListHtml(tiers)}</div>
            </div>

            <button id="btn-go-checkout" class="btn btn-primary btn-block btn-lg" style="margin-top: var(--sp-3);" ${tiers.length === 0 || eventEnded ? "disabled" : ""}>
              ${eventEnded ? "Sự kiện đã diễn ra" : tiers.length === 0 ? "Chưa có hạng vé" : "Mua vé →"}
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
      if (!selected || eventEnded) return;
      const tier = tiers[selected.index];
      window.location.hash = "#/checkout/" + id.toString() + "/" + tier.id.toString() + "/" + selected.qty;
    });

    document.getElementById("btn-refresh-tiers")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      tiersCache = null;
      route();
    }));

    if (isOrganizer) wireOrganizerPanel(id);

    syncMetaThenRefresh([id], () => { if (myToken === renderToken) route(); });
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
      const receipt = await tx.wait();
      toast("Đã tạo hạng vé mới.", "success");
      tiersCache = null;
      // RPC cong khai doi khi can mot nhip de "nhin thay" block vua xac nhan
      // qua eth_call tiep theo - thu doc lai tier vua tao (toi da 5 lan, moi
      // lan cach nhau 1s) truoc khi ve-render, thay vi doan bua 1 khoang tre.
      const log = receipt.logs.map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } }).find((l) => l && l.name === "TierCreated");
      const newTierId = log ? log.args.tierId : null;
      if (newTierId !== null) {
        for (let i = 0; i < 5; i++) {
          const t = await contract.tiers(newTierId);
          if (t.eventId === eventId) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
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

  const CREATE_DRAFT_KEY = "fairticket:create-draft";

  routes.create = function () {
    let step = 1;
    let data = { name: "", category: "", description: "", startTime: "", endTime: "", location: "", image: "", maxSupply: "", price: "" };

    // Lop an toan thu 2: khoi phuc nhap neu bi F5/mat ket noi mang giua chung
    // (lop thu 1 la handleWalletChange() khong con ep reload trang nua).
    try {
      const saved = JSON.parse(sessionStorage.getItem(CREATE_DRAFT_KEY) || "null");
      if (saved && saved.data && saved.data.name) {
        data = Object.assign(data, saved.data);
        step = saved.step || 1;
        setTimeout(() => toast("Đã khôi phục thông tin đang điền dở.", "info"), 300);
      }
    } catch {}

    function saveDraft() {
      try { sessionStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify({ step, data })); } catch {}
    }
    function clearDraft() {
      try { sessionStorage.removeItem(CREATE_DRAFT_KEY); } catch {}
    }

    function render() {
      saveDraft();
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

    // Lien ket moi o nhap voi `data` + luu nhap NGAY khi go (khong doi bam
    // "Tiep tuc") - de F5 giua chung van khong mat chu dang go dang.
    const FIELD_MAP = { "f-name": "name", "f-cat": "category", "f-desc": "description", "f-start": "startTime", "f-end": "endTime", "f-loc": "location", "f-supply": "maxSupply", "f-price": "price" };
    function bindLiveInputs() {
      Object.keys(FIELD_MAP).forEach((elId) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.addEventListener("input", () => {
          data[FIELD_MAP[elId]] = el.value;
          saveDraft();
        });
      });
    }

    function renderStep() {
      const panel = document.getElementById("wizard-panel");
      if (step === 1) {
        panel.innerHTML = `
          <div class="field">
            <label for="f-name">Tên sự kiện</label>
            <input id="f-name" placeholder="VD: UEH Music Night 2026" value="${escapeAttr(data.name)}" />
          </div>
          <div class="field">
            <label for="f-cat">Danh mục</label>
            <select id="f-cat">
              <option value="">— Chọn danh mục —</option>
              ${CATEGORIES.map((c) => `<option value="${c.id}" ${data.category === c.id ? "selected" : ""}>${c.label}</option>`).join("")}
            </select>
            <p class="hint">Dùng để lọc/tìm sự kiện. Lưu cùng ảnh &amp; mô tả (ngoài blockchain).</p>
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
            <input id="f-loc" placeholder="VD: Nhà văn hóa Huế" value="${escapeAttr(data.location)}" />
          </div>
          <div class="field">
            <label>Ảnh sự kiện</label>
            <div class="upload-box">Kéo-thả hoặc chọn ảnh (lưu cục bộ trong trình duyệt — chưa hỗ trợ upload lên server).<br/>
              <input type="file" id="f-image" accept="image/*" style="margin-top:8px;" />
            </div>
          </div>
          <div class="wizard-actions">
            <a href="#/my-events" class="btn btn-ghost" id="btn-cancel-wizard">Hủy</a>
            <button id="btn-next-1" class="btn btn-primary">Tiếp tục →</button>
          </div>
        `;
        bindLiveInputs();
        document.getElementById("btn-cancel-wizard").addEventListener("click", clearDraft);
        document.getElementById("btn-next-1").addEventListener("click", () => {
          data.name = document.getElementById("f-name").value.trim();
          data.category = document.getElementById("f-cat").value;
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
              <input id="f-supply" type="number" min="1" step="1" placeholder="VD: 100" value="${escapeAttr(data.maxSupply)}" />
            </div>
            <div class="field">
              <label for="f-price">Giá vé (ETH)</label>
              <input id="f-price" type="number" min="0" step="0.0001" placeholder="VD: 0.02" value="${escapeAttr(data.price)}" />
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
        bindLiveInputs();
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
              <div class="review-row"><span class="review-row__label">Danh mục</span><span class="review-row__value">${categoryOf(data.category).label}</span></div>
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
          const newMeta = { description: data.description, location: data.location, image: data.image, category: categoryOf(data.category).id };
          saveMeta(newEventId, newMeta);
          publishMetaToServer(newEventId, newMeta); // khong chan luong deploy neu loi mang

          toast("Đang tạo hạng vé Standard… (giao dịch 2/2)", "info");
          const tx2 = await contract.createTier(newEventId, "Standard", ethers.parseEther(data.price), BigInt(data.maxSupply));
          await tx2.wait();

          toast("Tạo sự kiện thành công!", "success");
          clearDraft();
          eventsCache = null;
          tiersCache = null;
          window.location.hash = "#/events/" + newEventId.toString();
        }));
      }
    }

    render();
  };

  // ---------- Page: My events ----------

  routes.myEvents = async function (startTab) {
    const myToken = renderToken;
    const onTickets = startTab === "tickets";
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h1 class="h2">${onTickets ? "Vé của tôi" : "Sự kiện của tôi"}</h1><p>Sự kiện bạn tổ chức và vé bạn sở hữu, tất cả đọc trực tiếp từ blockchain.</p></div>
          <a href="#/create" class="btn btn-primary">+ Tạo sự kiện mới</a>
        </div>

        <div class="tabs">
          <button class="tab${onTickets ? "" : " active"}" data-subtab="organizer">Sự kiện của tôi</button>
          <button class="tab${onTickets ? " active" : ""}" data-subtab="tickets">Vé của tôi</button>
        </div>

        <div id="panel-organizer" ${onTickets ? "hidden" : ""}>
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

        <div id="panel-tickets" ${onTickets ? "" : "hidden"}>
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
        const tickets = btn.dataset.subtab === "tickets";
        document.getElementById("panel-organizer").hidden = tickets;
        document.getElementById("panel-tickets").hidden = !tickets;
        $root().querySelector("h1").textContent = tickets ? "Vé của tôi" : "Sự kiện của tôi";
        history.replaceState(null, "", tickets ? "#/my-tickets" : "#/my-events");
        renderHeader();
      });
    });

    // Dang ky click nut Rut tien DUY NHAT 1 LAN o day (luc HTML vua duoc tao).
    // Truoc day dang ky ben trong renderMyTickets() - ham nay tu goi lai chinh
    // no sau moi lan rut/rao ban thanh cong de refresh UI, nen moi lan goi lai
    // la gan THEM 1 listener nua vao cung nut (nut khong bi thay moi) - bam
    // 1 cai thi goi withdrawProceeds() 2-3 lan chong nhau, lan sau bi revert
    // NothingToWithdraw() vi lan dau da rut het roi -> hien loi gay nham lan.
    document.getElementById("btn-withdraw").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      requireWallet();
      requireContract();
      const tx = await contract.withdrawProceeds();
      toast("Đang xác nhận giao dịch…", "info");
      await tx.wait();
      toast("Đã rút tiền về ví.", "success");
      await renderMyTickets();
    }));

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
            <img class="event-row__thumb" src="${eventImage(meta, evt.id)}" alt="" />
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

    syncMetaThenRefresh(mine.map((e) => e.id), () => {
      if (myToken !== renderToken) return;
      const activeChip = document.querySelector(".chip.active");
      renderRows(activeChip ? activeChip.dataset.f : "all");
    });
  };

  async function renderMyTickets() {
    const myToken = renderToken;
    const c = await ensureReadContract();
    if (myToken !== renderToken) return;
    const balEl = document.getElementById("pending-balance");
    const listEl = document.getElementById("my-tickets-list");
    const histEl = document.getElementById("history-list");
    if (!c || !userAddress || !balEl || !listEl || !histEl) return;

    // 2 khoi ben duoi (danh sach ve, lich su giao dich) chay doc lap va
    // deu co try/catch rieng: 1 khoi loi khong duoc keo khoi kia (va ca
    // trang) dung yen mai o "Dang tai..." ma khong bao loi gi (bug thuc
    // te phat hien khi test - RPC cong khai/MetaMask loi giua chung ma
    // truoc day khong bat duoc).
    try {
      const pending = await c.pendingWithdrawals(userAddress);
      if (myToken !== renderToken) return;
      balEl.textContent = fmtEth(pending) + " ETH";

      const ticketCount = await c.nextTicketId();
      if (myToken !== renderToken) return;
      // Doc song song (khong await tuan tu tung ve mot) - voi contract
      // dung chung ca lop, so ve co the kha nhieu, doc tuan tu se rat
      // cham va de bi "ngo nhan" la treo.
      const ids = Array.from({ length: Number(ticketCount) }, (_, i) => BigInt(i));
      const allTickets = await Promise.all(ids.map((id) => c.tickets(id)));
      if (myToken !== renderToken) return;
      // Khong dung Object.assign({}, t) de "sao chep" t (ket qua tra ve tu
      // ethers v6 la mot Result - Proxy, cac truong ten (owner, eventId...)
      // chi truy cap duoc qua getter cua Proxy, KHONG phai own-enumerable
      // property) - Object.assign se chi copy duoc cac index so (0,1,2...)
      // va lam mat het truong ten, khien t.owner undefined ngay sau do (bug
      // thuc te phat hien khi test: "Cannot read properties of undefined
      // (reading 'toLowerCase')"). Phai doc tung truong ten ra object thuong.
      const owned = allTickets
        .map((t, i) => ({
          id: ids[i],
          eventId: t.eventId,
          tierId: t.tierId,
          owner: t.owner,
          originalPrice: t.originalPrice,
          resalePrice: t.resalePrice,
          forSale: t.forSale,
          checkedIn: t.checkedIn,
        }))
        .filter((t) => t.owner.toLowerCase() === userAddress.toLowerCase());

      await renderOwnedTickets(owned, listEl);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được vé của tôi:", err);
      listEl.innerHTML = `<div class="empty-state"><h3>Không tải được danh sách vé</h3><p>Có thể do mạng/RPC chập chờn. Thử lại nhé.</p><button id="btn-retry-tickets" class="btn btn-secondary btn-sm">Thử lại</button></div>`;
      document.getElementById("btn-retry-tickets")?.addEventListener("click", () => renderMyTickets());
    }

    try {
      await renderTicketHistory(histEl, myToken);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được lịch sử giao dịch:", err);
      histEl.innerHTML = `<div class="empty-state"><h3>Không tải được lịch sử</h3><p>Có thể do mạng/RPC chập chờn. Thử lại nhé.</p><button id="btn-retry-history" class="btn btn-secondary btn-sm">Thử lại</button></div>`;
      document.getElementById("btn-retry-history")?.addEventListener("click", () => renderMyTickets());
    }
  }

  async function renderOwnedTickets(owned, listEl) {
    if (owned.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><h3>Chưa sở hữu vé nào</h3><p>Mua vé ở trang Sự kiện để thấy vé tại đây.</p></div>`;
    } else {
      const c = await ensureReadContract();
      const rows = await Promise.all(owned.map(async (t) => {
        const evt = await c.events(t.eventId);
        const tier = await c.tiers(t.tierId);
        return { t, evt, tier };
      }));
      listEl.innerHTML = rows.map(({ t, evt, tier }) => `
          <div class="event-row" style="align-items:flex-start;">
            <div class="qr-thumb" data-qr="${t.id}" data-view="${t.id}" style="width:64px;height:64px;flex-shrink:0;cursor:pointer;" title="Xem vé"></div>
            <div class="event-row__main">
              <div class="event-row__title">${escapeHtml(evt.name)} <span class="text-tertiary">· ${escapeHtml(tier.name)} · Vé #${t.id}</span></div>
              <div class="event-row__meta">Giá gốc ${fmtEth(t.originalPrice)} ETH ${t.forSale ? "· đang rao bán " + fmtEth(t.resalePrice) + " ETH" : ""} ${t.checkedIn ? "· đã check-in" : ""}</div>
            </div>
            <div class="event-row__actions">
              <button class="btn btn-ghost btn-sm" data-view="${t.id}">Xem vé</button>
              ${t.checkedIn
                ? '<span class="badge badge-neutral">Đã check-in</span>'
                : t.forSale
                  ? '<span class="badge badge-primary">Đang rao bán</span>'
                  : `<button class="btn btn-secondary btn-sm" data-resell="${t.id}" data-price="${t.originalPrice}">Rao bán lại</button>`}
            </div>
          </div>`).join("");

      listEl.querySelectorAll("[data-qr]").forEach((el) => renderQrInto(el, el.dataset.qr));

      listEl.querySelectorAll("[data-view]").forEach((el) => {
        el.addEventListener("click", () => {
          const row = rows.find((r) => r.t.id.toString() === el.dataset.view);
          if (row) showTicketDetailModal(row.t, row.evt, row.tier);
        });
      });

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
  }

  // RPC cong khai/MetaMask thuong gioi han pham vi block cho 1 lan
  // eth_getLogs (vd toi da ~10.000-50.000 block) - truoc day quet "tu
  // block 0" se bi RPC tu choi, loi do khong duoc bat nen ca trang dung
  // yen vinh vien o "Dang tai...". Contract nay chi moi deploy gan day
  // nen chi can quet ~7 ngay gan nhat (~50.000 block tren Sepolia) la du.
  const HISTORY_LOOKBACK_BLOCKS = 50_000;

  async function renderTicketHistory(histEl, myToken) {
    if (!contract) {
      histEl.innerHTML = `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Kết nối ví để xem lịch sử.</p>`;
      return;
    }

    // TicketMinted khai bao "buyer" KHONG indexed (xem event trong
    // ProjectCore.sol) nen khong loc duoc qua topic nhu may event con lai -
    // bug thuc te phat hien khi test: ethers nem loi "cannot filter
    // non-indexed parameters". Phai lay het log Mint trong khoang block roi
    // tu loc lai bang JS theo args.buyer.
    const indexedFilters = [
      { name: "Bán lại vé (nhận tiền)", filter: contract.filters.TicketResold(null, userAddress, null) },
      { name: "Mua lại vé", filter: contract.filters.TicketResold(null, null, userAddress) },
      { name: "Rao bán vé", filter: contract.filters.TicketListedForResale(null, userAddress) },
      { name: "Rút tiền", filter: contract.filters.ProceedsWithdrawn(userAddress) },
      { name: "Check-in vé", filter: contract.filters.TicketCheckedIn(null, userAddress) },
    ];

    const latest = await provider.getBlockNumber();
    if (myToken !== renderToken) return;
    const fromBlock = Math.max(0, latest - HISTORY_LOOKBACK_BLOCKS);

    let evts = [];
    for (const { name, filter } of indexedFilters) {
      const logs = await contract.queryFilter(filter, fromBlock, "latest");
      if (myToken !== renderToken) return;
      evts = evts.concat(logs.map((l) => ({ name, log: l })));
    }

    const mintLogs = await contract.queryFilter(contract.filters.TicketMinted(), fromBlock, "latest");
    if (myToken !== renderToken) return;
    evts = evts.concat(
      mintLogs
        .filter((l) => l.args.buyer.toLowerCase() === userAddress.toLowerCase())
        .map((l) => ({ name: "Mint vé", log: l }))
    );

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
    if (Math.floor(Date.now() / 1000) >= Number(evt.startTime)) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Sự kiện đã diễn ra</h3><p>Không thể mua vé cho sự kiện đã bắt đầu.</p><a class="btn btn-secondary" href="#/events/${eventId}" style="margin-top:16px;">← Quay lại sự kiện</a></div></div>`;
      return;
    }

    const total = tier.price * BigInt(qty);

    $root().innerHTML = h`
      <div class="page container">
        <div class="checkout-wrap">
          <div class="checkout-steps"><b>Thông tin vé</b> → Xác nhận → Thanh toán</div>

          <div class="card mini-event-card">
            <img src="${eventImage(meta, eventId)}" alt="" />
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

    syncMetaThenRefresh([eventId], () => { if (myToken === renderToken) route(); });
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
      etherscanLink.href = ETHERSCAN + "/address/" + CONTRACT_ADDRESS;
    }
    const caEl = document.getElementById("footer-ca");
    if (caEl && isConfigured()) {
      caEl.innerHTML = `<a href="${ETHERSCAN}/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener" title="${CONTRACT_ADDRESS}">${shortAddr(CONTRACT_ADDRESS)}</a>`;
    }
    const searchForm = document.getElementById("header-search");
    if (searchForm) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = document.getElementById("header-search-input").value.trim();
        const target = "#/events" + (q ? "?q=" + encodeURIComponent(q) : "");
        if (window.location.hash === target) route(); else window.location.hash = target;
      });
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
      window.ethereum.on("accountsChanged", handleWalletChange);
      window.ethereum.on("chainChanged", handleWalletChange);
    }
  });

  /// Doi ví/đổi mạng trong MetaMask truoc day ep window.location.reload() -
  /// xoa sach moi du lieu dang nhap do (VD giua chung wizard Tao su kien).
  /// Gio chi cap nhat lai provider/signer/contract tai cho, khong tai trang.
  /// Rieng khi dang o wizard "Tao su kien" thi KHONG re-render lai trang
  /// (de khong mat du lieu dang go), chi bao cho nguoi dung biet da cap nhat.
  async function handleWalletChange() {
    if (!window.ethereum) return;
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      readContract = null;
      eventsCache = null;
      tiersCache = null;
      const accounts = await provider.send("eth_accounts", []);
      let userDisconnected = false;
      try { userDisconnected = !!localStorage.getItem(DISCONNECTED_KEY); } catch {}
      if (!accounts || accounts.length === 0 || userDisconnected) {
        userAddress = null;
        signer = null;
        contract = null;
        chainId = null;
        renderHeader();
        return;
      }
      await setupWalletSession();
      renderHeader();

      const hash = window.location.hash.slice(1) || "/";
      const base = hash.split("/").filter(Boolean)[0] || "";
      if (base === "create") {
        toast("Đã cập nhật ví/mạng — tiếp tục điền thông tin, không bị mất.", "info");
      } else {
        route();
      }
    } catch (err) {
      console.warn("Lỗi khi cập nhật ví/mạng:", err);
    }
  }
})();
