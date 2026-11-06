// Test dau-cuoi giao dien + hop dong v4 tren chain cuc bo (Hardhat, chainId
// 11155111, bytecode chep tu Sepolia, dung dia chi that). Tap trung vao 3 quy
// tac moi: tran gia theo su kien, gioi han ve moi vi, phi ban quyen 5%; them
// kiem tra truc tiep hop dong (bo qua giao dien) va chan mint sau gio bat dau.
const { chromium } = require("playwright-core");
const { ethers } = require("ethers");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:8765/index.html";
const NODE = "http://127.0.0.1:8545";
const CA = "0x0845EEB1Ed93C373173680a859fB255f168b9Fd0";
const ABI = require("../../web/ProjectCore.abi.json");
const [A, B, C, S] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
];

const walletMock = (addr) => `
(() => {
  window.ethereum = {
    isMetaMask: true, on: () => {}, removeListener: () => {},
    request: async ({ method, params }) => {
      if (method === "eth_accounts" || method === "eth_requestAccounts") return ["${addr}"];
      // Gia lap nguoi dung bam "Tu choi" o giao dich thu N (window.__rejectTxNo)
      if (method === "eth_sendTransaction" && window.__rejectTxNo) {
        window.__txCount = (window.__txCount || 0) + 1;
        if (window.__txCount === window.__rejectTxNo) { window.__rejectTxNo = 0; const e = new Error("User rejected the request."); e.code = 4001; throw e; }
      }
      const r = await fetch("${NODE}", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
      const j = await r.json();
      if (j.error) { const e = new Error(j.error.message); e.code = j.error.code; e.data = j.error.data; throw e; }
      return j.result;
    },
  };
})();`;

// Ngay tinh theo luc chay test (web chan ngay da qua): su kien dien ra sau 45 ngay.
const localInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const atDay = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return localInput(d); };
const PAST_START = atDay(-1, 10, 0);
const EVENT_START = atDay(45, 19, 0);
const EVENT_END_BAD = atDay(45, 18, 0);
const EVENT_END = atDay(45, 22, 30);

