// Chuan bi chain cuc bo: so khoi khop Sepolia, chep dung bytecode v3 dang chay
// tren Sepolia vao dung dia chi hop dong.
const CA = "0x7c574216844854C04878B41D68d58F50a54cA0AF";
const rpc = async (url, method, params) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
};
(async () => {
  const L = "http://127.0.0.1:8545";
  await rpc(L, "hardhat_mine", ["0x" + (12004406).toString(16)]);
  const code = await rpc("https://ethereum-sepolia-rpc.publicnode.com", "eth_getCode", [CA, "latest"]);
  await rpc(L, "hardhat_setCode", [CA, code]);
  const local = await rpc(L, "eth_getCode", [CA, "latest"]);
  console.log("chain ready: block", parseInt(await rpc(L, "eth_blockNumber", []), 16), "| bytecode == Sepolia:", local === code);
})();
