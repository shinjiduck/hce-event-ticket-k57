// Chuan bi chain cuc bo: so khoi khop Sepolia, chep dung bytecode v4 dang chay
// tren Sepolia vao dung dia chi hop dong.
const CA = "0x0845EEB1Ed93C373173680a859fB255f168b9Fd0";
const rpc = async (url, method, params) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
};
(async () => {
  const L = "http://127.0.0.1:8545";
  // khoang cach 0 giay giua cac khoi: dong ho chain giu dung gio that (mac dinh
  // 1 giay/khoi se day thoi gian len ~139 ngay -> v4 bao EventAlreadyStarted).
  await rpc(L, "hardhat_mine", ["0x" + (12004619).toString(16), "0x0"]);
  const code = await rpc("https://ethereum-sepolia-rpc.publicnode.com", "eth_getCode", [CA, "latest"]);
  await rpc(L, "hardhat_setCode", [CA, code]);
  const local = await rpc(L, "eth_getCode", [CA, "latest"]);
  const ts = parseInt((await rpc(L, "eth_getBlockByNumber", ["latest", false])).timestamp, 16);
  console.log("chain time:", new Date(ts * 1000).toISOString());
  console.log("chain ready: block", parseInt(await rpc(L, "eth_blockNumber", []), 16), "| bytecode == Sepolia:", local === code);
})();