const metaStore = {};
(async () => {
  const provider = new ethers.JsonRpcProvider(NODE);
  const core = (who) => provider.getSigner(who).then((sg) => new ethers.Contract(CA, ABI, sg));
  const revertName = async (p) => {
    try { await p; return "KHONG REVERT"; } catch (e) {
      const data = e.data || (e.info && e.info.error && e.info.error.data);
      try { return new ethers.Interface(ABI).parseError(typeof data === "string" ? data : data.data).name; } catch { return e.shortMessage || e.message; }
    }
  };

  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const res = [], errors = [];
  const check = (n, ok, x) => { const line = `${ok ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`; res.push(line); console.log(line); };

  async function as(addr) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript(walletMock(addr));
    for (const u of ["https://ethereum-sepolia-rpc.publicnode.com/**", "https://sepolia.gateway.tenderly.co/**"]) {
      await ctx.route(u, async (route) => route.fulfill({ response: await route.fetch({ url: NODE }) }));
    }
    await ctx.route("**/api/metadata**", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        const b = JSON.parse(req.postData());
        metaStore[b.eventId] = b.data;
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      }
      const id = new URL(req.url()).searchParams.get("eventId");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(metaStore[id] || {}) });
    });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(addr.slice(0, 6) + ": " + e.message));
    return { ctx, p };
  }
  const text = async (p, sel) => ((await p.textContent(sel).catch(() => "")) || "").replace(/\s+/g, " ").trim();
  const waitText = async (p, sel, needle, ms) => {
    const end = Date.now() + (ms || 30000);
    while (Date.now() < end) { if ((await text(p, sel)).includes(needle)) return true; await p.waitForTimeout(500); }
    return false;
  };

  // ===== 1. Organizer A tao su kien: tran 120%, toi da 2 ve/vi =====
  const a = await as(A);
  await a.p.goto(BASE + "#/create", { waitUntil: "domcontentloaded" });
  await a.p.waitForFunction(() => document.querySelectorAll("#f-prov option").length > 1, null, { timeout: 60000 });
  await a.p.fill("#f-name", "FairTicket Demo v4");
  await a.p.selectOption("#f-cat", "music");
  await a.p.fill("#f-desc", "Sự kiện test hợp đồng v4");
  await a.p.fill("#f-start", PAST_START);
  await a.p.fill("#f-loc", "Nhà văn hóa Trung tâm");
  await a.p.selectOption("#f-prov", "Thành phố Huế");
  await a.p.fill("#f-ward", "Phường An Cựu");
  await a.p.fill("#f-street", "99 Hồ Đắc Di");
  await a.p.click("#btn-next-1");
  check("Giờ bắt đầu đã qua bị chặn (hợp đồng sẽ không bán vé được)", await waitText(a.p, "#toast", "phải sau thời điểm hiện tại", 5000), await text(a.p, "#toast"));
  await a.p.fill("#f-start", EVENT_START);
  await a.p.fill("#f-end", EVENT_END_BAD);
  await a.p.click("#btn-next-1");
  check("Giờ kết thúc trước giờ bắt đầu bị chặn", await waitText(a.p, "#toast", "kết thúc phải sau", 5000), await text(a.p, "#toast"));
  await a.p.fill("#f-end", EVENT_END);
  await a.p.click("#btn-next-1");
  await a.p.waitForSelector("#f-cap");
  check("Wizard bước 2 có ô trần giá (mặc định 110%) và số vé/ví (mặc định 4)",
    (await a.p.inputValue("#f-cap")) === "110" && (await a.p.inputValue("#f-limit")) === "4");
  await a.p.fill("#f-supply", "1.5");
  await a.p.fill("#f-price", "0.01");
  await a.p.click("#btn-next-2");
  check("Số vé lẻ (1.5) bị chặn trước khi gửi giao dịch", await waitText(a.p, "#toast", "số nguyên", 5000), await text(a.p, "#toast"));
  await a.p.fill("#f-supply", "10");
  await a.p.fill("#f-price", "0.0000000000000000001");
  await a.p.click("#btn-next-2");
  check("Giá quá 18 chữ số thập phân bị chặn", await waitText(a.p, "#toast", "giá vé hợp lệ", 5000), await text(a.p, "#toast"));
  await a.p.fill("#f-price", "0.01");
  await a.p.fill("#f-limit", "101");
  await a.p.click("#btn-next-2");
  check("Số vé/ví 101 bị chặn trên giao diện", await waitText(a.p, "#toast", "từ 0 đến 100", 5000), await text(a.p, "#toast"));
  await a.p.selectOption("#f-cap", "120");
  await a.p.fill("#f-limit", "2");
  await a.p.click("#btn-next-2");
  await a.p.waitForSelector("#btn-deploy");
  const review = await text(a.p, "#app-root");
  check("Trang xem lại ghi 120% và 2 vé/ví", review.includes("120% giá gốc") && review.includes("2 vé"));
  // Lan 1: giao dich 1 (tao su kien) xong, nguoi dung TU CHOI giao dich 2 (tao hang ve)
  await a.p.evaluate(() => { window.__rejectTxNo = 2; window.__txCount = 0; });
  await a.p.click("#btn-deploy");
  await a.p.waitForFunction(() => { const b = document.getElementById("btn-deploy"); return b && !b.disabled; }, null, { timeout: 60000 });
  const afterReject = await (await core(A)).events(0);
  check("Từ chối giao dịch 2: sự kiện #0 đã có trên chain, chưa có hạng vé", (await (await core(A)).nextEventId()) === 1n && afterReject.tierCount === 0n);
  // Lan 2: bam Deploy lai -> dung lai su kien #0, khong tao su kien trung.
  // Chain cuc bo chay rat nhanh, toast sau de toast truoc -> ghi lai moi toast da hien.
  await a.p.evaluate(() => {
    window.__toasts = [];
    const seen = () => { const t = document.getElementById("toast"); if (t && !t.hidden) window.__toasts.push(t.textContent); };
    new MutationObserver(seen).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden", "class"] });
  });
  await a.p.click("#btn-deploy");
  await a.p.waitForURL(/#\/events\/0/, { timeout: 60000 }).catch(() => {});
  const toasts = await a.p.evaluate(() => window.__toasts.join(" | "));
  check("Bấm Deploy lại: báo dùng lại sự kiện #0", toasts.includes("Dùng lại sự kiện #0"), toasts.slice(0, 160));
  await a.p.waitForURL(/#\/events\/0/, { timeout: 60000 }).catch(() => {});
  check("Không tạo sự kiện trùng: vẫn chỉ 1 sự kiện, sự kiện #0 có 1 hạng vé",
    (await (await core(A)).nextEventId()) === 1n && (await (await core(A)).events(0)).tierCount === 1n);
  check("Giờ kết thúc được lưu vào metadata", Number(metaStore[0] && metaStore[0].endTime) === Math.floor(new Date(EVENT_END).getTime() / 1000), JSON.stringify(metaStore[0] && metaStore[0].endTime));
  const e0 = await (await core(A)).events(0);
  check("A tạo sự kiện #0 — trên chain maxResaleBps = 12000, maxPerWallet = 2", e0.maxResaleBps === 12000n && e0.maxPerWallet === 2n, `${e0.maxResaleBps} / ${e0.maxPerWallet}`);
  await waitText(a.p, "#app-root", "Trần 120%", 30000);
  check("Bảng Organizer hiện quy tắc sự kiện", (await text(a.p, "#app-root")).includes("Trần 120% · tối đa 2 vé/ví"));
  check("Trang sự kiện hiện thời gian kết thúc", (await text(a.p, "#app-root")).includes("Thời gian kết thúc"));

  // ===== 2. B: toi da 2 ve/vi =====
  const b = await as(B);
  await b.p.goto(BASE + "#/events/0", { waitUntil: "domcontentloaded" });
  await b.p.waitForSelector("#qty-plus", { timeout: 30000 });
  check("Trang sự kiện ghi trần 120% và giới hạn 2 vé/ví", await waitText(b.p, "#app-root", "tối đa 120% giá gốc", 20000) && (await text(b.p, "#app-root")).includes("tối đa 2 vé/ví"));
  for (let i = 0; i < 4; i++) await b.p.click("#qty-plus").catch(() => {});
  check("Nút + dừng ở 2 vé (giới hạn ví)", (await text(b.p, "#qty-val")) === "2" && (await text(b.p, "#qty-hint")).includes("0/2"), await text(b.p, "#qty-hint"));
  await b.p.click("#btn-go-checkout");
  await b.p.waitForFunction(() => { const x = document.getElementById("btn-pay"); return x && !x.disabled; }, null, { timeout: 30000 });
  check("Thanh toán kiểm tra trước: ví đã mua 0/2", (await text(b.p, "#app-root")).includes("Ví đã mua 0/2"));
  await b.p.click("#btn-pay");
  check("B mua 2 vé thành công", await waitText(b.p, "#checkout-result", "Mua vé thành công", 60000), await text(b.p, "#tx-list"));
  await b.p.goto(BASE + "#/events/0", { waitUntil: "domcontentloaded" });
  check("Đủ 2 vé: nút mua đổi thành 'Đã mua đủ 2 vé/ví' và bị khoá",
    await waitText(b.p, "#btn-go-checkout", "Đã mua đủ 2 vé/ví", 30000) && await b.p.isDisabled("#btn-go-checkout"));
  await b.p.goto(BASE + "#/checkout/0/0/1", { waitUntil: "domcontentloaded" });
  check("Vào thẳng trang thanh toán: báo ví đã mua đủ, không cho trả tiền",
    await waitText(b.p, "#app-root", "Ví đã mua đủ 2 vé/ví", 30000) && await b.p.isDisabled("#btn-pay"));
  check("Gọi thẳng hợp đồng (bỏ qua giao diện) → WalletLimitReached",
    (await revertName((await core(B)).mintTicket(0, { value: ethers.parseEther("0.01") }))) === "WalletLimitReached");

  // ===== 3. B rao ban: tran 120%, hien 95% thuc nhan =====
  await b.p.goto(BASE + "#/my-tickets", { waitUntil: "domcontentloaded" });
  await b.p.waitForSelector(".ticket-card [data-resell]", { timeout: 30000 });
  await b.p.click('[data-resell="0"]');
  check("Hộp rao bán ghi tối đa 0.012 ETH (trần 120%) và nhận 95%",
    (await text(b.p, ".modal-card")).includes("0.012 ETH (trần 120%)") && (await text(b.p, ".modal-card")).includes("95%"), (await text(b.p, ".modal-card")).slice(0, 220));
  await b.p.fill("#modal-price-input", "0.0121");
  await b.p.click('.modal-card [data-action="confirm"]');
  check("Giá 121% bị chặn ngay trên giao diện", await waitText(b.p, "#toast", "vượt trần 120%", 5000), await text(b.p, "#toast"));
  check("Gọi thẳng hợp đồng giá 121% → ResalePriceTooHigh",
    (await revertName((await core(B)).listForResale(0, ethers.parseEther("0.0121")))) === "ResalePriceTooHigh");
  await b.p.click('[data-resell="0"]');
  await b.p.fill("#modal-price-input", "0.012");
  await b.p.click('.modal-card [data-action="confirm"]');
  check("Rao bán vé #0 đúng 120% (0.012 ETH) thành công", await waitText(b.p, "#toast", "Đã rao bán vé", 30000), await text(b.p, "#toast"));

  // ===== 4. C mua lai: phi ban quyen 5% =====
  const c = await as(C);
  await c.p.goto(BASE + "#/resale", { waitUntil: "domcontentloaded" });
  await c.p.waitForSelector('[data-buy-resale="0"]', { timeout: 30000 });
  await c.p.click('[data-buy-resale="0"]');
  await c.p.waitForSelector('.modal-card [data-action="confirm"]', { timeout: 15000 });
  check("Hộp xác nhận mua lại ghi phí bản quyền 0.0006 ETH", (await text(c.p, ".modal-card")).includes("phí bản quyền 5%") && (await text(c.p, ".modal-card")).includes("0.0006 ETH"), (await text(c.p, ".modal-card")).slice(0, 300));
  const orgBefore = await (await core(A)).pendingWithdrawals(A);
  await c.p.click('.modal-card [data-action="confirm"]');
  check("C mua lại vé #0 (0.012 ETH)", await waitText(c.p, "#toast", "Mua lại vé thành công", 40000), await text(c.p, "#toast"));
  const ro = await core(A);
  const orgGain = (await ro.pendingWithdrawals(A)) - orgBefore;
  const sellerGot = await ro.pendingWithdrawals(B);
  check("Trên chain: Organizer +0.0006 ETH (5%), người bán B 0.0114 ETH (95%)",
    orgGain === ethers.parseEther("0.0006") && sellerGot === ethers.parseEther("0.0114"), `${ethers.formatEther(orgGain)} / ${ethers.formatEther(sellerGot)}`);
  check("Vé mua lại không tính vào giới hạn ví (mintedBy C = 0)", (await ro.mintedBy(0, C)) === 0n);

  // ===== 5. CTV S check-in ve cua C =====
  await a.p.goto(BASE + "#/events/0", { waitUntil: "domcontentloaded" });
  await a.p.waitForSelector("#staff-addr", { timeout: 30000 });
  await a.p.fill("#staff-addr", S);
  await a.p.click("#btn-add-staff");
  check("A cấp quyền CTV cho S", await waitText(a.p, "#toast", "Đã cấp quyền CTV", 30000), await text(a.p, "#toast"));
  await c.p.goto(BASE + "#/my-tickets", { waitUntil: "domcontentloaded" });
  await c.p.waitForSelector('button[data-view="0"]', { timeout: 30000 });
  await c.p.click('button[data-view="0"]');
  await c.p.click("#tm-make-code");
  await c.p.waitForFunction(() => !!document.getElementById("modal-qr").dataset.code, null, { timeout: 15000 });
  const codeC = await c.p.getAttribute("#modal-qr", "data-code");
  const linkC = await c.p.getAttribute("#modal-qr", "data-link");
  // Giai ma chinh anh QR dang hien (nhu app camera) -> phai ra dung link
  const decoded = await c.p.evaluate(async () => {
    if (!window.jsQR) await new Promise((ok, bad) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
    const svg = document.querySelector("#modal-qr svg");
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await img.decode();
    const cv = document.createElement("canvas"); cv.width = 600; cv.height = 600;
    const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 600, 600); ctx.drawImage(img, 0, 0, 600, 600);
    const r = window.jsQR(ctx.getImageData(0, 0, 600, 600).data, 600, 600);
    return r ? r.data : null;
  });
  check("Mã QR chứa link mở trang check-in (?checkin=…&event=0), giải mã từ chính ảnh QR", !!decoded && decoded === linkC && /\?checkin=FT1%3A0%3A\d+%3A[0-9A-F]{130}&event=0$/.test(decoded), (decoded || "").slice(0, 90));
  // Mo link tren trinh duyet KHONG co vi (vd app camera mo bang Chrome) -> nut mo bang app MetaMask
  const bare = await browser.newContext();
  const bp = await bare.newPage();
  await bp.goto(linkC.replace(/^http:\/\/localhost:8765\//, BASE.replace("index.html", "")), { waitUntil: "domcontentloaded" });
  await bp.waitForSelector("a[href^='https://metamask.app.link/dapp/']", { timeout: 30000 }).catch(() => {});
  const mm = await bp.getAttribute("a[href^='https://metamask.app.link/dapp/']", "href").catch(() => null);
  check("Mở link trên trình duyệt không có ví → nút 'Mở bằng ứng dụng MetaMask' giữ nguyên mã", !!mm && mm.includes("checkin=FT1%3A0%3A") && mm.includes("&event=0"), (mm || "").slice(0, 90));
  await bare.close();
  // CTV mo thang link (nhu quet bang app camera) -> trang tu dien ma, tu kiem tra va check-in
  const s = await as(S);
  await s.p.goto(linkC, { waitUntil: "domcontentloaded" });
  check("CTV mở link trong QR → tự kiểm tra và check-in, ghi lên chain", await waitText(s.p, "#ci-log", "✓ đã ghi", 40000), await text(s.p, "#ci-status"));
  check("Sau khi xử lý, mã bị xoá khỏi URL (F5 không kiểm tra lại)", !s.p.url().includes("code=") && !s.p.url().includes("checkin="), s.p.url());

  // ===== 6. Dashboard: doanh thu + phi ban quyen =====
  await a.p.goto(BASE + "#/my-events", { waitUntil: "domcontentloaded" });
  check("Dashboard: dòng phí bản quyền 0.0006 ETH", await waitText(a.p, "#org-royalty", "0.0006 ETH", 30000), await text(a.p, "#org-royalty"));
  check("Dashboard: vé đã bán 2/10, doanh thu bán lần đầu 0.02 ETH (dù tab Organizer mở từ trước khi B mua)",
    await waitText(a.p, ".kpi-grid", "2 / 10", 20000) && (await text(a.p, ".kpi-grid")).includes("0.02 ETH"), await text(a.p, ".kpi-grid"));
  await waitText(a.p, "#org-activity", "đổi chủ", 30000);
  check("Dashboard: hoạt động đổi chủ ghi phí bản quyền", (await text(a.p, "#org-activity")).includes("phí bản quyền 0.0006 ETH"), (await text(a.p, "#org-activity")).slice(0, 200));
  await a.p.screenshot({ path: __dirname + "/v4-dashboard.png", fullPage: true });

  // ===== 7. Sau gio bat dau: chan mint, van ban lai duoc =====
  const ca = await core(A);
  const now = (await provider.getBlock("latest")).timestamp;
  await (await ca.createEvent("Sap dien ra", now + 600, 11000, 0)).wait(); // event 1
  await (await ca.createTier(1, "Std", ethers.parseEther("0.01"), 5)).wait(); // tier 1
  await (await (await core(B)).mintTicket(1, { value: ethers.parseEther("0.01") })).wait(); // ticket 2
  await provider.send("evm_increaseTime", [1200]);
  await provider.send("evm_mine", []);
  check("Qua giờ bắt đầu: mintTicket → EventAlreadyStarted",
    (await revertName((await core(C)).mintTicket(1, { value: ethers.parseEther("0.01") }))) === "EventAlreadyStarted");
  await (await (await core(B)).listForResale(2, ethers.parseEther("0.011"))).wait();
  await (await (await core(C)).buyResaleTicket(2, { value: ethers.parseEther("0.011") })).wait();
  check("Qua giờ bắt đầu: vẫn rao bán và mua lại được", (await ca.tickets(2)).owner === C);
  check("Tạo sự kiện với trần 99.99% → InvalidResaleCap", (await revertName(ca.createEvent("X", now + 99999, 9999, 0))) === "InvalidResaleCap");

  await browser.close();
  console.log(res.join("\n"));
  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_PAGE_ERRORS");
})().catch((e) => { console.error("TEST CRASH:", e.message); process.exit(1); });
