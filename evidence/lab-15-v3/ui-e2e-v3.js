// Test dau-cuoi giao dien + hop dong v3 tren chain cuc bo (Hardhat, chainId
// 11155111, bytecode chep tu Sepolia, dung dia chi that). Moi giao dich do
// hop dong that thuc thi; khong dung ETH Sepolia.
const { chromium } = require("playwright-core");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:8765/index.html";
const NODE = "http://127.0.0.1:8545";
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
      const r = await fetch("${NODE}", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
      const j = await r.json();
      if (j.error) { const e = new Error(j.error.message); e.code = j.error.code; e.data = j.error.data; throw e; }
      return j.result;
    },
  };
})();`;

const metaStore = {};
(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const res = [], errors = [];
  const check = (n, ok, x) => { const line = `${ok ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`; res.push(line); console.log(line); };

  async function as(addr, vp) {
    const ctx = await browser.newContext({ viewport: vp || { width: 1366, height: 900 } });
    await ctx.addInitScript(walletMock(addr));
    // RPC cong khai / Tenderly -> chain cuc bo
    for (const u of ["https://ethereum-sepolia-rpc.publicnode.com/**", "https://sepolia.gateway.tenderly.co/**"]) {
      await ctx.route(u, async (route) => route.fulfill({ response: await route.fetch({ url: NODE }) }));
    }
    // /api/metadata gia lap (server that chi co tren Vercel)
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

  // ===== 1. Organizer A tao su kien qua wizard =====
  const a = await as(A);
  await a.p.goto(BASE + "#/create", { waitUntil: "domcontentloaded" });
  await a.p.waitForFunction(() => document.querySelectorAll("#f-prov option").length > 1, null, { timeout: 60000 });
  await a.p.fill("#f-name", "FairTicket Demo v3");
  await a.p.selectOption("#f-cat", "music");
  await a.p.fill("#f-desc", "Sự kiện test hợp đồng v3");
  await a.p.fill("#f-start", "2026-12-20T19:00");
  await a.p.fill("#f-loc", "Nhà văn hóa Trung tâm");
  await a.p.selectOption("#f-prov", "Thành phố Huế");
  await a.p.fill("#f-ward", "Phường An Cựu");
  await a.p.fill("#f-street", "99 Hồ Đắc Di");
  await a.p.click("#btn-next-1");
  await a.p.waitForSelector("#f-supply");
  await a.p.fill("#f-supply", "10");
  await a.p.fill("#f-price", "0.01");
  await a.p.click("#btn-next-2");
  await a.p.click("#btn-deploy");
  await a.p.waitForURL(/#\/events\/0/, { timeout: 60000 }).catch(() => {});
  check("A tạo sự kiện #0 qua wizard (2 giao dịch + chữ ký metadata)", a.p.url().includes("#/events/0") && metaStore[0] && metaStore[0].province === "Thành phố Huế", a.p.url());

  // ===== 2. B mua 2 ve qua trang thanh toan =====
  const b = await as(B);
  await b.p.goto(BASE + "#/events/0", { waitUntil: "domcontentloaded" });
  await b.p.waitForSelector("#qty-plus", { timeout: 30000 });
  await b.p.click("#qty-plus");
  await b.p.click("#btn-go-checkout");
  await b.p.waitForFunction(() => { const x = document.getElementById("btn-pay"); return x && !x.disabled; }, null, { timeout: 30000 });
  await b.p.click("#btn-pay");
  check("B mua 2 vé — thanh toán theo dõi từng giao dịch, báo thành công", await waitText(b.p, "#checkout-result", "Mua vé thành công", 60000), await text(b.p, "#tx-list"));

  // ===== 3. B rao ban, chan >110%, go rao ban, rao lai =====
  await b.p.goto(BASE + "#/my-tickets", { waitUntil: "domcontentloaded" });
  await b.p.waitForSelector(".ticket-card [data-resell]", { timeout: 30000 });
  check("B thấy 2 vé", (await b.p.$$(".ticket-card:not([aria-hidden])")).length === 2);
  const resell = async (id, price) => {
    await b.p.click(`[data-resell="${id}"]`);
    await b.p.fill("#modal-price-input", price);
    await b.p.click('.modal-card [data-action="confirm"]');
  };
  await resell(0, "0.012");
  check("Giá 120% bị chặn ngay trên giao diện", await waitText(b.p, "#toast", "vượt quá 110%", 5000), await text(b.p, "#toast"));
  await resell(0, "0.011");
  check("Rao bán vé #0 đúng 110% thành công", await waitText(b.p, "#toast", "Đã rao bán vé", 30000), await text(b.p, "#toast"));
  await b.p.waitForSelector('[data-unlist="0"]', { timeout: 30000 });
  await b.p.click('[data-unlist="0"]');
  check("Gỡ rao bán vé #0 (hàm mới cancelResale)", await waitText(b.p, "#toast", "Đã gỡ rao bán vé #0", 30000), await text(b.p, "#toast"));
  await b.p.waitForTimeout(3000);
  check("Sau khi gỡ: không còn nút Gỡ rao bán", !(await b.p.$('[data-unlist="0"]')));
  await resell(0, "0.0105");
  await waitText(b.p, "#toast", "Đã rao bán vé", 30000);

  // ===== 4. C mua lai ve #0 =====
  const c = await as(C);
  await c.p.goto(BASE + "#/resale", { waitUntil: "domcontentloaded" });
  await c.p.waitForSelector('[data-buy-resale="0"]', { timeout: 30000 });
  await c.p.click('[data-buy-resale="0"]');
  await c.p.waitForSelector('.modal-card [data-action="confirm"]', { timeout: 15000 });
  await c.p.click('.modal-card [data-action="confirm"]');
  check("C mua lại vé #0 (0.0105 ETH)", await waitText(c.p, "#toast", "Mua lại vé thành công", 40000), await text(c.p, "#toast"));

  // ===== 5. A cap quyen CTV cho S =====
  await a.p.goto(BASE + "#/events/0", { waitUntil: "domcontentloaded" });
  await a.p.waitForSelector("#staff-addr", { timeout: 30000 });
  await waitText(a.p, "#staff-list", "Chưa có CTV", 20000);
  await a.p.fill("#staff-addr", "0x123");
  await a.p.click("#btn-add-staff");
  check("Địa chỉ CTV sai định dạng bị chặn", await waitText(a.p, "#toast", "không hợp lệ", 5000));
  await a.p.fill("#staff-addr", A);
  await a.p.click("#btn-add-staff");
  check("Không cho cấp quyền CTV cho chính ví Organizer", await waitText(a.p, "#toast", "đã có quyền check-in sẵn", 5000));
  await a.p.fill("#staff-addr", S);
  await a.p.click("#btn-add-staff");
  check("A cấp quyền CTV cho S (setStaff)", await waitText(a.p, "#toast", "Đã cấp quyền CTV", 30000) && (await text(a.p, "#staff-list")).includes(S.slice(0, 6)), await text(a.p, "#staff-list"));
  await a.p.screenshot({ path: __dirname + "/v3-staff-panel.png", fullPage: true });
  await a.p.reload();
  await a.p.waitForSelector("#staff-list .staff-item", { timeout: 30000 }).catch(() => {});
  check("Danh sách CTV đọc lại từ chain sau khi tải lại trang", (await text(a.p, "#staff-list")).includes(S.slice(0, 6)));

  // ===== 6. C tao ma check-in, S (CTV) quet =====
  await c.p.goto(BASE + "#/my-tickets", { waitUntil: "domcontentloaded" });
  await c.p.waitForSelector('.ticket-card [data-view="0"]', { timeout: 30000 });
  await c.p.click('button[data-view="0"]');
  await c.p.click("#tm-make-code");
  await c.p.waitForFunction(() => !!document.getElementById("modal-qr").dataset.code, null, { timeout: 15000 });
  const codeC = await c.p.getAttribute("#modal-qr", "data-code");

  const s = await as(S);
  await s.p.goto(BASE + "#/events/0", { waitUntil: "domcontentloaded" });
  check("S mở trang sự kiện thấy 'Bạn là CTV soát vé'", await waitText(s.p, "#staff-note", "Bạn là CTV soát vé", 30000));
  await s.p.goto(BASE + "#/check-in?event=0", { waitUntil: "domcontentloaded" });
  await s.p.waitForSelector("#ci-event", { timeout: 30000 });
  check("Màn hình check-in mở cho CTV, ghi vai trò 'CTV'", (await text(s.p, "#ci-event")).includes("CTV"));
  await s.p.fill("#ci-manual", codeC);
  await s.p.click("#ci-check");
  check("CTV quét mã của C → check-in tự động (chế độ liên tục)", await waitText(s.p, "#ci-status", "đã gửi check-in", 30000), await text(s.p, "#ci-status"));
  check("Nhật ký: giao dịch đã ghi lên chain", await waitText(s.p, "#ci-log", "✓ đã ghi", 30000), await text(s.p, "#ci-log"));
  await s.p.screenshot({ path: __dirname + "/v3-staff-checkin.png" });

  // ===== 7. A thu hoi quyen S; S quet ve #1 cua B -> hop dong tu choi =====
  await a.p.click(`[data-revoke="${S}"]`).catch(async () => a.p.click("[data-revoke]"));
  check("A thu hồi quyền CTV của S", await waitText(a.p, "#toast", "Đã thu hồi quyền CTV", 30000), await text(a.p, "#toast"));
  await b.p.goto(BASE + "#/my-tickets", { waitUntil: "domcontentloaded" });
  await b.p.waitForSelector('button[data-view="1"]', { timeout: 30000 });
  await b.p.click('button[data-view="1"]');
  await b.p.click("#tm-make-code");
  await b.p.waitForFunction(() => !!document.getElementById("modal-qr").dataset.code, null, { timeout: 15000 });
  const codeB = await b.p.getAttribute("#modal-qr", "data-code");
  await s.p.fill("#ci-manual", codeB);
  await s.p.click("#ci-check");
  check("Sau khi bị thu hồi: CTV quét vé → hợp đồng từ chối", await waitText(s.p, "#ci-status", "không có quyền soát vé", 30000), await text(s.p, "#ci-status"));
  await s.p.goto(BASE + "#/check-in", { waitUntil: "domcontentloaded" });
  check("Tải lại: màn hình check-in báo ví chưa có quyền", await waitText(s.p, "#app-root", "chưa có quyền soát vé", 30000));

  // ===== 8. A tu check-in ve #1; ve #0 quet lai bi tu choi =====
  await a.p.goto(BASE + "#/check-in?event=0", { waitUntil: "domcontentloaded" });
  await a.p.waitForSelector("#ci-manual", { timeout: 30000 });
  await a.p.fill("#ci-manual", codeB);
  await a.p.click("#ci-check");
  check("Organizer check-in vé #1", await waitText(a.p, "#ci-log", "✓ đã ghi", 40000), await text(a.p, "#ci-status"));
  await a.p.fill("#ci-manual", codeC);
  await a.p.click("#ci-check");
  check("Quét lại vé #0 đã check-in → bị chặn", await waitText(a.p, "#app-root", "đã được check-in trước đó", 20000), await text(a.p, "#ci-result"));

  // ===== 9. Dashboard + lich su =====
  await a.p.goto(BASE + "#/my-events", { waitUntil: "domcontentloaded" });
  await waitText(a.p, "#org-activity", "Thu hồi quyền CTV", 30000);
  const act = await text(a.p, "#org-activity");
  check("Dashboard: hoạt động có cấp/thu hồi CTV, gỡ rao bán, check-in, đổi chủ", ["Cấp quyền CTV", "Thu hồi quyền CTV", "gỡ rao bán", "Check-in vé #0", "Check-in vé #1", "đổi chủ"].every((k) => act.includes(k)), act.slice(0, 200));
  check("Dashboard: doanh thu 0.02 ETH (2 vé × 0.01)", (await text(a.p, ".kpi-grid")).includes("0.02 ETH"));

  await browser.close();
  console.log(res.join("\n"));
  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_PAGE_ERRORS");
})().catch((e) => { console.error("TEST CRASH:", e.message); process.exit(1); });
