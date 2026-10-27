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

  const CONTRACT_ADDRESS = "0x7c574216844854C04878B41D68d58F50a54cA0AF"; // ProjectCore.sol v3 (CTV soat ve, checkIn theo su kien, go rao ban) - Sepolia, deploy 27/10/2026
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
    NotCheckInAuthorized: "Ví này không có quyền soát vé cho sự kiện này (cần là Organizer hoặc CTV được cấp quyền).",
    TicketNotInEvent: "Vé không thuộc sự kiện đang soát.",
    ZeroAddress: "Địa chỉ ví không hợp lệ.",
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
    try { return ethers.formatEther(wei).replace(/\.0$/, ""); } catch { return "0"; }
  }

  // Rut gon de doc: toi da `dp` chu so thap phan; qua nho thi ghi "< 0.000001".
  function fmtEthShort(wei, dp) {
    const d = dp || 6;
    const n = Number(ethers.formatEther(wei));
    if (n > 0 && n < Math.pow(10, -d)) return "< " + Math.pow(10, -d).toFixed(d);
    return String(Number(n.toFixed(d)));
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

  // Vi (MetaMask...) hay boc du lieu revert sau nhieu lop -> ethers bao
  // "unknown custom error". Tu tim chuoi hex trong loi va giai ma theo ABI.
  function revertNameFrom(err) {
    if (err?.revert?.name) return err.revert.name;
    if (!CONTRACT_ABI) return null;
    const iface = new ethers.Interface(CONTRACT_ABI);
    const seen = new Set();
    const stack = [err];
    while (stack.length) {
      const x = stack.pop();
      if (!x || typeof x !== "object" || seen.has(x)) continue;
      seen.add(x);
      for (const v of Object.values(x)) {
        if (typeof v === "string" && /^0x[0-9a-fA-F]{8}/.test(v)) {
          try { const parsed = iface.parseError(v); if (parsed) return parsed.name; } catch {}
        } else if (v && typeof v === "object") stack.push(v);
      }
    }
    return null;
  }

  function friendlyError(err) {
    if (err?.userFacing) return err.message;
    const revertName = revertNameFrom(err);
    if (revertName && ERROR_MESSAGES[revertName]) return ERROR_MESSAGES[revertName];
    if (err?.code === "ACTION_REJECTED" || err?.code === 4001 || err?.info?.error?.code === 4001) return "Bạn đã từ chối giao dịch trong ví.";
    if (err?.revert?.name && ERROR_MESSAGES[err.revert.name]) return ERROR_MESSAGES[err.revert.name];
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

  // Hien ma check-in toan man hinh nen trang: QR cang to va tuong phan cang
  // cao thi camera cang de doc (nhat la khi quet man hinh dien thoai).
  function showQrFullscreen(code, label) {
    const el = document.createElement("div");
    el.className = "qr-fullscreen";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Mã check-in phóng to");
    el.innerHTML = `<div class="qr-fullscreen__code"></div><div class="qr-fullscreen__label">${escapeHtml(label)} · tăng độ sáng màn hình · chạm để đóng</div>`;
    renderQrInto(el.querySelector(".qr-fullscreen__code"), code, "Alphanumeric");
    const close = () => el.remove();
    el.addEventListener("click", close);
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    el.tabIndex = -1;
    document.body.appendChild(el);
    el.focus();
  }

  /// Modal ve dien tu: QR to de xuat trinh tai cong + thong tin xac minh
  /// (CA, so ve, chu so huu doc lai tu chain) + lich su rieng cua ve nay.
  function showTicketDetailModal(t, evt, tier) {
    const meta = getMeta(t.eventId);
    const st = ticketState(t, evt);
    // Check-in dien ra SAU gio bat dau nen van cho tao ma khi su kien da bat dau.
    const canMakeCode = !t.checkedIn && sameAddr(userAddress, t.owner);
    let codeTimer = null;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card modal-card--wide ticket-modal" role="dialog" aria-modal="true" aria-labelledby="tm-title">
        <div class="ticket-modal__head">
          <div class="qr-thumb" id="modal-qr"></div>
          <div class="ticket-modal__info">
            <span class="badge ${st.cls}">${st.label}</span>
            <span class="badge badge-primary">${categoryOf(meta.category).label}</span>
            <h3 id="tm-title">${escapeHtml(evt ? evt.name : "Sự kiện #" + t.eventId)}</h3>
            <p class="text-sm text-secondary">${escapeHtml(tier ? tier.name : "Hạng #" + t.tierId)} · <span class="mono">Vé #${t.id}</span></p>
            <p class="text-sm" style="margin-top:6px;">${evt ? fmtCardDate(evt.startTime) : ""}<br />${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</p>
            ${mapQuery(meta) ? `<a class="link text-sm" href="${escapeAttr(mapDirectionsUrl(mapQuery(meta)))}" target="_blank" rel="noopener">${icon("pin")} Chỉ đường tới sự kiện</a>` : ""}
          </div>
        </div>
        ${canMakeCode ? `
        <div class="checkin-code" id="tm-code-box">
          <button type="button" class="btn btn-accent btn-block" id="tm-make-code">Tạo mã check-in (ký bằng ví, miễn phí)</button>
          <button type="button" class="btn btn-secondary btn-block" id="tm-zoom" style="margin-top:8px;" hidden>Phóng to mã toàn màn hình</button>
          <p class="hint-sm" id="tm-code-hint">Mã vào cửa có chữ ký của ví chủ vé và tự hết hạn sau 5 phút — ảnh chụp lại hay mã gửi cho người khác đều không dùng được. Mã đang hiển thị phía trên chỉ là số vé để tra cứu.</p>
        </div>` : `<p class="hint-sm">${t.checkedIn ? "Vé đã được check-in — không thể dùng lại." : "Mở trang này bằng ví đang giữ vé để tạo mã check-in."}</p>`}
        <div class="info-list" style="margin-top: var(--sp-3);">
          <div class="info-row"><div class="info-row__label">Chủ sở hữu</div><div class="info-row__value"><span class="mono">${shortAddr(t.owner)}</span> <span class="text-sm text-secondary" id="tm-owner-check">· đang xác minh…</span></div></div>
          <div class="info-row"><div class="info-row__label">Giá gốc</div><div class="info-row__value tabular-nums">${fmtEth(t.originalPrice)} ETH</div></div>
          ${t.forSale ? `<div class="info-row"><div class="info-row__label">Đang rao bán</div><div class="info-row__value tabular-nums">${fmtEth(t.resalePrice)} ETH</div></div>` : ""}
          <div class="info-row"><div class="info-row__label">Hợp đồng (CA)</div><div class="info-row__value"><a class="mono link" href="${ETHERSCAN}/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener">${shortAddr(CONTRACT_ADDRESS)}</a> <button type="button" class="copy-btn" data-copy="${CONTRACT_ADDRESS}">Sao chép</button></div></div>
          <div class="info-row"><div class="info-row__label">Mã định danh</div><div class="info-row__value mono">Event #${t.eventId} · Tier #${t.tierId} · Ticket #${t.id}</div></div>
        </div>
        <h4 class="ticket-modal__subhead">Lịch sử của vé</h4>
        <div id="tm-history" class="text-sm text-secondary">Đang tải…</div>
        <div class="wizard-actions" style="margin-top: var(--sp-4); padding-top: 0; border-top: none;">
          <a class="btn btn-ghost" href="#/events/${t.eventId}" data-action="goto">Trang sự kiện</a>
          <button type="button" class="btn btn-primary" data-action="close">Đóng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    renderQrInto(overlay.querySelector("#modal-qr"), String(t.id));
    overlay.querySelectorAll("[data-copy]").forEach(bindCopy);
    const closeBtn = overlay.querySelector('[data-action="close"]');
    closeBtn.focus();
    function close() { clearInterval(codeTimer); overlay.remove(); }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    closeBtn.addEventListener("click", close);
    overlay.querySelector('[data-action="goto"]').addEventListener("click", close);

    overlay.querySelector("#tm-zoom")?.addEventListener("click", () => {
      const code = overlay.querySelector("#modal-qr").dataset.code;
      if (code) showQrFullscreen(code, "Vé #" + t.id);
    });
    const makeBtn = overlay.querySelector("#tm-make-code");
    makeBtn?.addEventListener("click", () => withBusy(makeBtn, async () => {
      requireWallet();
      const { code, expiresAt } = await createCheckinCode(t.id);
      const qrEl = overlay.querySelector("#modal-qr");
      qrEl.classList.add("is-dynamic");
      qrEl.classList.remove("is-expired");
      qrEl.dataset.code = code;
      renderQrInto(qrEl, code, "Alphanumeric");
      overlay.querySelector("#tm-zoom").hidden = false;
      makeBtn.textContent = "Tạo mã mới";
      clearInterval(codeTimer);
      const hint = overlay.querySelector("#tm-code-hint");
      const tick = () => {
        const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        if (left === 0) {
          clearInterval(codeTimer);
          qrEl.classList.add("is-expired");
          hint.innerHTML = "<strong>Mã đã hết hạn.</strong> Bấm “Tạo mã mới” khi tới lượt check-in.";
          return;
        }
        hint.innerHTML = `<strong>Mã check-in hợp lệ còn ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}.</strong> Đưa màn hình này cho nhân viên quét.`;
      };
      tick();
      codeTimer = setInterval(tick, 1000);
    }, { keepContentOnSuccess: true }));
    overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    (async () => {
      try {
        const c = await ensureReadContract();
        const fresh = await c.tickets(t.id);
        const el = overlay.querySelector("#tm-owner-check");
        if (el) el.textContent = fresh.owner.toLowerCase() === t.owner.toLowerCase() ? "· đã xác minh trên chain lúc " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "· chủ vé đã thay đổi, tải lại trang";
        const names = { TicketMinted: "Phát hành (mua lần đầu)", TicketListedForResale: "Rao bán lại", TicketResaleCancelled: "Gỡ rao bán", TicketResold: "Đổi chủ (mua lại)", TicketCheckedIn: "Check-in tại cửa" };
        const rows = (await fetchAllContractLogs(true))
          .filter((x) => names[x.name] && x.args.ticketId === t.id)
          .map((x) => ({ x, name: names[x.name] }))
          .sort((a, b) => a.x.blockNumber - b.x.blockNumber || a.x.index - b.x.index);
        const box = overlay.querySelector("#tm-history");
        if (!box) return;
        box.innerHTML = rows.length
          ? `<ol class="ticket-timeline">${rows.map(({ x, name }) => `<li><span>${name}</span><a class="mono link" href="${ETHERSCAN}/tx/${x.transactionHash}" target="_blank" rel="noopener">${x.transactionHash.slice(0, 10)}…</a></li>`).join("")}</ol>`
          : "Chưa có giao dịch nào của vé này.";
      } catch (err) {
        console.warn("Không tải được lịch sử vé:", err);
        const box = overlay.querySelector("#tm-history");
        if (box) box.textContent = "Không tải được lịch sử (mạng/RPC). Thử mở lại sau.";
      }
    })();
  }

  // ---------- Ban do (Google Maps) ----------
  // Dung kieu nhung "maps?q=...&output=embed" - KHONG can API key (khong lo
  // khoa bi mat tren frontend). Dia chi la du lieu off-chain trong metadata.
  function mapQuery(meta) {
    if (!meta) return "";
    const address = String(meta.address || "").trim();
    const location = String(meta.location || "").trim();
    if (address && !meta.street && location) return location + ", " + address;
    return address || location;
  }
  function mapEmbedUrl(q) { return "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&hl=vi&z=16&output=embed"; }
  function mapSearchUrl(q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); }
  function mapDirectionsUrl(q) { return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(q); }
  function mapFrameHtml(q, extraCls) {
    return `<iframe class="map-frame ${extraCls || ""}" src="${escapeAttr(mapEmbedUrl(q))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ: ${escapeAttr(q)}" allowfullscreen></iframe>`;
  }
  // O nhap dia chi + ban do xem truoc (cap nhat sau khi ngung go 800ms).
  function mapPickerHtml(idPrefix, value, fallback) {
    const q = String(value || fallback || "").trim();
    return `
      <div class="map-picker">
        <div class="map-picker__preview" id="${idPrefix}-preview">${q ? mapFrameHtml(q) : `<div class="map-empty">${icon("pin", "icon")}<span>Nhập địa chỉ để xem bản đồ</span></div>`}</div>
        <a class="link text-sm" id="${idPrefix}-open" href="${q ? escapeAttr(mapSearchUrl(q)) : "#"}" target="_blank" rel="noopener" ${q ? "" : "hidden"}>Mở Google Maps để kiểm tra vị trí ${icon("external")}</a>
      </div>`;
  }
  function wireMapPicker(idPrefix, getQuery) {
    let timer;
    let lastQ = getQuery();
    const update = () => {
      const q = getQuery();
      if (q === lastQ) return;
      lastQ = q;
      const box = document.getElementById(idPrefix + "-preview");
      const link = document.getElementById(idPrefix + "-open");
      if (!box) return;
      box.innerHTML = q ? mapFrameHtml(q) : `<div class="map-empty">${icon("pin", "icon")}<span>Nhập địa chỉ để xem bản đồ</span></div>`;
      if (link) { link.hidden = !q; link.href = q ? mapSearchUrl(q) : "#"; }
    };
    return () => { clearTimeout(timer); timer = setTimeout(update, 800); };
  }

  // ---------- Dia chi kieu TMDT (Tinh/Thanh -> Phuong/Xa) ----------
  // Theo don vi hanh chinh moi (tu 1/7/2025: 34 tinh/thanh, bo cap huyen).
  // Du lieu tinh san trong assets/vn-units.json (khong phu thuoc API ngoai).
  let vnUnitsPromise = null;
  function loadVnUnits() {
    if (!vnUnitsPromise) {
      vnUnitsPromise = fetch("./assets/vn-units.json").then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then((d) => new Map(d.provinces.map(([name, wards]) => [name, wards])));
      vnUnitsPromise.catch(() => { vnUnitsPromise = null; });
    }
    return vnUnitsPromise;
  }
  function shortProvince(name) {
    return String(name || "").replace(/^(Thành phố|Tỉnh)\s+/, "");
  }
  function joinAddress(parts) {
    return [parts.street, parts.ward, parts.province].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
  }

  function addressFieldsHtml(prefix, parts) {
    return `
      <div class="addr-box">
        <div class="field-row">
          <div class="field">
            <label for="${prefix}-prov">Tỉnh / Thành phố</label>
            <select id="${prefix}-prov" disabled><option value="">Đang tải…</option></select>
          </div>
          <div class="field">
            <label for="${prefix}-ward">Phường / Xã</label>
            <input id="${prefix}-ward" list="${prefix}-ward-list" placeholder="Chọn tỉnh/thành trước" autocomplete="off" maxlength="120" value="${escapeAttr(parts.ward || "")}" disabled />
            <datalist id="${prefix}-ward-list"></datalist>
          </div>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label for="${prefix}-street">Số nhà, tên đường</label>
          <input id="${prefix}-street" placeholder="VD: 99 Hồ Đắc Di" maxlength="120" value="${escapeAttr(parts.street || "")}" />
        </div>
        <p class="hint-sm" id="${prefix}-addr-hint">Theo đơn vị hành chính mới (34 tỉnh/thành, không còn cấp quận/huyện). Gõ vào ô Phường/Xã để tìm nhanh.</p>
      </div>`;
  }

  // Gan su kien cho bo chon dia chi; onChange() goi moi khi dia chi doi.
  async function wireAddressFields(prefix, parts, onChange) {
    const prov = document.getElementById(prefix + "-prov");
    const ward = document.getElementById(prefix + "-ward");
    const street = document.getElementById(prefix + "-street");
    const list = document.getElementById(prefix + "-ward-list");
    let units;
    try {
      units = await loadVnUnits();
    } catch (err) {
      console.warn("Không tải được danh sách tỉnh/thành:", err);
      prov.innerHTML = `<option value="">Không tải được danh sách</option>`;
      return;
    }
    if (!document.body.contains(prov)) return;
    prov.innerHTML = `<option value="">— Chọn tỉnh/thành —</option>` + [...units.keys()].map((n) => `<option value="${escapeAttr(n)}">${escapeHtml(n)}</option>`).join("");
    prov.disabled = false;
    if (parts.province && units.has(parts.province)) prov.value = parts.province;
    const fillWards = () => {
      const wards = units.get(prov.value) || [];
      list.innerHTML = wards.map((w) => `<option value="${escapeAttr(w)}"></option>`).join("");
      ward.disabled = !prov.value;
      ward.placeholder = prov.value ? `Gõ để tìm trong ${wards.length} phường/xã` : "Chọn tỉnh/thành trước";
      if (ward.value && !wards.includes(ward.value)) ward.value = "";
    };
    fillWards();
    prov.addEventListener("change", () => { fillWards(); onChange(); });
    ward.addEventListener("input", onChange);
    street.addEventListener("input", onChange);
  }

  // Doc gia tri; tra ve { ok, parts, error } - phuong/xa phai nam trong danh sach.
  async function readAddressFields(prefix) {
    const val = (id) => (document.getElementById(prefix + "-" + id)?.value || "").trim();
    const parts = { province: val("prov"), ward: val("ward"), street: val("street") };
    if (parts.ward) {
      try {
        const units = await loadVnUnits();
        if (!(units.get(parts.province) || []).includes(parts.ward)) {
          return { ok: false, parts, error: "Phường/Xã phải chọn trong danh sách của tỉnh/thành đã chọn." };
        }
      } catch {}
    }
    return { ok: true, parts: { ...parts, address: joinAddress(parts) } };
  }

  // ---------- QR (hien thi ve) ----------

  /// Ve QR don gian ngay trong canvas, ma hoa 1 chuoi ngan (ticketId).
  /// Dung thu vien qrcode-generator (nho, khong phu thuoc gi khac).
  function renderQrInto(container, text, mode) {
    if (!window.qrcode) { container.textContent = "(Không tải được thư viện QR)"; return; }
    const qr = window.qrcode(0, "M");
    qr.addData(text, mode || "Byte");
    qr.make();
    // margin tinh bang DIEM ANH (khong phai so o): 16px = 4 o le trang theo
    // chuan QR. Truoc day margin 2 -> le chi nua o, may quet kho dinh vi ma.
    container.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 16 });
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
      if (!remote || (!remote.description && !remote.location && !remote.address && !remote.image && !remote.category)) return false;
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

  // Tra ve { ok, reason } - KHONG nem loi, vi du lieu da luu tren may nay;
  // nguoi goi tu quyet dinh bao cho nguoi dung the nao.
  async function publishMetaToServer(eventId, data) {
    if (!signer) return { ok: false, reason: "Chưa kết nối ví." };
    let signature, timestamp;
    try {
      timestamp = Date.now();
      // Phai khop CHINH XAC voi buildMessage() trong web/api/metadata.js -
      // server tu dung lai message tu (eventId, timestamp), khong tin
      // noi dung message do client gui len.
      const message = "FairTicket: cập nhật metadata sự kiện #" + eventId + " lúc " + timestamp;
      signature = await signer.signMessage(message);
    } catch (err) {
      return { ok: false, reason: friendlyError(err) };
    }
    try {
      const res = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: Number(eventId), data, timestamp, signature }),
      });
      if (!res.ok) {
        let reason = "Máy chủ trả lỗi " + res.status + ".";
        try { reason = (await res.json()).error || reason; } catch {}
        return { ok: false, reason };
      }
      metaSynced.add(String(eventId)); // da la nguon moi nhat, khong can tu doc lai
      return { ok: true };
    } catch (err) {
      console.warn("Không đồng bộ được metadata lên server:", err);
      return { ok: false, reason: "Không kết nối được máy chủ." };
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
    stopScanner();
    const { parts, query } = parseHash();
    renderHeader();
    window.scrollTo(0, 0);
    if (parts.length === 0) return routes.home();
    if (parts[0] === "events" && parts[1]) return routes.eventDetail(parts[1]);
    if (parts[0] === "events") return routes.events(query);
    if (parts[0] === "resale") return routes.resale(query);
    if (parts[0] === "create") return routes.create();
    if (parts[0] === "my-events") return routes.myEvents("organizer");
    if (parts[0] === "my-tickets") return routes.myEvents("tickets");
    if (parts[0] === "organizer") return routes.myEvents("organizer");
    if (parts[0] === "check-in") return routes.checkin(query);
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
      <a href="#/check-in" role="menuitem">${icon("shield")} Check-in tại cửa</a>
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

  function placeLabel(meta) {
    const loc = meta.location || "";
    const prov = shortProvince(meta.province);
    if (loc && prov) return loc + " · " + prov;
    return loc || prov || "Địa điểm cập nhật sau";
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
          <div class="event-card__meta">${icon("pin")}<span>${escapeHtml(placeLabel(meta))}</span></div>
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
    wireResaleBuy(el, shown, evtMap, tierMap);
  }

  function wireResaleBuy(el, shown, evtMap, tierMap) {
    el.querySelectorAll("[data-buy-resale]").forEach((btn) => {
      btn.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        const id = BigInt(btn.dataset.buyResale);
        const listing = shown.find((l) => l.id === id);
        await buyResaleFlow(listing, evtMap.get(String(listing.eventId)), tierMap.get(String(listing.tierId)));
      }));
    });
  }

  function resaleCardHtml(l, evt, tier, resoldCount) {
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
            ${resoldCount !== undefined ? `<div class="resale-card__sub">${resoldCount === 0 ? "Chưa từng đổi chủ" : `Đã đổi chủ ${resoldCount} lần`}</div>` : ""}
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

  routes.resale = async function (query) {
    const myToken = renderToken;
    const state = {
      ev: /^\d+$/.test(query.get("event") || "") ? query.get("event") : "",
      sort: ["new", "price", "diff"].includes(query.get("sort")) ? query.get("sort") : "new",
      past: query.get("past") === "1",
    };
    $root().innerHTML = h`
      <div class="page container">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h1 class="h2">Vé bán lại</h1><p>Vé người dùng đang rao bán lại — trạng thái đọc trực tiếp từ hợp đồng ProjectCore.</p></div>
        </div>
        ${resaleRuleBanner()}
        <div class="events-toolbar">
          <select id="rs-event" aria-label="Lọc theo sự kiện"><option value="">Tất cả sự kiện</option></select>
          <select id="rs-sort" aria-label="Sắp xếp">
            <option value="new">Mới rao bán</option>
            <option value="price">Giá thấp đến cao</option>
            <option value="diff">Chênh lệch so với giá gốc thấp nhất</option>
          </select>
          <label class="toggle-label"><input type="checkbox" id="rs-past" ${state.past ? "checked" : ""} /> Hiện vé của sự kiện đã diễn ra</label>
        </div>
        <div class="result-count" id="rs-count" aria-live="polite"></div>
        <div id="resale-grid" class="grid-4">${skeletonCards(8)}</div>
      </div>
    `;
    document.getElementById("rs-sort").value = state.sort;

    let evts, tiers, listings;
    try {
      [evts, tiers, listings] = await Promise.all([fetchAllEvents(), fetchAllTiers(), fetchResaleListings()]);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error(err);
      document.getElementById("resale-grid").innerHTML = errorStateHtml("Không tải được vé bán lại", "Mạng/RPC đang chập chờn.");
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    const evtMap = new Map(evts.map((e) => [String(e.id), e]));
    const tierMap = new Map(tiers.map((t) => [String(t.id), t]));
    let resoldCounts = null;

    const evSelect = document.getElementById("rs-event");
    const evIds = [...new Set(listings.map((l) => String(l.eventId)))];
    evSelect.innerHTML = `<option value="">Tất cả sự kiện</option>` + evIds.map((id) => `<option value="${id}">${escapeHtml(evtMap.get(id) ? evtMap.get(id).name : "Sự kiện #" + id)}</option>`).join("");
    evSelect.value = evIds.includes(state.ev) ? state.ev : "";

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.ev) p.set("event", state.ev);
      if (state.sort !== "new") p.set("sort", state.sort);
      if (state.past) p.set("past", "1");
      const qs = p.toString();
      history.replaceState(null, "", "#/resale" + (qs ? "?" + qs : ""));
    }
    const diffBps = (l) => (l.resalePrice - l.originalPrice) * 10000n / (l.originalPrice || 1n);

    function apply() {
      if (myToken !== renderToken) return;
      const nowTs = Math.floor(Date.now() / 1000);
      const list = listings.filter((l) => {
        const evt = evtMap.get(String(l.eventId));
        if (state.ev && String(l.eventId) !== state.ev) return false;
        if (!state.past && evt && Number(evt.startTime) <= nowTs) return false;
        return true;
      });
      if (state.sort === "new") list.sort((a, b) => Number(b.id - a.id));
      if (state.sort === "price") list.sort((a, b) => (a.resalePrice < b.resalePrice ? -1 : a.resalePrice > b.resalePrice ? 1 : 0));
      if (state.sort === "diff") list.sort((a, b) => { const x = diffBps(a), y = diffBps(b); return x < y ? -1 : x > y ? 1 : 0; });
      const countEl = document.getElementById("rs-count");
      if (list.length) {
        const min = list.reduce((m, l) => (l.resalePrice < m ? l.resalePrice : m), list[0].resalePrice);
        countEl.textContent = `${list.length} vé đang rao bán · giá thấp nhất ${fmtEth(min)} ETH`;
      } else countEl.textContent = "";
      const grid = document.getElementById("resale-grid");
      if (!list.length) {
        grid.innerHTML = listings.length
          ? emptyState("Không có vé phù hợp bộ lọc", state.past ? "Thử chọn sự kiện khác." : "Có thể vé đang rao bán thuộc sự kiện đã diễn ra — bật “Hiện vé của sự kiện đã diễn ra” để xem.")
          : emptyState("Chưa có vé nào đang được rao bán lại", "Khi chủ vé rao bán, vé sẽ xuất hiện tại đây với giá không vượt 110% giá gốc.", `<a class="btn btn-secondary btn-sm" href="#/my-tickets" style="margin-top:16px;">Rao bán vé của tôi</a>`);
        return;
      }
      grid.innerHTML = list.map((l) => resaleCardHtml(l, evtMap.get(String(l.eventId)), tierMap.get(String(l.tierId)), resoldCounts ? (resoldCounts.get(String(l.id)) || 0) : undefined)).join("");
      wireResaleBuy(grid, list, evtMap, tierMap);
    }

    evSelect.addEventListener("change", () => { state.ev = evSelect.value; syncUrl(); apply(); });
    document.getElementById("rs-sort").addEventListener("change", (e) => { state.sort = e.target.value; syncUrl(); apply(); });
    document.getElementById("rs-past").addEventListener("change", (e) => { state.past = e.target.checked; syncUrl(); apply(); });
    apply();
    syncMetaThenRefresh(evts.map((e) => e.id), apply);

    // So lan doi chu cua tung ve (tu log TicketResold) - tai sau, khong chan hien thi.
    if (listings.length) {
      fetchAllContractLogs().then((logs) => {
        resoldCounts = new Map();
        logs.filter((x) => x.name === "TicketResold").forEach((x) => {
          const k = String(x.args.ticketId);
          resoldCounts.set(k, (resoldCounts.get(k) || 0) + 1);
        });
        apply();
      }).catch((err) => console.warn("Không tải được lịch sử đổi chủ:", err));
    }
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
      prov: query.get("prov") || "",
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
          <select id="ev-prov" aria-label="Lọc theo tỉnh/thành"><option value="">Mọi tỉnh/thành</option></select>
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
      if (state.prov) p.set("prov", state.prov);
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
      const provSel = document.getElementById("ev-prov");
      const provs = [...new Set(evts.map((e) => getMeta(e.id).province).filter(Boolean))].sort((a, b) => shortProvince(a).localeCompare(shortProvince(b), "vi"));
      if (state.prov && !provs.includes(state.prov)) provs.push(state.prov);
      const provHtml = `<option value="">Mọi tỉnh/thành</option>` + provs.map((n) => `<option value="${escapeAttr(n)}">${escapeHtml(shortProvince(n))}</option>`).join("");
      if (provSel.dataset.html !== provHtml) { provSel.innerHTML = provHtml; provSel.dataset.html = provHtml; }
      provSel.value = state.prov;
      const grid = document.getElementById("events-grid");
      const countEl = document.getElementById("ev-count");
      const nowTs = Math.floor(Date.now() / 1000);
      const q = normalizeText(state.q.trim());
      const tiersOf = (e) => byEvent.get(String(e.id)) || [];
      let list = evts.filter((e) => {
        const meta = getMeta(e.id);
        if (!state.past && Number(e.startTime) <= nowTs) return false;
        if (state.cat && categoryOf(meta.category).id !== state.cat) return false;
        if (state.prov && meta.province !== state.prov) return false;
        if (q && !normalizeText(e.name + " " + (meta.location || "") + " " + (meta.address || "")).includes(q)) return false;
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
          state.q = ""; state.cat = ""; state.past = false; state.prov = "";
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
    document.getElementById("ev-prov").addEventListener("change", (e) => { state.prov = e.target.value; syncUrl(); apply(); });
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
    if (!/^\d+$/.test(idStr)) return renderNotFound(idStr);
    const id = BigInt(idStr);
    $root().innerHTML = h`
      <div class="page container">
        <div class="skel" style="height:360px;border-radius:20px;margin-top:var(--sp-4);"></div>
        <div class="detail-layout"><div><div class="skel" style="height:200px;"></div></div><div><div class="skel" style="height:280px;"></div></div></div>
      </div>
    `;

    let evt, tiers;
    try {
      if (!isConfigured()) { await loadAbi(); }
      if (!isConfigured()) {
        evt = MOCK_EVENTS.find((e) => e.id === id);
        if (!evt) return renderNotFound(idStr);
      } else {
        const c = await ensureReadContract();
        evt = await c.events(id);
        if (!evt.organizer || evt.organizer === ethers.ZeroAddress) {
          if (myToken === renderToken) renderNotFound(idStr);
          return;
        }
      }
      tiers = await fetchTiersForEvent(id);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được sự kiện:", err);
      $root().innerHTML = `<div class="page container">${errorStateHtml("Không tải được sự kiện", "Mạng/RPC đang chập chờn.")}</div>`;
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;

    const meta = getMeta(id);
    const cat = categoryOf(meta.category);
    const s = salesSummary(evt, tiers);
    // ProjectCore.mintTicket() KHONG chan mint sau gio bat dau -> chan o giao dien.
    const eventEnded = s.ended;
    const isOrganizer = !!(userAddress && evt.organizer && userAddress.toLowerCase() === evt.organizer.toLowerCase());
    const firstOpen = tiers.findIndex((t) => t.minted < t.maxSupply);
    const startDate = new Date(Number(evt.startTime) * 1000);
    const statusBadge = s.badge || (s.hasTiers ? { label: "Đang mở bán", cls: "badge-success" } : { label: "Chưa mở bán", cls: "badge-neutral" });

    $root().innerHTML = h`
      <div class="page container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Trang chủ</a><span>/</span><a href="#/events">Sự kiện</a><span>/</span><span aria-current="page">${escapeHtml(evt.name)}</span></nav>

        <section class="event-hero">
          <img class="event-hero__img" src="${eventImage(meta, id)}" alt="" />
          <div class="event-hero__scrim"></div>
          <div class="event-hero__content">
            <div class="event-hero__tags">
              <a class="event-card__cat" href="#/events?cat=${cat.id}">${cat.label}</a>
              <span class="badge ${statusBadge.cls}">${statusBadge.label}</span>
            </div>
            <h1 class="event-hero__title">${escapeHtml(evt.name)}</h1>
            <div class="event-hero__meta">
              <span>${icon("calendar")} ${fmtCardDate(evt.startTime)}</span>
              <span>${icon("pin")} ${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</span>
            </div>
          </div>
        </section>

        <div class="detail-layout">
          <div class="detail-main">
            <nav class="detail-tabs" aria-label="Nội dung sự kiện">
              <a href="#sec-intro" data-jump="sec-intro">Giới thiệu</a>
              <a href="#sec-info" data-jump="sec-info">Thông tin</a>
              ${mapQuery(meta) ? `<a href="#sec-map" data-jump="sec-map">Địa điểm</a>` : ""}
              <a href="#sec-policy" data-jump="sec-policy">Chính sách vé</a>
              <a href="#sec-verify" data-jump="sec-verify">Xác minh blockchain</a>
            </nav>

            <section class="detail-section" id="sec-intro">
              <h2>Giới thiệu</h2>
              <p class="detail-desc">${escapeHtml(meta.description || "Ban tổ chức chưa cập nhật mô tả chi tiết cho sự kiện này.")}</p>
            </section>

            <section class="detail-section" id="sec-info">
              <h2>Thông tin sự kiện</h2>
              <div class="info-list">
                <div class="info-row"><div class="info-row__label">Thời gian bắt đầu</div><div class="info-row__value">${startDate.toLocaleString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>
                <div class="info-row"><div class="info-row__label">Địa điểm</div><div class="info-row__value">${escapeHtml(meta.location || "Cập nhật sau")}</div></div>
                <div class="info-row"><div class="info-row__label">Danh mục</div><div class="info-row__value">${cat.label}</div></div>
                <div class="info-row"><div class="info-row__label">Đơn vị tổ chức</div><div class="info-row__value"><a class="mono link" href="${ETHERSCAN}/address/${evt.organizer}" target="_blank" rel="noopener">${shortAddr(evt.organizer)}</a>${isOrganizer ? ` <span class="badge badge-primary">Bạn</span>` : ""}</div></div>
                <div class="info-row"><div class="info-row__label">Vé đã bán</div><div class="info-row__value tabular-nums">${s.hasTiers ? `${s.minted} / ${s.supply} vé` : "Chưa mở bán"}</div></div>
              </div>
            </section>

            ${mapQuery(meta) ? `
            <section class="detail-section" id="sec-map">
              <h2>Địa điểm</h2>
              <p style="font-weight:600;">${escapeHtml(meta.location || meta.address)}</p>
              ${meta.address && meta.location ? `<p class="text-sm text-secondary">${escapeHtml(meta.address)}</p>` : ""}
              <div class="map-wrap">${mapFrameHtml(mapQuery(meta))}</div>
              <div class="organizer-actions">
                <a class="btn btn-primary btn-sm" href="${escapeAttr(mapDirectionsUrl(mapQuery(meta)))}" target="_blank" rel="noopener">${icon("pin")} Chỉ đường</a>
                <a class="btn btn-secondary btn-sm" href="${escapeAttr(mapSearchUrl(mapQuery(meta)))}" target="_blank" rel="noopener">Mở trong Google Maps ${icon("external")}</a>
              </div>
            </section>` : ""}

            <section class="detail-section" id="sec-policy">
              <h2>Chính sách vé &amp; bán lại</h2>
              <ul class="policy-list">
                <li>${icon("ticket")}<span>Mỗi lần mua là 1 giao dịch trên Ethereum Sepolia, thanh toán đúng giá niêm yết của hạng vé. Vé không hoàn tiền.</span></li>
                <li>${icon("scale")}<span>Chủ vé có thể rao bán lại, nhưng <strong>giá tối đa 110% giá gốc</strong> — hợp đồng từ chối mọi mức cao hơn.</span></li>
                <li>${icon("shield")}<span>Vé đã check-in tại cửa bị khoá vĩnh viễn: không thể check-in lần 2 và không thể rao bán lại.</span></li>
                <li>${icon("calendar")}<span>FairTicket ngừng bán vé (cả vé mới lẫn vé bán lại) khi sự kiện đã bắt đầu.</span></li>
              </ul>
            </section>

            <section class="detail-section" id="sec-verify">
              <h2>Xác minh blockchain</h2>
              <details class="verify-box">
                <summary>${icon("shield")} Xem thông tin hợp đồng của sự kiện này</summary>
                <div class="info-list">
                  <div class="info-row"><div class="info-row__label">Mạng</div><div class="info-row__value">Ethereum Sepolia (testnet)</div></div>
                  <div class="info-row"><div class="info-row__label">Chain ID</div><div class="info-row__value mono">11155111</div></div>
                  <div class="info-row"><div class="info-row__label">Hợp đồng (CA)</div><div class="info-row__value"><a class="mono link" href="${ETHERSCAN}/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener">${shortAddr(CONTRACT_ADDRESS)}</a> <button type="button" class="copy-btn" data-copy="${CONTRACT_ADDRESS}">Sao chép</button></div></div>
                  <div class="info-row"><div class="info-row__label">Event ID</div><div class="info-row__value mono">${id}</div></div>
                  <div class="info-row"><div class="info-row__label">Tier ID</div><div class="info-row__value mono">${tiers.length ? tiers.map((t) => "#" + t.id).join(", ") : "—"}</div></div>
                  <div class="info-row"><div class="info-row__label">Dạng vé</div><div class="info-row__value">Bản ghi vé trong hợp đồng ProjectCore (không phải token ERC-721)</div></div>
                  <div class="info-row"><div class="info-row__label">Quy tắc bán lại</div><div class="info-row__value">resalePrice ≤ originalPrice × 11000 / 10000 (MAX_RESALE_BPS)</div></div>
                </div>
              </details>
            </section>

            ${isOrganizer ? organizerPanelHtml(id, tiers, s) : `<div id="staff-note"></div>`}
          </div>

          <aside class="ticket-panel" id="ticket-panel" aria-label="Chọn vé">
            <div class="ticket-panel__head">
              <h2>Chọn vé</h2>
              <button id="btn-refresh-tiers" type="button" class="btn btn-ghost btn-sm" aria-label="Tải lại hạng vé">↻ Tải lại</button>
            </div>
            <div id="tier-list" role="radiogroup" aria-label="Hạng vé">${tierListHtml(tiers, firstOpen, eventEnded)}</div>
            ${!eventEnded && firstOpen >= 0 ? `
            <div class="qty-row">
              <span>Số lượng</span>
              <div class="qty-control">
                <button type="button" id="qty-minus" aria-label="Giảm số lượng">−</button>
                <span id="qty-val" aria-live="polite">1</span>
                <button type="button" id="qty-plus" aria-label="Tăng số lượng">+</button>
              </div>
            </div>
            <div class="total-row"><span>Tổng cộng</span><strong id="total-val" class="tabular-nums"></strong></div>
            <p class="hint-sm" id="qty-hint"></p>` : ""}
            <button id="btn-go-checkout" class="btn btn-accent btn-block btn-lg" ${eventEnded || firstOpen < 0 ? "disabled" : ""}>
              ${eventEnded ? "Sự kiện đã diễn ra" : !s.hasTiers ? "Chưa mở bán" : firstOpen < 0 ? "Đã bán hết" : "Mua vé"}
            </button>
            <p class="hint-sm" style="text-align:center;">Thanh toán bằng ETH trên Sepolia · Giá bán lại tối đa 110%</p>
          </aside>
        </div>
      </div>

      ${!eventEnded && firstOpen >= 0 ? `
      <div class="sticky-buy" id="sticky-buy">
        <div><div class="text-sm text-secondary">Giá từ</div><strong class="tabular-nums">${fmtEth(s.minPrice)} ETH</strong></div>
        <button type="button" class="btn btn-accent" id="sticky-buy-btn">Chọn vé</button>
      </div>` : ""}
    `;

    $root().querySelectorAll("[data-jump]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    $root().querySelectorAll("[data-copy]").forEach(bindCopy);
    document.getElementById("sticky-buy-btn")?.addEventListener("click", () => {
      document.getElementById("ticket-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Chon hang ve + so luong (moi ve = 1 giao dich mint, gioi han 10 lan/lan mua).
    const MAX_PER_ORDER = 10;
    let selIdx = firstOpen;
    let qty = 1;
    function maxQty() {
      if (selIdx < 0) return 0;
      const t = tiers[selIdx];
      return Math.min(MAX_PER_ORDER, Number(t.maxSupply - t.minted));
    }
    function updateTotals() {
      if (selIdx < 0) return;
      qty = Math.max(1, Math.min(qty, maxQty()));
      const qv = document.getElementById("qty-val");
      if (!qv) return;
      qv.textContent = qty;
      document.getElementById("total-val").textContent = fmtEth(tiers[selIdx].price * BigInt(qty)) + " ETH";
      document.getElementById("qty-minus").disabled = qty <= 1;
      document.getElementById("qty-plus").disabled = qty >= maxQty();
      document.getElementById("qty-hint").textContent = qty > 1 ? `Mua ${qty} vé = ${qty} giao dịch, xác nhận lần lượt trong ví.` : `Tối đa ${maxQty()} vé mỗi lần mua.`;
    }
    $root().querySelectorAll('input[name="tier"]').forEach((radio) => radio.addEventListener("change", () => {
      selIdx = Number(radio.value);
      $root().querySelectorAll(".tier-option").forEach((el) => el.classList.toggle("is-selected", Number(el.dataset.tier) === selIdx));
      updateTotals();
    }));
    document.getElementById("qty-minus")?.addEventListener("click", () => { qty--; updateTotals(); });
    document.getElementById("qty-plus")?.addEventListener("click", () => { qty++; updateTotals(); });
    updateTotals();

    document.getElementById("btn-go-checkout")?.addEventListener("click", () => {
      if (selIdx < 0 || eventEnded) return;
      window.location.hash = "#/checkout/" + id.toString() + "/" + tiers[selIdx].id.toString() + "/" + qty;
    });

    document.getElementById("btn-refresh-tiers")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      tiersCache = null;
      route();
    }));

    if (isOrganizer) wireOrganizerPanel(id, evt);
    else if (userAddress && isConfigured()) {
      ensureReadContract().then((c) => c.isStaff(id, userAddress)).then((ok) => {
        const note = document.getElementById("staff-note");
        if (!ok || !note || myToken !== renderToken) return;
        note.innerHTML = `<section class="detail-section organizer-panel"><h2>Bạn là CTV soát vé</h2><p class="text-sm text-secondary">Organizer đã cấp quyền check-in vé của sự kiện này cho ví của bạn.</p><a class="btn btn-dark" href="#/check-in?event=${id}" style="margin-top: var(--sp-3);">Mở màn hình check-in</a></section>`;
      }).catch(() => {});
    }

    syncMetaThenRefresh([id], () => { if (myToken === renderToken) route(); });
  };

  function renderNotFound(idStr) {
    $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Không tìm thấy sự kiện</h3><p>Sự kiện #${escapeHtml(idStr)} không tồn tại trên hợp đồng.</p><a class="btn btn-secondary" href="#/events" style="margin-top:16px;">← Quay lại danh sách</a></div></div>`;
  }

  function tierListHtml(tiers, selectedIdx, ended) {
    if (tiers.length === 0) {
      return `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Ban tổ chức chưa mở hạng vé nào.</p>`;
    }
    return tiers.map((t, i) => {
      const remaining = t.maxSupply - t.minted;
      const soldOut = remaining === 0n;
      const pct = t.maxSupply > 0n ? Number((t.minted * 100n) / t.maxSupply) : 0;
      const disabled = soldOut || ended;
      return `
      <label class="tier-option${i === selectedIdx && !disabled ? " is-selected" : ""}${disabled ? " is-disabled" : ""}" data-tier="${i}">
        <input type="radio" name="tier" value="${i}" ${i === selectedIdx && !disabled ? "checked" : ""} ${disabled ? "disabled" : ""} />
        <span class="tier-option__main">
          <span class="tier-option__name">${escapeHtml(t.name)}</span>
          <span class="tier-option__sub">${soldOut ? "Đã bán hết" : `Còn ${remaining} / ${t.maxSupply} vé`}</span>
          <span class="supply-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
        </span>
        <span class="tier-option__price tabular-nums">${fmtEth(t.price)} ETH</span>
      </label>`;
    }).join("");
  }

  function organizerPanelHtml(eventId, tiers, s) {
    const revenue = tiers.reduce((sum, t) => sum + t.minted * t.price, 0n);
    return `
      <section class="detail-section organizer-panel" id="sec-organizer">
        <div class="section-head" style="margin-bottom: var(--sp-3);">
          <div><h2>Quản lý sự kiện</h2><p class="text-sm">Chỉ ví Organizer của sự kiện này nhìn thấy mục này.</p></div>
        </div>
        <div class="stat-grid">
          <div class="stat"><div class="stat__label">Vé đã bán</div><div class="stat__value tabular-nums">${s.minted} / ${s.supply}</div></div>
          <div class="stat"><div class="stat__label">Còn lại</div><div class="stat__value tabular-nums">${s.remaining}</div></div>
          <div class="stat"><div class="stat__label">Doanh thu bán lần đầu</div><div class="stat__value tabular-nums">${fmtEth(revenue)} ETH</div></div>
          <div class="stat"><div class="stat__label">Hạng vé</div><div class="stat__value tabular-nums">${tiers.length}</div></div>
        </div>
        <p class="hint-sm">Doanh thu = số vé đã bán × giá của từng hạng (đọc từ hợp đồng). Rút tiền tại trang <a class="link" href="#/my-tickets">Vé của tôi</a>.</p>

        <div class="organizer-actions">
          <button id="btn-edit-meta" type="button" class="btn btn-secondary btn-sm">Sửa thông tin hiển thị</button>
          <button id="btn-add-tier" type="button" class="btn btn-secondary btn-sm">+ Thêm hạng vé</button>
        </div>

        <div class="checkin-box">
          <h3>Check-in tại cửa</h3>
          <p class="text-sm text-secondary">Quét mã check-in có chữ ký của khách (hết hạn sau 5 phút) — chặn được ảnh chụp màn hình cũ và mã của người khác.</p>
          <a class="btn btn-dark" href="#/check-in?event=${eventId}" style="margin-top: var(--sp-3);">Mở màn hình check-in</a>
        </div>

        <div class="checkin-box" id="staff-box">
          <h3>Cộng tác viên (CTV) soát vé</h3>
          <p class="text-sm text-secondary">CTV dùng ví riêng, <strong>chỉ</strong> check-in được vé của sự kiện này — không rút tiền, không tạo hạng vé, không cấp quyền cho người khác. Thu hồi có hiệu lực ngay trên hợp đồng.</p>
          <div class="checkin-row">
            <input id="staff-addr" placeholder="Địa chỉ ví CTV (0x…)" autocomplete="off" spellcheck="false" aria-label="Địa chỉ ví CTV" />
            <button id="btn-add-staff" type="button" class="btn btn-dark">Cấp quyền</button>
          </div>
          <ul class="staff-list" id="staff-list"><li class="text-secondary text-sm">Đang tải…</li></ul>
        </div>
      </section>
    `;
  }

  function editMetaModal(meta) {
    // Su kien cu chi co dia chi dang chu tu do -> dua vao o "So nha, ten duong".
    const legacyParts = meta.province || meta.ward || meta.street
      ? { province: meta.province, ward: meta.ward, street: meta.street }
      : { street: meta.address || "" };
    return new Promise((resolve) => {
      let newImage = null;
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-card modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="edit-meta-title">
          <h3 id="edit-meta-title">Sửa thông tin hiển thị</h3>
          <p class="text-sm text-secondary" style="margin-top:4px;">Tên và thời gian lưu trên blockchain nên không sửa được. Các mục dưới đây lưu ngoài chain, cần 1 chữ ký (miễn phí) để xác nhận bạn là Organizer.</p>
          <div class="field" style="margin-top: var(--sp-3);">
            <label for="em-cat">Danh mục</label>
            <select id="em-cat">${CATEGORIES.map((c) => `<option value="${c.id}" ${categoryOf(meta.category).id === c.id ? "selected" : ""}>${c.label}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label for="em-loc">Tên địa điểm</label>
            <input id="em-loc" maxlength="300" value="${escapeAttr(meta.location || "")}" />
          </div>
          <fieldset class="addr-fieldset">
            <legend>Địa chỉ</legend>
            ${addressFieldsHtml("em", legacyParts)}
            ${mapPickerHtml("em-map", mapQuery(meta))}
          </fieldset>
          <div class="field">
            <label for="em-desc">Mô tả</label>
            <textarea id="em-desc" maxlength="5000" rows="5">${escapeHtml(meta.description || "")}</textarea>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label for="em-img">Ảnh bìa mới (bỏ trống để giữ ảnh cũ)</label>
            <input id="em-img" type="file" accept="image/png,image/jpeg,image/webp" />
            <p class="hint">Ảnh được nén lại tối đa 1600px trước khi lưu.</p>
          </div>
          <div class="wizard-actions" style="margin-top: var(--sp-4); padding-top: 0; border-top: none;">
            <button type="button" class="btn btn-ghost" data-action="cancel">Huỷ</button>
            <button type="button" class="btn btn-primary" data-action="save">Lưu &amp; ký xác nhận</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector("#em-loc").focus();
      const emQuery = () => {
        const v = (id) => overlay.querySelector("#" + id).value.trim();
        return mapQuery({ location: v("em-loc"), street: v("em-street"), address: joinAddress({ street: v("em-street"), ward: v("em-ward"), province: v("em-prov") }) });
      };
      const refreshMap = wireMapPicker("em-map", emQuery);
      overlay.querySelector("#em-loc").addEventListener("input", refreshMap);
      wireAddressFields("em", legacyParts, refreshMap);
      function close(v) { overlay.remove(); resolve(v); }
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
      overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(null); });
      overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => close(null));
      const saveBtn = overlay.querySelector('[data-action="save"]');
      overlay.querySelector("#em-img").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        saveBtn.disabled = true;
        newImage = file ? await compressImage(file) : null;
        saveBtn.disabled = false;
        if (file && !newImage) toast("Không đọc được ảnh này, hãy chọn ảnh PNG/JPG khác.", "error");
      });
      overlay.querySelector('[data-action="save"]').addEventListener("click", async () => {
        const addr = await readAddressFields("em");
        if (!addr.ok) { toast(addr.error, "error"); return; }
        close({
        ...addr.parts,
        category: overlay.querySelector("#em-cat").value,
        location: overlay.querySelector("#em-loc").value.trim(),
        description: overlay.querySelector("#em-desc").value.trim(),
        image: newImage || meta.image || "",
        });
      });
    });
  }

  // Thu nho anh truoc khi luu (base64 trong JSON metadata) - anh goc tu dien
  // thoai co the vai MB, vuot gioi han body cua Vercel Function (~4.5MB).
  function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = () => resolve(null);
        img.src = reader.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // Danh sach CTV hien tai: dung lai tu log StaffUpdated (lan cap/thu hoi gan
  // nhat cua tung vi), roi doi chieu isStaff() tren chain cho chac.
  async function loadStaffList(eventId) {
    const logs = await fetchAllContractLogs(true);
    const last = new Map();
    logs.filter((l) => l.name === "StaffUpdated" && l.args.eventId === eventId)
      .forEach((l) => last.set(l.args.staff.toLowerCase(), { addr: l.args.staff, allowed: l.args.allowed, hash: l.transactionHash }));
    const c = await ensureReadContract();
    const rows = [...last.values()].filter((x) => x.allowed);
    const onChain = await Promise.all(rows.map((x) => c.isStaff(eventId, x.addr)));
    return rows.filter((_, i) => onChain[i]);
  }

  function wireStaffPanel(eventId, evt) {
    const listEl = document.getElementById("staff-list");
    if (!listEl) return;
    let staff = [];
    const draw = () => {
      listEl.innerHTML = staff.length
        ? staff.map((x) => `<li class="staff-item"><span class="mono" title="${x.addr}">${shortAddr(x.addr)}</span><span class="staff-item__actions"><button type="button" class="copy-btn" data-copy="${x.addr}">Sao chép</button><button type="button" class="btn btn-ghost btn-sm" data-revoke="${x.addr}">Thu hồi</button></span></li>`).join("")
        : `<li class="text-secondary text-sm">Chưa có CTV nào. Chỉ ví Organizer check-in được.</li>`;
      listEl.querySelectorAll("[data-copy]").forEach(bindCopy);
      listEl.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        await sendSetStaff(b.dataset.revoke, false);
        staff = staff.filter((x) => !sameAddr(x.addr, b.dataset.revoke));
        draw();
        toast("Đã thu hồi quyền CTV " + shortAddr(b.dataset.revoke) + ".", "success");
      })));
    };
    async function sendSetStaff(addr, allowed) {
      requireWallet(); requireContract(); requireRightNetwork();
      toast("Vui lòng xác nhận giao dịch trong ví…", "info");
      const tx = await contract.setStaff(eventId, addr, allowed);
      toast("Đã gửi — đang chờ blockchain xác nhận…", "info");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw userError("Giao dịch thất bại trên blockchain.");
    }
    loadStaffList(eventId).then((rows) => { staff = rows; draw(); }).catch((err) => {
      console.warn("Không tải được danh sách CTV:", err);
      listEl.innerHTML = `<li class="text-secondary text-sm">Không tải được danh sách CTV (mạng/RPC).</li>`;
    });
    const input = document.getElementById("staff-addr");
    document.getElementById("btn-add-staff").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      const addr = input.value.trim();
      if (!ethers.isAddress(addr)) throw userError("Địa chỉ ví không hợp lệ — cần dạng 0x… gồm 40 ký tự.");
      const checksum = ethers.getAddress(addr);
      if (sameAddr(checksum, evt.organizer)) throw userError("Đây là ví Organizer — đã có quyền check-in sẵn.");
      if (staff.some((x) => sameAddr(x.addr, checksum))) throw userError("Ví này đã là CTV của sự kiện.");
      await sendSetStaff(checksum, true);
      staff.push({ addr: checksum, allowed: true });
      input.value = "";
      draw();
      toast("Đã cấp quyền CTV cho " + shortAddr(checksum) + ". Gửi họ link màn hình check-in.", "success");
    }));
  }

  function wireOrganizerPanel(eventId, evt) {
    wireStaffPanel(eventId, evt);
    document.getElementById("btn-edit-meta")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      // Ky la GHI DE toan bo metadata tren server -> lay ban moi nhat truoc,
      // tranh mo form khi cache tren may chua dong bo (o trong) roi ky xoa mat
      // anh/mo ta cu.
      try {
        const res = await fetch("/api/metadata?eventId=" + eventId, { cache: "no-store" });
        if (res.ok) {
          const remote = await res.json();
          if (remote && Object.keys(remote).length) saveMeta(eventId, remote);
        }
      } catch (err) {
        console.warn("Không đọc được metadata mới nhất:", err);
      }
      const updated = await editMetaModal(getMeta(eventId));
      if (!updated) return;
      requireWallet();
      saveMeta(eventId, updated);
      toast("Ký xác nhận trong ví để lưu thay đổi…", "info");
      const pub = await publishMetaToServer(eventId, updated);
      if (pub.ok) toast("Đã cập nhật thông tin sự kiện.", "success");
      else toast("Đã lưu trên máy này nhưng chưa đồng bộ được (" + pub.reason + ").", "error");
      route();
    }));

    document.getElementById("btn-add-tier")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      const result = await promptTierModal();
      if (!result) return;
      requireWallet();
      requireContract();
      requireRightNetwork();
      const tx = await contract.createTier(eventId, result.name, ethers.parseEther(result.price), BigInt(result.supply));
      toast("Đang chờ blockchain xác nhận…", "info");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw userError("Giao dịch tạo hạng vé thất bại trên blockchain.");
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
  }

  // ---------- Page: Create event (wizard) ----------

  const CREATE_DRAFT_KEY = "fairticket:create-draft";

  routes.create = function () {
    let step = 1;
    let data = { name: "", category: "", description: "", startTime: "", endTime: "", location: "", province: "", ward: "", street: "", address: "", image: "", maxSupply: "", price: "" };

    // Lop an toan thu 2: khoi phuc nhap neu bi F5/mat ket noi mang giua chung
    // (lop thu 1 la handleWalletChange() khong con ep reload trang nua).
    try {
      const saved = JSON.parse(sessionStorage.getItem(CREATE_DRAFT_KEY) || "null");
      if (saved && saved.data && Object.values(saved.data).some((v) => v)) {
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
    const FIELD_MAP = { "f-name": "name", "f-cat": "category", "f-desc": "description", "f-start": "startTime", "f-end": "endTime", "f-loc": "location", "f-prov": "province", "f-ward": "ward", "f-street": "street", "f-supply": "maxSupply", "f-price": "price" };
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
            <label for="f-loc">Tên địa điểm</label>
            <input id="f-loc" placeholder="VD: Nhà văn hóa Trung tâm" maxlength="300" value="${escapeAttr(data.location)}" />
          </div>
          <fieldset class="addr-fieldset">
            <legend>Địa chỉ</legend>
            ${addressFieldsHtml("f", data)}
            ${mapPickerHtml("f-map", mapQuery({ location: data.location, address: joinAddress(data), street: data.street }))}
          </fieldset>
          <div class="field">
            <label>Ảnh sự kiện</label>
            <div class="upload-box">Chọn ảnh bìa (tự nén tối đa 1600px, lưu cùng mô tả để mọi người cùng thấy).<br/>
              <input type="file" id="f-image" accept="image/*" style="margin-top:8px;" />
            </div>
          </div>
          <div class="wizard-actions">
            <a href="#/my-events" class="btn btn-ghost" id="btn-cancel-wizard">Hủy</a>
            <button id="btn-next-1" class="btn btn-primary">Tiếp tục →</button>
          </div>
        `;
        bindLiveInputs();
        const wizQuery = () => {
          const v = (id) => document.getElementById(id).value.trim();
          return mapQuery({ location: v("f-loc"), street: v("f-street"), address: joinAddress({ street: v("f-street"), ward: v("f-ward"), province: v("f-prov") }) });
        };
        const refreshMap = wireMapPicker("f-map", wizQuery);
        document.getElementById("f-loc").addEventListener("input", refreshMap);
        wireAddressFields("f", data, () => { data.province = document.getElementById("f-prov").value; saveDraft(); refreshMap(); });
        document.getElementById("btn-cancel-wizard").addEventListener("click", clearDraft);
        document.getElementById("btn-next-1").addEventListener("click", async () => {
          data.name = document.getElementById("f-name").value.trim();
          data.category = document.getElementById("f-cat").value;
          data.description = document.getElementById("f-desc").value.trim();
          data.startTime = document.getElementById("f-start").value;
          data.endTime = document.getElementById("f-end").value;
          data.location = document.getElementById("f-loc").value.trim();
          if (!data.name || !data.startTime) { toast("Điền tên sự kiện và thời gian bắt đầu.", "error"); return; }
          const addr = await readAddressFields("f");
          if (!addr.ok) { toast(addr.error, "error"); return; }
          Object.assign(data, addr.parts);
          const file = document.getElementById("f-image").files[0];
          const goNext = () => { step = 2; render(); };
          if (file) {
            compressImage(file).then((img) => {
              if (!img) { toast("Không đọc được ảnh này, hãy chọn ảnh PNG/JPG khác.", "error"); return; }
              data.image = img;
              goNext();
            });
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
              ${joinAddress(data) ? `<div class="review-row"><span class="review-row__label">Địa chỉ</span><span class="review-row__value">${escapeHtml(joinAddress(data))}</span></div>` : ""}
              <div class="review-row"><span class="review-row__label">Hạng Standard</span><span class="review-row__value">${escapeHtml(data.maxSupply)} vé × ${escapeHtml(data.price)} ETH</span></div>
              <div class="review-row"><span class="review-row__label">Giới hạn bán lại</span><span class="review-row__value">110%</span></div>
              <div class="review-row"><span class="review-row__label">Organizer wallet</span><span class="review-row__value mono">${userAddress ? shortAddr(userAddress) : "Chưa kết nối ví"}</span></div>
              <div class="review-row"><span class="review-row__label">Network</span><span class="review-row__value">Ethereum Sepolia</span></div>
            </div>
          </div>
          ${!isConfigured() ? '<div class="banner">Chưa cấu hình <code>CONTRACT_ADDRESS</code>/<code>CONTRACT_ABI</code> trong <code>web/app.js</code>.</div>' : ""}
          <p class="hint" style="margin-top: var(--sp-3);">Bấm Deploy sẽ gửi <strong>2 giao dịch</strong> lần lượt (tạo sự kiện, rồi tạo hạng vé Standard), sau đó là <strong>1 chữ ký miễn phí</strong> để lưu ảnh &amp; mô tả — xác nhận lần lượt trong MetaMask.</p>
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
          const newMeta = { description: data.description, location: data.location, province: data.province, ward: data.ward, street: data.street, address: joinAddress(data), image: data.image, category: categoryOf(data.category).id };
          saveMeta(newEventId, newMeta);

          toast("Đang tạo hạng vé Standard… (giao dịch 2/2)", "info");
          const tx2 = await contract.createTier(newEventId, "Standard", ethers.parseEther(data.price), BigInt(data.maxSupply));
          await tx2.wait();

          // Ky metadata SAU khi 2 giao dich xong, de MetaMask khong bat 2 yeu cau chong nhau.
          toast("Ký xác nhận (miễn phí) để lưu ảnh & mô tả cho mọi người cùng thấy…", "info");
          const pub = await publishMetaToServer(newEventId, newMeta);
          if (!pub.ok) {
            toast("Sự kiện đã tạo, nhưng ảnh/mô tả mới chỉ lưu trên máy này (" + pub.reason + "). Vào trang sự kiện → “Sửa thông tin” để đồng bộ lại.", "error");
            clearDraft();
            eventsCache = null;
            tiersCache = null;
            window.location.hash = "#/events/" + newEventId.toString();
            return;
          }
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
          <div><h1 class="h2">${onTickets ? "Vé của tôi" : "Sự kiện của tôi"}</h1><p>Vé bạn sở hữu và sự kiện bạn tổ chức — đọc trực tiếp từ blockchain.</p></div>
          <a href="#/create" class="btn btn-primary">+ Tạo sự kiện mới</a>
        </div>

        <div class="tabs">
          <button class="tab${onTickets ? " active" : ""}" data-subtab="tickets">Vé của tôi</button>
          <button class="tab${onTickets ? "" : " active"}" data-subtab="organizer">Sự kiện của tôi</button>
        </div>

        <div id="panel-tickets" ${onTickets ? "" : "hidden"}>
          <div class="balance-card" id="balance-card">
            <div>
              <div class="text-sm text-secondary">Tiền chờ rút (từ bán vé và bán lại vé)</div>
              <div id="pending-balance" class="balance-card__value tabular-nums">— ETH</div>
            </div>
            <button id="btn-withdraw" class="btn btn-dark" disabled>Rút tiền về ví</button>
          </div>
          <div class="filter-row" id="ticket-filters" role="tablist" aria-label="Lọc vé">
            <button class="chip active" data-tf="upcoming" role="tab">Sắp diễn ra</button>
            <button class="chip" data-tf="used" role="tab">Đã sử dụng</button>
            <button class="chip" data-tf="selling" role="tab">Đang bán lại</button>
            <button class="chip" data-tf="all" role="tab">Tất cả</button>
          </div>
          <div id="my-tickets-list" class="ticket-grid">${skeletonTickets(3)}</div>
          <h2 class="h3" style="margin: var(--sp-6) 0 var(--sp-2);">Lịch sử giao dịch</h2>
          <p class="text-sm text-secondary" style="margin-bottom: var(--sp-3);">Mọi giao dịch của ví này với hợp đồng FairTicket, đọc từ blockchain.</p>
          <div class="card" id="history-list" style="padding: var(--sp-2) var(--sp-3);">
            <p class="text-secondary" style="padding: var(--sp-4) 0;">Đang tải…</p>
          </div>
        </div>

        <div id="panel-organizer" ${onTickets ? "hidden" : ""}>
          <div id="org-dashboard"><div class="kpi-grid">${'<div class="stat skel" style="height:92px;"></div>'.repeat(4)}</div></div>
        </div>
      </div>
    `;

    $root().querySelectorAll("[data-subtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $root().querySelectorAll("[data-subtab]").forEach((b) => b.classList.remove("active"));
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
    // la gan THEM 1 listener nua vao cung nut - bam 1 cai thi goi
    // withdrawProceeds() 2-3 lan chong nhau.
    document.getElementById("btn-withdraw").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      requireWallet();
      requireContract();
      requireRightNetwork();
      toast("Vui lòng xác nhận giao dịch trong ví…", "info");
      const tx = await contract.withdrawProceeds();
      toast("Đã gửi — đang chờ blockchain xác nhận…", "info");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw userError("Rút tiền thất bại trên blockchain.");
      toast("Đã rút tiền về ví.", "success");
      await renderMyTickets();
    }));

    if (!userAddress) {
      const need = (what) => `<div class="empty-state card" style="grid-column:1/-1;"><h3>Kết nối ví để xem ${what}</h3><p>Vé và sự kiện gắn với địa chỉ ví của bạn trên blockchain.</p><button type="button" class="btn btn-primary" data-connect style="margin-top:16px;">Kết nối ví</button></div>`;
      document.getElementById("my-tickets-list").innerHTML = need("vé của bạn");
      document.getElementById("org-dashboard").innerHTML = need("sự kiện bạn tổ chức");
      document.getElementById("history-list").innerHTML = `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Kết nối ví để xem lịch sử.</p>`;
      document.getElementById("balance-card").hidden = true;
      document.getElementById("ticket-filters").hidden = true;
      $root().querySelectorAll("[data-connect]").forEach((b) => b.addEventListener("click", (e) => withBusy(e.currentTarget, connectWallet, { keepContentOnSuccess: true })));
      return;
    }

    renderMyTickets();
    renderOrganizerDashboard(myToken);
  };

  function skeletonTickets(n) {
    return Array.from({ length: n }).map(() => `<div class="ticket-card" aria-hidden="true"><div class="skel" style="aspect-ratio:16/7;border-radius:0;"></div><div style="padding:16px;"><div class="skel" style="height:16px;width:70%;margin-bottom:8px;"></div><div class="skel" style="height:12px;width:50%;"></div></div></div>`).join("");
  }

  // Phan loai ve theo trang thai THAT tren chain (khong phai cache).
  function ticketState(t, evt) {
    const ended = evt && Number(evt.startTime) <= Math.floor(Date.now() / 1000);
    if (t.checkedIn) return { key: "used", label: "Đã check-in", cls: "badge-neutral" };
    if (t.forSale) return { key: "selling", label: "Đang rao bán", cls: "badge-warning" };
    if (ended) return { key: "past", label: "Sự kiện đã bắt đầu", cls: "badge-neutral" };
    return { key: "upcoming", label: "Hợp lệ", cls: "badge-success" };
  }

  async function renderMyTickets() {
    const myToken = renderToken;
    const c = await ensureReadContract();
    if (myToken !== renderToken) return;
    const balEl = document.getElementById("pending-balance");
    const listEl = document.getElementById("my-tickets-list");
    const histEl = document.getElementById("history-list");
    if (!c || !userAddress || !balEl || !listEl || !histEl) return;

    // 2 khoi ben duoi (danh sach ve, lich su giao dich) chay doc lap va
    // deu co try/catch rieng: 1 khoi loi khong keo khoi kia (va ca trang)
    // dung yen mai o "Dang tai..." ma khong bao loi gi.
    try {
      const [pending, ticketCount, evts, tiers] = await Promise.all([
        c.pendingWithdrawals(userAddress), c.nextTicketId(), fetchAllEvents(), fetchAllTiers(),
      ]);
      if (myToken !== renderToken) return;
      balEl.textContent = fmtEth(pending) + " ETH";
      const wBtn = document.getElementById("btn-withdraw");
      wBtn.disabled = pending === 0n;
      wBtn.title = pending === 0n ? "Chưa có khoản nào để rút" : "";
      document.getElementById("balance-card").classList.toggle("has-funds", pending > 0n);

      const ids = range(ticketCount);
      const allTickets = await Promise.all(ids.map((id) => c.tickets(id)));
      if (myToken !== renderToken) return;
      // Khong dung Object.assign({}, t): Result cua ethers v6 la Proxy, cac
      // truong ten (owner, eventId...) khong phai own-enumerable property -
      // Object.assign lam mat het, t.owner thanh undefined. Doc tung truong.
      const owned = allTickets
        .map((t, i) => ({
          id: ids[i], eventId: t.eventId, tierId: t.tierId, owner: t.owner,
          originalPrice: t.originalPrice, resalePrice: t.resalePrice, forSale: t.forSale, checkedIn: t.checkedIn,
        }))
        .filter((t) => t.owner.toLowerCase() === userAddress.toLowerCase());

      const evtMap = new Map(evts.map((e) => [String(e.id), e]));
      const tierMap = new Map(tiers.map((t) => [String(t.id), t]));
      const rows = owned.map((t) => ({ t, evt: evtMap.get(String(t.eventId)), tier: tierMap.get(String(t.tierId)) }));
      renderOwnedTickets(rows, listEl);
      syncMetaThenRefresh(rows.map((r) => r.t.eventId), () => { if (myToken === renderToken) renderOwnedTickets(rows, listEl); });
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được vé của tôi:", err);
      listEl.innerHTML = `<div class="empty-state card" style="grid-column:1/-1;"><h3>Không tải được danh sách vé</h3><p>Có thể do mạng/RPC chập chờn.</p><button id="btn-retry-tickets" class="btn btn-secondary btn-sm" style="margin-top:16px;">Thử lại</button></div>`;
      document.getElementById("btn-retry-tickets")?.addEventListener("click", () => renderMyTickets());
    }

    try {
      await renderTicketHistory(histEl, myToken);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error("Không tải được lịch sử giao dịch:", err);
      histEl.innerHTML = `<div class="empty-state"><h3>Không tải được lịch sử</h3><p>Có thể do mạng/RPC chập chờn.</p><button id="btn-retry-history" class="btn btn-secondary btn-sm" style="margin-top:16px;">Thử lại</button></div>`;
      document.getElementById("btn-retry-history")?.addEventListener("click", () => renderMyTickets());
    }
  }

  function renderOwnedTickets(rows, listEl) {
    const filters = document.getElementById("ticket-filters");
    // "Sap dien ra" gom ca ve dang rao ban cua su kien chua bat dau - truoc day
    // rao ban xong ve bien khoi tab dang xem, nguoi dung khong thay nut "Go rao ban".
    const inTab = (r, tab) => {
      const k = ticketState(r.t, r.evt).key;
      if (tab === "all") return true;
      if (tab === "upcoming") return k === "upcoming" || (k === "selling" && r.evt && Number(r.evt.startTime) > Math.floor(Date.now() / 1000));
      return k === tab;
    };
    const counts = {};
    ["upcoming", "used", "selling", "all"].forEach((tab) => { counts[tab] = rows.filter((r) => inTab(r, tab)).length; });
    const labels = { upcoming: "Sắp diễn ra", used: "Đã sử dụng", selling: "Đang bán lại", all: "Tất cả" };
    filters.querySelectorAll("[data-tf]").forEach((b) => { b.textContent = `${labels[b.dataset.tf]} (${counts[b.dataset.tf]})`; });

    function draw() {
      const active = filters.querySelector(".chip.active").dataset.tf;
      const shown = rows
        .filter((r) => inTab(r, active))
        .sort((a, b) => Number((a.evt?.startTime || 0n) - (b.evt?.startTime || 0n)));
      if (rows.length === 0) {
        listEl.innerHTML = emptyState("Bạn chưa có vé nào", "Vé bạn mua sẽ xuất hiện tại đây, gắn với địa chỉ ví này.", `<a class="btn btn-primary" href="#/events" style="margin-top:16px;">Khám phá sự kiện</a>`);
        return;
      }
      if (shown.length === 0) {
        listEl.innerHTML = emptyState("Không có vé nào ở mục này", "Chọn mục “Tất cả” để xem toàn bộ vé của bạn.");
        return;
      }
      listEl.innerHTML = shown.map(ticketCardHtml).join("");
      listEl.querySelectorAll("[data-qr]").forEach((el) => renderQrInto(el, el.dataset.qr));
      listEl.querySelectorAll("[data-view]").forEach((el) => el.addEventListener("click", () => {
        const row = rows.find((r) => r.t.id.toString() === el.dataset.view);
        if (row) showTicketDetailModal(row.t, row.evt, row.tier);
      }));
      listEl.querySelectorAll("[data-unlist]").forEach((btn) => btn.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        requireWallet(); requireContract(); requireRightNetwork();
        toast("Vui lòng xác nhận giao dịch trong ví…", "info");
        const tx = await contract.cancelResale(BigInt(btn.dataset.unlist));
        toast("Đã gửi — đang chờ blockchain xác nhận…", "info");
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) throw userError("Gỡ rao bán thất bại trên blockchain.");
        toast("Đã gỡ rao bán vé #" + btn.dataset.unlist + ".", "success");
        renderMyTickets();
      })));
      listEl.querySelectorAll("[data-resell]").forEach((btn) => btn.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        const row = rows.find((r) => r.t.id.toString() === btn.dataset.resell);
        await resellFlow(row);
      })));
    }

    filters.querySelectorAll("[data-tf]").forEach((b) => {
      b.onclick = () => {
        filters.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        b.classList.add("active");
        draw();
      };
    });
    // Mac dinh mo muc co ve (khong de nguoi dung thay "trong" khi ho van co ve).
    const activeKey = filters.querySelector(".chip.active").dataset.tf;
    if (counts[activeKey] === 0 && rows.length > 0) {
      const firstNonEmpty = ["upcoming", "selling", "used", "all"].find((k) => counts[k] > 0);
      filters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.tf === firstNonEmpty));
    }
    draw();
  }

  function ticketCardHtml({ t, evt, tier }) {
    const meta = getMeta(t.eventId);
    const st = ticketState(t, evt);
    const canResell = st.key === "upcoming" || st.key === "selling";
    return `
      <article class="ticket-card${st.key === "used" || st.key === "past" ? " is-muted" : ""}">
        <div class="ticket-card__media">
          <img src="${eventImage(meta, t.eventId)}" alt="" loading="lazy" />
          <span class="event-card__cat ticket-card__cat">${categoryOf(meta.category).label}</span>
          <span class="badge ${st.cls} ticket-card__status">${st.label}</span>
        </div>
        <div class="ticket-card__body">
          <div class="event-card__date">${evt ? fmtCardDate(evt.startTime) : ""}</div>
          <h3 class="ticket-card__title">${escapeHtml(evt ? evt.name : "Sự kiện #" + t.eventId)}</h3>
          <div class="event-card__meta">${icon("pin")}<span>${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</span></div>
          <div class="ticket-card__tier"><span>${escapeHtml(tier ? tier.name : "Hạng #" + t.tierId)}</span><span class="mono">Vé #${t.id}</span></div>
          ${t.forSale ? `<div class="text-sm" style="margin-top:6px;">Đang rao bán: <strong class="tabular-nums">${fmtEth(t.resalePrice)} ETH</strong></div>` : ""}
        </div>
        <div class="ticket-card__perf" aria-hidden="true"></div>
        <div class="ticket-card__foot">
          <button type="button" class="qr-thumb ticket-card__qr" data-qr="${t.id}" data-view="${t.id}" aria-label="Xem vé #${t.id}"></button>
          <div class="ticket-card__actions">
            <button type="button" class="btn btn-primary btn-sm" data-view="${t.id}">Xem vé</button>
            ${canResell ? `<button type="button" class="btn btn-secondary btn-sm" data-resell="${t.id}">${t.forSale ? "Đổi giá bán" : "Rao bán lại"}</button>` : ""}
            ${t.forSale && !t.checkedIn ? `<button type="button" class="btn btn-ghost btn-sm" data-unlist="${t.id}">Gỡ rao bán</button>` : ""}
          </div>
        </div>
      </article>`;
  }

  // Rao ban / doi gia: kiem tra gia o client (>0, <= 110%) truoc khi gui; hop
  // dong van la lop chan cuoi cung (ResalePriceTooHigh).
  async function resellFlow(row) {
    const { t } = row;
    const max = (t.originalPrice * 11000n) / 10000n;
    const input = await promptPriceModal({
      title: t.forSale ? "Đổi giá rao bán" : "Rao bán lại vé",
      label: "Giá rao bán (ETH)",
      hint: `Giá gốc ${fmtEth(t.originalPrice)} ETH · tối đa ${fmtEth(max)} ETH (110%). Vé thuộc về người đầu tiên trả đúng giá; trước đó bạn có thể đổi giá hoặc gỡ rao bán.`,
      confirmText: t.forSale ? "Cập nhật giá" : "Rao bán",
    });
    if (!input) return;
    let price;
    try { price = ethers.parseEther(String(input).trim()); } catch { throw userError("Giá không hợp lệ."); }
    if (price <= 0n) throw userError("Giá rao bán phải lớn hơn 0.");
    if (price > max) throw userError(`Giá vượt quá 110% giá gốc (tối đa ${fmtEth(max)} ETH).`);
    requireWallet(); requireContract(); requireRightNetwork();
    toast("Vui lòng xác nhận giao dịch trong ví…", "info");
    const tx = await contract.listForResale(t.id, price);
    toast("Đã gửi — đang chờ blockchain xác nhận…", "info");
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw userError("Rao bán thất bại trên blockchain.");
    toast(t.forSale ? "Đã cập nhật giá rao bán." : "Đã rao bán vé.", "success");
    renderMyTickets();
  }

  // Lich su (event log): RPC publicnode chi giu log ~2-3 ngay ("pruned history
  // unavailable"), MetaMask tuy nha cung cap. Doc qua Tenderly (giu du lich su,
  // cho phep CORS - da kiem tra), quet tu khoi chua log dau tien cua hop dong
  // (EventCreated #0), chia khuc de khong vuot gioi han khi chain dai ra.
  const LOGS_RPC_URL = "https://sepolia.gateway.tenderly.co";
  const FIRST_LOG_BLOCK = 12004406; // khoi deploy hop dong v3
  const LOG_CHUNK = 100_000;
  let logsProvider = null;
  function getLogsProvider() {
    if (!logsProvider) {
      const net = ethers.Network.from(SEPOLIA_CHAIN_ID);
      logsProvider = new ethers.JsonRpcProvider(LOGS_RPC_URL, net, { staticNetwork: net });
    }
    return logsProvider;
  }
  // Hop dong it log -> lay TOAN BO log cua hop dong (1 request/khuc thay vi
  // 1 request/loai su kien - tranh bi gioi han tan suat 429), giai ma 1 lan
  // roi loc bang JS. Cache 30s va gop cac lan goi dong thoi.
  let logsCache = null;
  function fetchAllContractLogs(force) {
    if (!force && logsCache && Date.now() - logsCache.at < 30000) return logsCache.promise;
    const promise = (async () => {
      await loadAbi();
      const iface = new ethers.Interface(CONTRACT_ABI);
      const scan = async (prov) => {
        const latest = await prov.getBlockNumber();
        const raw = [];
        for (let from = FIRST_LOG_BLOCK; from <= latest; from += LOG_CHUNK) {
          raw.push(...await prov.getLogs({ address: CONTRACT_ADDRESS, fromBlock: from, toBlock: Math.min(from + LOG_CHUNK - 1, latest) }));
        }
        return raw;
      };
      let raw;
      try {
        raw = await scan(getLogsProvider());
      } catch (err) {
        console.warn("RPC lịch sử lỗi, thử qua ví:", err);
        if (!(provider && userAddress && chainId === SEPOLIA_CHAIN_ID)) throw err;
        raw = await scan(provider);
      }
      return raw.map((l) => {
        let parsed = null;
        try { parsed = iface.parseLog(l); } catch {}
        return parsed && { name: parsed.name, args: parsed.args, blockNumber: l.blockNumber, index: l.index, transactionHash: l.transactionHash };
      }).filter(Boolean);
    })();
    logsCache = { at: Date.now(), promise };
    promise.catch(() => { if (logsCache && logsCache.promise === promise) logsCache = null; });
    return promise;
  }
  const sameAddr = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

  async function renderTicketHistory(histEl, myToken) {
    const me = userAddress;
    const logs = await fetchAllContractLogs(true);
    if (myToken !== renderToken) return;
    const label = (l) => {
      const a = l.args;
      // TicketMinted: "buyer" khong indexed trong hop dong -> loc bang JS o day.
      if (l.name === "TicketMinted" && sameAddr(a.buyer, me)) return "Mua vé";
      if (l.name === "TicketResold" && sameAddr(a.from, me)) return "Bán lại vé (nhận tiền)";
      if (l.name === "TicketResold" && sameAddr(a.to, me)) return "Mua lại vé";
      if (l.name === "TicketListedForResale" && sameAddr(a.seller, me)) return "Rao bán vé";
      if (l.name === "ProceedsWithdrawn" && sameAddr(a.organizer, me)) return "Rút tiền";
      if (l.name === "TicketCheckedIn" && sameAddr(a.owner, me)) return "Check-in vé";
      if (l.name === "TicketResaleCancelled" && sameAddr(a.seller, me)) return "Gỡ rao bán";
      if (l.name === "StaffUpdated" && sameAddr(a.staff, me)) return a.allowed ? "Được cấp quyền CTV" : "Bị thu hồi quyền CTV";
      if (l.name === "EventCreated" && sameAddr(a.organizer, me)) return "Tạo sự kiện";
      return null;
    };
    const evts = logs.map((log) => ({ name: label(log), log })).filter((x) => x.name);
    evts.sort((a, b) => b.log.blockNumber - a.log.blockNumber || b.log.index - a.log.index);
    histEl.innerHTML = evts.length
      ? evts.slice(0, 30).map(({ name, log }) => historyRowHtml(name, log)).join("")
      : `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Ví này chưa có giao dịch nào với FairTicket.</p>`;
  }

  function historyRowHtml(name, log) {
    const a = log.args || {};
    const detail = [];
    if (a.ticketId !== undefined) detail.push("Vé #" + a.ticketId);
    else if (a.eventId !== undefined) detail.push("Sự kiện #" + a.eventId);
    if (a.price !== undefined) detail.push(fmtEth(a.price) + " ETH");
    if (a.amount !== undefined) detail.push(fmtEth(a.amount) + " ETH");
    if (a.resalePrice !== undefined) detail.push(fmtEth(a.resalePrice) + " ETH");
    return `
      <div class="event-row">
        <div class="event-row__main">
          <div class="event-row__title">${name}</div>
          <div class="event-row__meta">${detail.join(" · ")} · khối ${log.blockNumber}</div>
        </div>
        <a class="mono text-sm link" target="_blank" rel="noopener" href="${ETHERSCAN}/tx/${log.transactionHash}">${log.transactionHash.slice(0, 10)}… ${icon("external")}</a>
      </div>`;
  }

  // ---------- Organizer dashboard ----------

  async function renderOrganizerDashboard(myToken) {
    const root = document.getElementById("org-dashboard");
    if (!root) return;
    let evts, tiers, pending;
    try {
      const c = await ensureReadContract();
      [evts, tiers, pending] = await Promise.all([fetchAllEvents(), fetchAllTiers(), c.pendingWithdrawals(userAddress)]);
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error(err);
      root.innerHTML = errorStateHtml("Không tải được dữ liệu", "Mạng/RPC đang chập chờn.");
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    const byEvent = tiersByEvent(tiers);
    const mine = evts.filter((e) => sameAddr(e.organizer, userAddress)).sort((a, b) => Number(b.id - a.id));
    if (mine.length === 0) {
      root.innerHTML = emptyState("Bạn chưa tổ chức sự kiện nào", "Ví này chưa tạo sự kiện trên FairTicket.", `<a class="btn btn-primary" href="#/create" style="margin-top:16px;">Tạo sự kiện đầu tiên</a>`);
      return;
    }
    const rows = mine.map((e) => {
      const ts = byEvent.get(String(e.id)) || [];
      const s = salesSummary(e, ts);
      const revenue = ts.reduce((sum, t) => sum + t.minted * t.price, 0n);
      const status = s.ended ? { key: "ended", label: "Đã diễn ra", cls: "badge-neutral" }
        : !s.hasTiers ? { key: "draft", label: "Chưa mở bán", cls: "badge-neutral" }
        : s.soldOut ? { key: "selling", label: "Hết vé", cls: "badge-danger" }
        : { key: "selling", label: "Đang bán", cls: "badge-success" };
      return { e, ts, s, revenue, status };
    });
    const sum = (f) => rows.reduce((acc, r) => acc + f(r), 0n);
    const kpi = {
      events: rows.length,
      selling: rows.filter((r) => r.status.key === "selling").length,
      minted: sum((r) => r.s.minted),
      supply: sum((r) => r.s.supply),
      revenue: sum((r) => r.revenue),
    };

    root.innerHTML = `
      <div class="kpi-grid">
        <div class="stat"><div class="stat__label">Sự kiện</div><div class="stat__value tabular-nums">${kpi.events}</div><div class="stat__sub">${kpi.selling} đang bán</div></div>
        <div class="stat"><div class="stat__label">Vé đã bán</div><div class="stat__value tabular-nums">${kpi.minted} / ${kpi.supply}</div><div class="stat__sub">còn ${kpi.supply - kpi.minted} vé</div></div>
        <div class="stat"><div class="stat__label">Doanh thu bán lần đầu</div><div class="stat__value tabular-nums">${fmtEth(kpi.revenue)} ETH</div><div class="stat__sub">vé đã bán × giá hạng</div></div>
        <div class="stat"><div class="stat__label">Tiền chờ rút của ví</div><div class="stat__value tabular-nums">${fmtEth(pending)} ETH</div><div class="stat__sub"><a class="link" href="#/my-tickets">Rút tiền</a></div></div>
      </div>

      <div class="section-head" style="margin: var(--sp-5) 0 var(--sp-3);">
        <div><h2 class="h3">Sự kiện của bạn</h2></div>
        <div class="filter-row" style="margin:0;" id="org-filters">
          <button class="chip active" data-of="all">Tất cả</button>
          <button class="chip" data-of="selling">Đang bán</button>
          <button class="chip" data-of="draft">Chưa mở bán</button>
          <button class="chip" data-of="ended">Đã diễn ra</button>
        </div>
      </div>
      <div class="card org-table-wrap"><table class="org-table" id="org-table">
        <thead><tr><th>ID</th><th>Sự kiện</th><th>Ngày</th><th>Trạng thái</th><th>Đã bán</th><th>Doanh thu</th><th></th></tr></thead>
        <tbody></tbody>
      </table></div>

      <h2 class="h3" style="margin: var(--sp-5) 0 var(--sp-3);">Hoạt động gần đây</h2>
      <div class="card" id="org-activity" style="padding: var(--sp-2) var(--sp-3);"><p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Đang tải…</p></div>
    `;

    function drawTable(filter) {
      const tbody = root.querySelector("#org-table tbody");
      const shown = rows.filter((r) => filter === "all" || r.status.key === filter);
      tbody.innerHTML = shown.length ? shown.map(({ e, s, revenue, status }) => {
        const pct = s.supply > 0n ? Number((s.minted * 100n) / s.supply) : 0;
        return `
          <tr>
            <td class="mono" data-label="ID">#${e.id}</td>
            <td data-label="Sự kiện"><a class="link org-table__name" href="#/events/${e.id}">${escapeHtml(e.name)}</a></td>
            <td data-label="Ngày">${fmtDate(e.startTime)}</td>
            <td data-label="Trạng thái"><span class="badge ${status.cls}">${status.label}</span></td>
            <td data-label="Đã bán"><span class="tabular-nums">${s.minted}/${s.supply}</span><span class="supply-bar"><span style="width:${pct}%"></span></span></td>
            <td data-label="Doanh thu" class="tabular-nums">${fmtEth(revenue)} ETH</td>
            <td class="org-table__actions">
              <a class="btn btn-secondary btn-sm" href="#/events/${e.id}">Quản lý</a>
              ${s.hasTiers ? `<a class="btn btn-dark btn-sm" href="#/check-in?event=${e.id}">Check-in</a>` : ""}
            </td>
          </tr>`;
      }).join("") : `<tr><td colspan="7" class="text-secondary" style="text-align:center;padding:24px;">Không có sự kiện ở mục này.</td></tr>`;
    }
    root.querySelectorAll("#org-filters .chip").forEach((chip) => chip.addEventListener("click", () => {
      root.querySelectorAll("#org-filters .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      drawTable(chip.dataset.of);
    }));
    drawTable("all");

    // Hoat dong: log cua cac su kien cua toi. Log ve (check-in/ban lai) chi
    // co ticketId -> suy ra su kien qua log TicketMinted(ticketId, ..., eventId).
    try {
      const logs = await fetchAllContractLogs(true);
      if (myToken !== renderToken) return;
      const myIds = new Set(mine.map((e) => String(e.id)));
      const ticketEvent = new Map();
      logs.filter((l) => l.name === "TicketMinted").forEach((l) => ticketEvent.set(String(l.args.ticketId), String(l.args.eventId)));
      const evName = (id) => { const e = mine.find((x) => String(x.id) === id); return e ? e.name : "#" + id; };
      const items = logs.map((l) => {
        const a = l.args;
        const evId = a.eventId !== undefined ? String(a.eventId) : a.ticketId !== undefined ? ticketEvent.get(String(a.ticketId)) : null;
        if (!evId || !myIds.has(evId)) return null;
        const map = {
          EventCreated: "Tạo sự kiện",
          TierCreated: `Thêm hạng vé “${escapeHtml(a.name)}”`,
          TicketMinted: `Bán vé #${a.ticketId} · ${fmtEth(a.price)} ETH`,
          TicketListedForResale: `Vé #${a.ticketId} được rao bán lại · ${fmtEth(a.resalePrice)} ETH`,
          TicketResold: `Vé #${a.ticketId} đổi chủ · ${fmtEth(a.amount)} ETH`,
          TicketCheckedIn: `Check-in vé #${a.ticketId}`,
          TicketResaleCancelled: `Vé #${a.ticketId} gỡ rao bán`,
          StaffUpdated: a.staff ? `${a.allowed ? "Cấp quyền" : "Thu hồi quyền"} CTV ${shortAddr(a.staff)}` : "",
        };
        if (!map[l.name]) return null;
        return { text: map[l.name], ev: evName(evId), l };
      }).filter(Boolean).sort((x, y) => y.l.blockNumber - x.l.blockNumber || y.l.index - x.l.index).slice(0, 15);
      const act = root.querySelector("#org-activity");
      act.innerHTML = items.length ? items.map(({ text, ev, l }) => `
        <div class="event-row">
          <div class="event-row__main"><div class="event-row__title">${text}</div><div class="event-row__meta">${escapeHtml(ev)} · khối ${l.blockNumber}</div></div>
          <a class="mono text-sm link" target="_blank" rel="noopener" href="${ETHERSCAN}/tx/${l.transactionHash}">${l.transactionHash.slice(0, 10)}… ${icon("external")}</a>
        </div>`).join("") : `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Chưa có hoạt động nào.</p>`;
    } catch (err) {
      console.warn("Không tải được hoạt động:", err);
      const act = root.querySelector("#org-activity");
      if (act) act.innerHTML = `<p class="text-secondary text-sm" style="padding: var(--sp-3) 0;">Không tải được hoạt động (mạng/RPC).</p>`;
    }
  }

  // ---------- Check-in (ve ky so, co thoi han) ----------

  // QR dong: "FT1:<ticketId>:<timestampMs>:<signature>". Chu ve ky thong diep
  // ben duoi bang vi (mien phi). Ben kiem ve khoi phuc dia chi da ky va so voi
  // CHU VE HIEN TAI tren chain -> anh chup QR cua nguoi khac / QR cu het han
  // khong dung duoc. Hop dong van la lop chan cuoi (check-in 1 lan, chi organizer).
  const CHECKIN_TTL_MS = 5 * 60 * 1000;
  function checkinMessage(ticketId, ts) {
    return `FairTicket check-in: vé #${ticketId} lúc ${ts}`;
  }

  async function createCheckinCode(ticketId) {
    if (!signer) throw userError("Kết nối ví chủ vé để tạo mã check-in.");
    const ts = Date.now();
    const sig = await signer.signMessage(checkinMessage(ticketId, ts));
    return { code: `FT1:${ticketId}:${ts}:${sig.slice(2).toUpperCase()}`, expiresAt: ts + CHECKIN_TTL_MS };
  }

  // Tra ve ket qua kiem tra (khong gui giao dich). raw: ma QR dong hoac so ve.
  async function verifyCheckinInput(raw, eventId) {
    const text = String(raw || "").trim();
    let ticketId, signed = null;
    // Nhan ca dang cu "0x..." chu thuong lan dang moi viet HOA khong "0x".
    const m = /^FT1:(\d+):(\d+):(?:0x)?([0-9a-f]{130})$/i.exec(text);
    if (m) {
      ticketId = BigInt(m[1]);
      const ts = Number(m[2]);
      let signerAddr = null;
      try { signerAddr = ethers.verifyMessage(checkinMessage(ticketId, ts), "0x" + m[3].toLowerCase()); } catch {}
      signed = { ts, signer: signerAddr, ageMs: Date.now() - ts };
    } else if (/^\d+$/.test(text)) {
      ticketId = BigInt(text);
    } else {
      return { ok: false, error: "Mã không hợp lệ — cần mã QR check-in của FairTicket hoặc số vé." };
    }
    const c = await ensureReadContract();
    if (ticketId >= await c.nextTicketId()) return { ok: false, ticketId, error: `Vé #${ticketId} không tồn tại.` };
    const raw2 = await c.tickets(ticketId);
    const t = { id: ticketId, eventId: raw2.eventId, tierId: raw2.tierId, owner: raw2.owner, checkedIn: raw2.checkedIn, forSale: raw2.forSale };
    if (t.eventId !== eventId) return { ok: false, ticketId, t, error: `Vé #${ticketId} không thuộc sự kiện này (thuộc sự kiện #${t.eventId}).` };
    if (t.checkedIn) return { ok: false, ticketId, t, error: `Vé #${ticketId} đã được check-in trước đó.` };
    if (signed) {
      if (!signed.signer) return { ok: false, ticketId, t, error: "Chữ ký trong mã QR không hợp lệ." };
      if (signed.ageMs > CHECKIN_TTL_MS) return { ok: false, ticketId, t, error: "Mã QR đã hết hạn — nhờ khách bấm “Tạo mã check-in” lại." };
      if (signed.ageMs < -2 * 60 * 1000) return { ok: false, ticketId, t, error: "Thời gian trong mã QR không hợp lệ (đồng hồ thiết bị lệch)." };
      if (!sameAddr(signed.signer, t.owner)) return { ok: false, ticketId, t, error: "Mã QR không do chủ vé hiện tại ký (vé có thể đã đổi chủ hoặc đây là ảnh chụp lại)." };
    }
    const tier = (await fetchAllTiers()).find((x) => x.id === t.tierId);
    return { ok: true, ticketId, t, tier, signed };
  }

  let barcodeDetector;
  async function nativeDetect(source) {
    if (barcodeDetector === null) return null;
    if (barcodeDetector === undefined) {
      barcodeDetector = null;
      try {
        if ("BarcodeDetector" in window && (await window.BarcodeDetector.getSupportedFormats()).includes("qr_code")) {
          barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
        }
      } catch {}
      if (!barcodeDetector) return null;
    }
    try {
      const found = await barcodeDetector.detect(source);
      return found[0] ? found[0].rawValue : null;
    } catch { return null; }
  }
  function jsQrDetect(jsQR, canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
    return r ? r.data : null;
  }
  // Doc QR tu anh: thu trinh doc goc, roi jsQR o nhieu cach. Anh chup bang
  // camera dien thoai ~4000px, QR co the chi chiem ~10% - truoc day luon thu
  // nho ve 1200px nen moi o QR chi con 2-3 diem anh -> "khong tim thay".
  // Do thu: doc o do phan giai goc (<=3000px) truoc, roi cat phan giua.
  async function decodeQrFromImage(bmp) {
    const native = await nativeDetect(bmp);
    if (native) return native;
    const jsQR = await loadJsQr();
    const attempts = [[3000, false], [1600, true], [2400, true], [1600, false], [1000, false], [640, false]];
    for (const [target, crop] of attempts) {
      const sx = crop ? bmp.width * 0.2 : 0, sy = crop ? bmp.height * 0.2 : 0;
      const sw = crop ? bmp.width * 0.6 : bmp.width, sh = crop ? bmp.height * 0.6 : bmp.height;
      const scale = Math.min(1, target / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext("2d", { willReadFrequently: true }).drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const data = jsQrDetect(jsQR, canvas);
      if (data) return data;
    }
    return null;
  }

  let scanStream = null;
  function stopScanner() {
    if (scanStream) { scanStream.getTracks().forEach((tr) => tr.stop()); scanStream = null; }
  }

  let jsQrPromise = null;
  function loadJsQr() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (!jsQrPromise) {
      jsQrPromise = new Promise((resolve, reject) => {
        const sc = document.createElement("script");
        sc.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
        sc.onload = () => resolve(window.jsQR);
        sc.onerror = () => { jsQrPromise = null; reject(userError("Không tải được bộ đọc mã QR.")); };
        document.head.appendChild(sc);
      });
    }
    return jsQrPromise;
  }

  routes.checkin = async function (query) {
    const myToken = renderToken;
    $root().innerHTML = `<div class="page container"><div class="skel" style="height:320px;margin-top:var(--sp-5);"></div></div>`;
    if (!userAddress) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Kết nối ví Organizer hoặc CTV</h3><p>Chỉ ví Organizer của sự kiện, hoặc ví CTV được Organizer cấp quyền, mới check-in được vé.</p><button type="button" class="btn btn-primary" id="ci-connect" style="margin-top:16px;">Kết nối ví</button></div></div>`;
      document.getElementById("ci-connect").addEventListener("click", (e) => withBusy(e.currentTarget, connectWallet, { keepContentOnSuccess: true }));
      return;
    }
    let evts;
    try { evts = await fetchAllEvents(); } catch (err) {
      if (myToken !== renderToken) return;
      $root().innerHTML = `<div class="page container">${errorStateHtml("Không tải được sự kiện", "Mạng/RPC đang chập chờn.")}</div>`;
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    // Su kien ma vi nay duoc soat ve: minh to chuc, hoac duoc cap quyen CTV.
    let staffFlags;
    try {
      const c = await ensureReadContract();
      staffFlags = await Promise.all(evts.map((e) => (sameAddr(e.organizer, userAddress) ? true : c.isStaff(e.id, userAddress))));
    } catch (err) {
      if (myToken !== renderToken) return;
      $root().innerHTML = `<div class="page container">${errorStateHtml("Không kiểm tra được quyền soát vé", "Mạng/RPC đang chập chờn.")}</div>`;
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;
    const mine = evts
      .map((e, i) => ({ ...e, role: sameAddr(e.organizer, userAddress) ? "organizer" : staffFlags[i] ? "staff" : null }))
      .filter((e) => e.role)
      .sort((a, b) => Number(a.startTime) - Number(b.startTime));
    if (!mine.length) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Ví này chưa có quyền soát vé</h3><p>Ví không tổ chức sự kiện nào và chưa được cấp quyền CTV. Gửi địa chỉ ví này cho Organizer để được cấp quyền:</p><p class="mono" style="margin-top:8px;">${userAddress}</p><button type="button" class="copy-btn" data-copy="${userAddress}" style="margin-top:8px;">Sao chép địa chỉ</button></div></div>`;
      $root().querySelectorAll("[data-copy]").forEach(bindCopy);
      return;
    }
    const wanted = query.get("event");
    const nowTs = Math.floor(Date.now() / 1000);
    const selected = mine.find((e) => String(e.id) === wanted) || mine.find((e) => Number(e.startTime) > nowTs - 86400) || mine[0];
    let eventId = selected.id;
    // Nhat ky phien: { id, owner, at, status: "pending" | "ok" | "fail", hash, error }
    const sessionLog = [];
    // Ve da gui giao dich check-in nhung chua co khoi xac nhan -> chan quet lai.
    const pendingIds = new Set();
    // Ve da ghi thanh cong trong phien: chan ngay ca khi RPC con cham 1 khoi
    // (van bao "chua check-in") - tranh bat MetaMask lan 2 cho cung 1 ve.
    const doneIds = new Map();
    const AUTO_KEY = "fairticket:ci-auto";
    let autoMode = true;
    try { autoMode = localStorage.getItem(AUTO_KEY) !== "0"; } catch {}

    $root().innerHTML = h`
      <div class="page container checkin-page">
        <div class="section-head" style="margin-top: var(--sp-5);">
          <div><h1 class="h2">Check-in tại cửa</h1><p>Quét mã check-in trên điện thoại của khách. Hệ thống tự kiểm tra trên blockchain trước khi ghi.</p></div>
        </div>
        <div class="field" style="max-width:480px;">
          <label for="ci-event">Sự kiện đang check-in</label>
          <select id="ci-event">${mine.map((e) => `<option value="${e.id}" ${e.id === eventId ? "selected" : ""}>#${e.id} · ${escapeHtml(e.name)} — ${fmtDate(e.startTime)} · ${e.role === "organizer" ? "Organizer" : "CTV"}</option>`).join("")}</select>
        </div>
        <label class="ci-auto">
          <input type="checkbox" id="ci-auto" ${autoMode ? "checked" : ""} />
          <span><strong>Chế độ quét liên tục</strong> — vé hợp lệ (có chữ ký) tự mở MetaMask; duyệt xong quét ngay người tiếp theo, giao dịch chạy nền. Tắt đi thì phải bấm "Xác nhận" từng vé.</span>
        </label>
        <div class="checkin-grid">
          <section class="card checkout-card">
            <h2 class="h3">Quét mã QR</h2>
            <div class="scanner" id="ci-scanner">
              <video id="ci-video" playsinline muted hidden></video>
              <div class="scanner__placeholder" id="ci-placeholder">${icon("ticket", "icon")}<span>Camera đang tắt</span></div>
            </div>
            <div class="organizer-actions">
              <button type="button" class="btn btn-dark" id="ci-cam">Bật camera</button>
              <label class="btn btn-secondary" for="ci-file">Tải ảnh mã QR</label>
              <input type="file" id="ci-file" accept="image/*" hidden />
            </div>
            <div class="field" style="margin: var(--sp-4) 0 0;">
              <label for="ci-manual">Hoặc dán mã / nhập số vé</label>
              <div class="checkin-row" style="margin-top:0;">
                <input id="ci-manual" placeholder="FT1:… hoặc số vé" autocomplete="off" />
                <button type="button" class="btn btn-secondary" id="ci-check">Kiểm tra</button>
              </div>
            </div>
          </section>
          <section class="card checkout-card">
            <div class="ci-status ci-status--idle" id="ci-status" role="status" aria-live="assertive">Sẵn sàng quét</div>
            <div id="ci-result"></div>
            <div class="ci-stats" id="ci-stats"></div>
            <h3 class="h3" style="font-size:15px;margin-top:var(--sp-4);">Nhật ký phiên này</h3>
            <ul class="checkin-log" id="ci-log"><li class="text-secondary">—</li></ul>
          </section>
        </div>
      </div>
    `;

    const resultEl = document.getElementById("ci-result");
    const statusEl = document.getElementById("ci-status");
    const video = document.getElementById("ci-video");
    let scanning = false;
    let busy = false;

    document.getElementById("ci-event").addEventListener("change", (e) => {
      eventId = BigInt(e.target.value);
      history.replaceState(null, "", "#/check-in?event=" + eventId);
      resultEl.innerHTML = "";
      setStatus("idle", "Sẵn sàng quét");
    });
    document.getElementById("ci-auto").addEventListener("change", (e) => {
      autoMode = e.target.checked;
      try { localStorage.setItem(AUTO_KEY, autoMode ? "1" : "0"); } catch {}
    });

    function show(kind, html) { resultEl.innerHTML = html ? `<div class="checkin-result checkin-result--${kind}">${html}</div>` : ""; }
    function setStatus(kind, text) {
      statusEl.className = "ci-status ci-status--" + kind;
      statusEl.textContent = text;
    }

    // Tieng bip + rung de nhan vien khong can nhin man hinh moi lan quet.
    let audioCtx = null;
    function feedback(ok) {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = ok ? 1046 : 220;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + (ok ? 0.12 : 0.35));
      } catch {}
      try { navigator.vibrate?.(ok ? 80 : [80, 60, 80]); } catch {}
    }

    function renderLog() {
      const ok = sessionLog.filter((d) => d.status === "ok").length;
      const pend = sessionLog.filter((d) => d.status === "pending").length;
      const fail = sessionLog.filter((d) => d.status === "fail").length;
      document.getElementById("ci-stats").innerHTML = sessionLog.length
        ? `Đã ghi lên chain: <strong>${ok}</strong> · Đang chờ khối: <strong>${pend}</strong>${fail ? ` · <span class="text-danger">Thất bại: <strong>${fail}</strong></span>` : ""}`
        : "";
      const label = { pending: "⏳ đang chờ khối", ok: "✓ đã ghi", fail: "✗ thất bại" };
      document.getElementById("ci-log").innerHTML = sessionLog.length ? sessionLog.map((d) => `
        <li class="ci-log-item ci-log-item--${d.status}">
          <span><span class="mono">Vé #${d.id}</span> · ${shortAddr(d.owner)} · ${d.at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          <span>${label[d.status]}${d.error ? " — " + escapeHtml(d.error) : ""} · <a class="link" href="${ETHERSCAN}/tx/${d.hash}" target="_blank" rel="noopener">tx</a></span>
        </li>`).join("") : `<li class="text-secondary">—</li>`;
    }

    // Gui checkIn(): cho nguoi dung duyet trong MetaMask, KHONG cho khoi - theo
    // doi khoi o nen va cap nhat nhat ky (that bai thi bao to + bip).
    async function submitCheckin(r) {
      requireContract();
      requireRightNetwork();
      const id = String(r.ticketId);
      if (pendingIds.has(id)) { setStatus("bad", `Vé #${id} đang được check-in — chờ khối xác nhận.`); feedback(false); return; }
      setStatus("info", `Vé #${id} hợp lệ — duyệt giao dịch trong MetaMask…`);
      let tx;
      try {
        tx = await contract.checkIn(r.t.eventId, r.ticketId);
      } catch (err) {
        setStatus("bad", `Vé #${id}: ${friendlyError(err)}`);
        feedback(false);
        return;
      }
      pendingIds.add(id);
      const entry = { id, owner: r.t.owner, at: new Date(), status: "pending", hash: tx.hash, error: "" };
      sessionLog.unshift(entry);
      renderLog();
      setStatus("ok", `✓ Vé #${id} hợp lệ, đã gửi check-in — mời khách vào. Sẵn sàng quét người tiếp theo.`);
      feedback(true);
      show("", "");
      document.getElementById("ci-manual").value = "";
      tx.wait().then((receipt) => {
        if (receipt && receipt.status === 1) { entry.status = "ok"; doneIds.set(id, entry.at); }
        else { entry.status = "fail"; entry.error = "giao dịch bị revert"; }
      }).catch((err) => {
        entry.status = "fail";
        entry.error = friendlyError(err);
      }).finally(() => {
        pendingIds.delete(id);
        if (myToken !== renderToken) return;
        renderLog();
        if (entry.status === "fail") {
          toast(`Check-in vé #${id} THẤT BẠI trên blockchain (${entry.error}). Kiểm tra lại khách này.`, "error");
          feedback(false);
        }
      });
    }

    async function handleInput(raw) {
      if (busy) return;
      busy = true;
      setStatus("info", "Đang kiểm tra trên blockchain…");
      try {
        requireRightNetwork();
        const r = await verifyCheckinInput(raw, eventId);
        if (myToken !== renderToken) return;
        if (!r.ok) {
          setStatus("bad", "✗ Không hợp lệ");
          show("bad", escapeHtml(r.error));
          feedback(false);
          return;
        }
        if (doneIds.has(String(r.ticketId))) {
          setStatus("bad", `Vé #${r.ticketId} đã check-in lúc ${doneIds.get(String(r.ticketId)).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} (phiên này).`);
          show("", "");
          feedback(false);
          return;
        }
        if (pendingIds.has(String(r.ticketId))) {
          setStatus("bad", `Vé #${r.ticketId} vừa được check-in — đang chờ khối xác nhận.`);
          show("", "");
          feedback(false);
          return;
        }
        const sigLine = r.signed
          ? `<div class="text-sm">✓ Chữ ký của chủ vé hợp lệ · mã tạo ${Math.max(0, Math.round(r.signed.ageMs / 1000))} giây trước</div>`
          : `<div class="text-sm"><strong>Không có chữ ký</strong> — chỉ nhập số vé. Hãy đối chiếu ví <span class="mono">${shortAddr(r.t.owner)}</span> trên điện thoại khách trước khi xác nhận.</div>`;
        const details = `
          <div style="font-size:16px;"><strong>Vé #${r.ticketId}</strong> · ${escapeHtml(r.tier ? r.tier.name : "Hạng #" + r.t.tierId)}</div>
          <div class="text-sm">Chủ vé: <span class="mono">${shortAddr(r.t.owner)}</span>${r.t.forSale ? " · đang rao bán (check-in sẽ khoá việc bán lại)" : ""}</div>
          ${sigLine}`;
        // Tu dong chi khi co chu ky; nhap tay so ve luon can nguoi doi chieu vi.
        if (autoMode && r.signed) {
          show("ok", details);
          await submitCheckin(r);
          return;
        }
        setStatus(r.signed ? "ok" : "warn", r.signed ? "Hợp lệ — bấm “Xác nhận check-in”" : "Cần đối chiếu ví thủ công");
        feedback(!!r.signed);
        show(r.signed ? "ok" : "warn", details + `<button type="button" class="btn btn-dark" id="ci-confirm" style="margin-top:12px;">Xác nhận check-in</button>`);
        document.getElementById("ci-confirm").addEventListener("click", async (ev) => {
          if (busy) return;
          busy = true;
          ev.currentTarget.disabled = true;
          try { await submitCheckin(r); } catch (err) { setStatus("bad", friendlyError(err)); feedback(false); } finally { busy = false; }
        });
      } catch (err) {
        console.error(err);
        setStatus("bad", "✗ Lỗi");
        show("bad", escapeHtml(friendlyError(err)));
        feedback(false);
      } finally {
        busy = false;
      }
    }

    document.getElementById("ci-check").addEventListener("click", () => handleInput(document.getElementById("ci-manual").value));
    document.getElementById("ci-manual").addEventListener("keydown", (e) => { if (e.key === "Enter") handleInput(e.target.value); });

    document.getElementById("ci-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      setStatus("info", "Đang đọc mã QR trong ảnh…");
      try {
        const data = await decodeQrFromImage(await createImageBitmap(file));
        if (!data) { setStatus("bad", "✗ Không tìm thấy mã QR"); feedback(false); show("bad", "Không tìm thấy mã QR trong ảnh. Chụp gần hơn, đủ sáng, không bị loá — tốt nhất là ảnh chụp màn hình mã của khách — hoặc dán mã / nhập số vé."); return; }
        document.getElementById("ci-manual").value = data;
        handleInput(data);
      } catch (err) {
        show("bad", escapeHtml(friendlyError(err)));
      }
    });

    const camBtn = document.getElementById("ci-cam");
    camBtn.addEventListener("click", async () => {
      if (scanning) { scanning = false; stopScanner(); video.hidden = true; document.getElementById("ci-placeholder").hidden = false; camBtn.textContent = "Bật camera"; return; }
      try {
        const jsQR = await loadJsQr();
        if (!navigator.mediaDevices?.getUserMedia) throw userError("Trình duyệt này không cho dùng camera (VD trình duyệt bên trong ví) — dùng “Tải ảnh mã QR”, dán mã hoặc nhập số vé.");
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        video.srcObject = scanStream;
        await video.play();
        video.hidden = false;
        document.getElementById("ci-placeholder").hidden = true;
        camBtn.textContent = "Tắt camera";
        scanning = true;
        setStatus("idle", "Đưa mã QR vào giữa khung hình, cách 15–25 cm");
        const canvas = document.createElement("canvas");
        let last = "";
        let lastAt = 0;
        // Quet ~6 lan/giay (khong phai moi khung hinh) de may yeu khong bi giat.
        const tick = async () => {
          if (!scanning || myToken !== renderToken || !document.body.contains(video)) { stopScanner(); return; }
          if (video.readyState >= 2 && !busy) {
            let data = await nativeDetect(video);
            if (!data) {
              // Chi doc phan giua khung hinh (vuong) - nhanh hon va it nhieu hon.
              const side = Math.min(video.videoWidth, video.videoHeight);
              canvas.width = canvas.height = Math.min(side, 800);
              canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
              data = jsQrDetect(jsQR, canvas);
            }
            // Cung 1 ma: bo qua trong 4 giay de khong kiem tra lap lai lien tuc.
            if (data && (data !== last || Date.now() - lastAt > 4000)) {
              last = data;
              lastAt = Date.now();
              document.getElementById("ci-manual").value = data;
              handleInput(data);
            }
          }
          setTimeout(tick, 160);
        };
        tick();
      } catch (err) {
        const msg = err?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng camera (bật lại trong cài đặt trình duyệt)."
          : err?.name === "NotFoundError" ? "Không tìm thấy camera trên thiết bị này."
          : err?.name === "NotReadableError" ? "Camera đang được ứng dụng khác dùng."
          : friendlyError(err);
        show("bad", escapeHtml(msg));
      }
    });
  };

  // ---------- Page: Checkout ----------

  // Dang co giao dich mua do dang chay -> khong ve lai trang (mat tien do) va
  // khong cho bat dau luot mua thu 2 chong len.
  let purchaseInFlight = false;
  window.addEventListener("beforeunload", (e) => {
    if (purchaseInFlight) { e.preventDefault(); e.returnValue = ""; }
  });

  routes.checkout = async function (eventIdStr, tierIdStr, qtyStr) {
    const myToken = renderToken;
    if (!/^\d+$/.test(eventIdStr) || !/^\d+$/.test(tierIdStr)) return renderNotFound(eventIdStr);
    const eventId = BigInt(eventIdStr);
    const tierId = BigInt(tierIdStr);
    const qty = Math.min(10, Math.max(1, parseInt(qtyStr, 10) || 1));

    $root().innerHTML = `<div class="page container"><div class="checkout-layout"><div class="skel" style="height:360px;"></div><div class="skel" style="height:300px;"></div></div></div>`;

    let evt, tier;
    try {
      if (!isConfigured()) { await loadAbi(); }
      if (!isConfigured()) {
        evt = MOCK_EVENTS.find((e) => e.id === eventId);
        tier = MOCK_TIERS.find((t) => t.id === tierId);
      } else {
        const c = await ensureReadContract();
        const [e, t, nTier] = await Promise.all([c.events(eventId), c.tiers(tierId), c.nextTierId()]);
        if (e.organizer !== ethers.ZeroAddress) evt = { id: eventId, name: e.name, startTime: e.startTime, organizer: e.organizer };
        if (tierId < nTier) tier = { id: tierId, eventId: t.eventId, name: t.name, price: t.price, maxSupply: t.maxSupply, minted: t.minted };
      }
    } catch (err) {
      if (myToken !== renderToken) return;
      console.error(err);
      $root().innerHTML = `<div class="page container">${errorStateHtml("Không tải được thông tin vé", "Mạng/RPC đang chập chờn.")}</div>`;
      wireRetry();
      return;
    }
    if (myToken !== renderToken) return;

    if (!evt || !tier || tier.eventId !== eventId) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Không tìm thấy hạng vé</h3><p>Hạng vé không tồn tại hoặc không thuộc sự kiện này.</p><a class="btn btn-secondary" href="#/events/${eventId}" style="margin-top:16px;">← Quay lại sự kiện</a></div></div>`;
      return;
    }
    if (Math.floor(Date.now() / 1000) >= Number(evt.startTime)) {
      $root().innerHTML = `<div class="page container"><div class="empty-state"><h3>Sự kiện đã diễn ra</h3><p>Không thể mua vé cho sự kiện đã bắt đầu.</p><a class="btn btn-secondary" href="#/events/${eventId}" style="margin-top:16px;">← Quay lại sự kiện</a></div></div>`;
      return;
    }

    const meta = getMeta(eventId);
    const subtotal = tier.price * BigInt(qty);

    $root().innerHTML = h`
      <div class="page container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/events/${eventId}">← ${escapeHtml(evt.name)}</a></nav>
        <h1 class="h2" style="margin-bottom: var(--sp-4);">Thanh toán</h1>
        <div class="checkout-layout">
          <div>
            <section class="card checkout-card">
              <div class="mini-event-card" style="padding:0; margin:0;">
                <img src="${eventImage(meta, eventId)}" alt="" />
                <div>
                  <div style="font-weight:600;">${escapeHtml(evt.name)}</div>
                  <div class="text-secondary text-sm">${fmtCardDate(evt.startTime)} · ${escapeHtml(meta.location || "Địa điểm cập nhật sau")}</div>
                </div>
              </div>
            </section>

            <section class="card checkout-card" id="checks-card">
              <h2 class="h3">Kiểm tra trước khi thanh toán</h2>
              <ul class="check-list" id="check-list">
                <li class="check-item is-pending"><span class="check-dot"></span><span>Đang kiểm tra…</span></li>
              </ul>
            </section>

            <section class="card checkout-card" id="progress-card" hidden>
              <h2 class="h3">Tiến trình giao dịch</h2>
              <p class="text-sm text-secondary" style="margin-top:4px;">Đừng đóng trang cho tới khi hoàn tất.</p>
              <ol class="tx-list" id="tx-list"></ol>
              <div id="checkout-result"></div>
            </section>
          </div>

          <aside class="card checkout-card checkout-summary">
            <h2 class="h3">Đơn hàng</h2>
            <div class="checkout-row"><span class="text-secondary">Hạng vé</span><span>${escapeHtml(tier.name)}</span></div>
            <div class="checkout-row"><span class="text-secondary">Đơn giá</span><span class="tabular-nums">${fmtEth(tier.price)} ETH</span></div>
            <div class="checkout-row"><span class="text-secondary">Số lượng</span><span class="tabular-nums">${qty}</span></div>
            <div class="checkout-row"><span class="text-secondary">Phí gas ước tính</span><span class="tabular-nums" id="gas-est">…</span></div>
            <div class="checkout-divider"></div>
            <div class="checkout-total"><span>Tổng thanh toán</span><span class="tabular-nums">${fmtEth(subtotal)} ETH</span></div>
            <p class="hint-sm" style="text-align:right;margin-top:2px;">+ phí gas (trả cho mạng, không phải cho FairTicket)</p>
            <div class="checkout-divider"></div>
            <div class="checkout-row"><span class="text-secondary">Mạng</span><span>Ethereum Sepolia</span></div>
            <div class="checkout-row"><span class="text-secondary">Ví thanh toán</span><span class="mono" id="pay-wallet">${userAddress ? shortAddr(userAddress) : "—"}</span></div>
            <p class="hint-sm">${qty > 1 ? `Mua ${qty} vé = ${qty} giao dịch, xác nhận lần lượt trong ví. ` : ""}Vé không hoàn tiền; bán lại tối đa 110% giá gốc.</p>
            <button id="btn-pay" class="btn btn-accent btn-block btn-lg" style="margin-top: var(--sp-3);" disabled>Xác nhận &amp; thanh toán</button>
            <a href="#/events/${eventId}" class="btn btn-ghost btn-block" id="btn-back" style="margin-top: var(--sp-2);">Quay lại</a>
          </aside>
        </div>
      </div>
    `;

    const payBtn = document.getElementById("btn-pay");

    async function runChecks() {
      const items = [];
      let ok = true;
      const add = (state, text, actionHtml) => { items.push({ state, text, actionHtml }); if (state !== "ok") ok = false; };
      let freshTier = tier;
      if (!window.ethereum) {
        add("bad", "Chưa có ví trên trình duyệt này — cài MetaMask để mua vé.");
      } else if (!userAddress) {
        add("bad", "Chưa kết nối ví.", `<button type="button" class="btn btn-primary btn-sm" data-act="connect">Kết nối ví</button>`);
      } else {
        add("ok", `Ví đã kết nối: <span class="mono">${shortAddr(userAddress)}</span>`);
        if (chainId !== SEPOLIA_CHAIN_ID) add("bad", "Ví đang ở sai mạng.", `<button type="button" class="btn btn-dark btn-sm" data-act="switch">Chuyển sang Sepolia</button>`);
        else add("ok", "Đúng mạng Ethereum Sepolia.");
      }
      try {
        const c = await ensureReadContract();
        const t = await c.tiers(tierId);
        freshTier = { ...tier, minted: t.minted, maxSupply: t.maxSupply };
        const remaining = t.maxSupply - t.minted;
        if (remaining >= BigInt(qty)) add("ok", `Còn ${remaining} vé hạng ${escapeHtml(tier.name)} — đủ cho ${qty} vé.`);
        else add("bad", remaining === 0n ? "Hạng vé này vừa bán hết." : `Chỉ còn ${remaining} vé — giảm số lượng ở trang sự kiện.`);
      } catch {
        add("bad", "Không đọc được số vé còn lại (mạng/RPC). Thử tải lại trang.");
      }
      let fee = null;
      if (userAddress && chainId === SEPOLIA_CHAIN_ID && contract) {
        try {
          const balance = await provider.getBalance(userAddress);
          if (balance < subtotal) {
            add("bad", `Số dư không đủ: cần ${fmtEth(subtotal)} ETH + phí gas, ví có ${fmtEthShort(balance)} ETH.`);
          } else {
            // Chay thu giao dich (khong gui) de biet truoc hop dong co tu choi khong.
            const [gas, feeData] = await Promise.all([
              contract.mintTicket.estimateGas(tierId, { value: tier.price }),
              provider.getFeeData(),
            ]);
            const perGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
            fee = gas * perGas * BigInt(qty);
            if (balance >= subtotal + fee) add("ok", `Số dư đủ (${fmtEthShort(balance)} ETH).`);
            else add("bad", `Số dư không đủ: cần khoảng ${fmtEth(subtotal + fee)} ETH kể cả phí gas, ví có ${fmtEthShort(balance)} ETH.`);
          }
        } catch (err) {
          add("bad", "Giao dịch thử không thành công: " + friendlyError(err));
        }
      }
      if (myToken !== renderToken || purchaseInFlight) return;
      document.getElementById("gas-est").textContent = fee !== null ? (fee * 1000000n < 10n ** 18n ? "" : "~") + fmtEthShort(fee) + " ETH" : "—";
      document.getElementById("pay-wallet").textContent = userAddress ? shortAddr(userAddress) : "—";
      const list = document.getElementById("check-list");
      list.innerHTML = items.map((i) => `<li class="check-item is-${i.state}"><span class="check-dot" aria-hidden="true">${i.state === "ok" ? "✓" : "!"}</span><span>${i.text}</span>${i.actionHtml || ""}</li>`).join("");
      list.querySelector('[data-act="connect"]')?.addEventListener("click", (e) => withBusy(e.currentTarget, connectWallet, { keepContentOnSuccess: true }));
      list.querySelector('[data-act="switch"]')?.addEventListener("click", switchToSepolia);
      payBtn.disabled = !ok;
    }

    payBtn.addEventListener("click", async () => {
      if (purchaseInFlight || payBtn.disabled) return;
      purchaseInFlight = true;
      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span> Đang xử lý…';
      document.getElementById("btn-back").classList.add("is-disabled-link");
      document.getElementById("checks-card").hidden = true;
      const progress = document.getElementById("progress-card");
      progress.hidden = false;
      const txList = document.getElementById("tx-list");
      txList.innerHTML = Array.from({ length: qty }, (_, i) => `<li class="tx-item is-waiting" id="tx-${i}"><span class="tx-item__label">Vé ${i + 1}/${qty}</span><span class="tx-item__state">Chờ</span></li>`).join("");
      const setTx = (i, state, html) => {
        const el = document.getElementById("tx-" + i);
        if (!el) return;
        el.className = "tx-item is-" + state;
        el.querySelector(".tx-item__state").innerHTML = html;
      };

      const minted = [];
      let failure = null;
      for (let i = 0; i < qty; i++) {
        try {
          setTx(i, "active", "Chờ xác nhận trong ví…");
          const tx = await contract.mintTicket(tierId, { value: tier.price });
          setTx(i, "active", `Đã gửi · đang chờ khối… <a class="link" href="${ETHERSCAN}/tx/${tx.hash}" target="_blank" rel="noopener">xem</a>`);
          const receipt = await tx.wait();
          if (!receipt || receipt.status !== 1) throw userError("Giao dịch bị revert trên blockchain.");
          const log = receipt.logs.map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } }).find((l) => l && l.name === "TicketMinted");
          const ticketId = log ? log.args.ticketId : null;
          minted.push({ ticketId, hash: receipt.hash });
          setTx(i, "ok", `Thành công${ticketId !== null ? " · Vé #" + ticketId : ""} · <a class="link" href="${ETHERSCAN}/tx/${receipt.hash}" target="_blank" rel="noopener">xem</a>`);
        } catch (err) {
          console.error(err);
          failure = friendlyError(err);
          setTx(i, "bad", escapeHtml(failure));
          for (let k = i + 1; k < qty; k++) setTx(k, "skip", "Đã dừng");
          break;
        }
      }
      purchaseInFlight = false;
      eventsCache = null;
      tiersCache = null;
      document.getElementById("btn-back")?.classList.remove("is-disabled-link");

      const resultEl = document.getElementById("checkout-result");
      if (!resultEl) return;
      if (minted.length === qty) {
        resultEl.innerHTML = `<div class="checkout-done"><h3>Mua vé thành công</h3><p>${qty} vé đã ghi nhận trên blockchain và thuộc về ví <span class="mono">${shortAddr(userAddress)}</span>.</p><div class="checkout-done__actions"><a class="btn btn-primary" href="#/my-tickets">Xem vé của tôi</a><a class="btn btn-secondary" href="#/events/${eventId}">Quay lại sự kiện</a></div></div>`;
        payBtn.innerHTML = "Đã thanh toán";
        toast("Mua vé thành công!", "success");
      } else {
        resultEl.innerHTML = `<div class="checkout-done checkout-done--bad"><h3>${minted.length ? `Đã mua ${minted.length}/${qty} vé` : "Chưa mua được vé"}</h3><p>${escapeHtml(failure || "")}${minted.length ? " Các vé đã mua thành công vẫn thuộc về bạn." : " Bạn chưa bị trừ tiền vé."}</p><div class="checkout-done__actions">${minted.length ? `<a class="btn btn-primary" href="#/my-tickets">Xem vé của tôi</a>` : ""}<button type="button" class="btn btn-secondary" id="btn-retry-checkout">Thử lại</button></div></div>`;
        document.getElementById("btn-retry-checkout").addEventListener("click", () => route());
        payBtn.innerHTML = "Xác nhận &amp; thanh toán";
      }
    });

    runChecks();
    syncMetaThenRefresh([eventId], () => { if (myToken === renderToken && !purchaseInFlight) route(); });
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
      } else if (purchaseInFlight) {
        toast("Ví/mạng vừa thay đổi trong lúc đang thanh toán — các giao dịch đã gửi vẫn được theo dõi.", "info");
      } else {
        route();
      }
    } catch (err) {
      console.warn("Lỗi khi cập nhật ví/mạng:", err);
    }
  }
})();
