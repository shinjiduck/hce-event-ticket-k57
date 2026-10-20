// Vercel Serverless Function: luu & doc metadata "ngoai chain" (anh, mo ta, dia diem)
// cho moi su kien, vi ProjectCore.sol chi luu ten/thoi gian/organizer/so hang ve
// (luu string dai + anh base64 on-chain qua ton gas). Du lieu nay khong anh huong
// logic hop dong - mat di cung khong lam sai ve/tien, chi mat phan trang tri.
//
// GET  /api/metadata?eventId=3        -> { description, location, address, image, category } (hoac {} neu chua co)
// POST /api/metadata { eventId, data, timestamp, signature }
//      -> chi Organizer cua su kien (theo dia chi tren contract) moi duoc ghi.
//         signature = ky message duoc server tu dung lai tu (eventId, timestamp)
//         (xem buildMessage) - khong dung tai khoan/mat khau truyen thong.

const { put, head, BlobNotFoundError } = require("@vercel/blob");
const { ethers } = require("ethers");

const CONTRACT_ADDRESS = "0x0f96cafe4C603D706c786C503A5c903090706916";
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const EVENTS_ABI = [
  "function events(uint256) view returns (string name, uint256 startTime, address organizer, uint256 tierCount)",
];
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000; // 5 phut, chong phat lai chu ky cu
// Phai khop danh sach CATEGORIES trong web/app.js.
const CATEGORY_IDS = ["music", "art", "sport", "workshop", "conference", "experience", "other"];
// Chi nhan anh base64 tu FileReader - khong nhan URL tuy y (tranh chen noi dung la vao <img src>).
const SAFE_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function blobPath(eventId) {
  return `metadata/${CONTRACT_ADDRESS.toLowerCase()}/${eventId}.json`;
}

function buildMessage(eventId, timestamp) {
  return `FairTicket: cập nhật metadata sự kiện #${eventId} lúc ${timestamp}`;
}

async function getOrganizer(eventId) {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, EVENTS_ABI, provider);
  const info = await contract.events(eventId);
  return info.organizer;
}

async function handleGet(req, res) {
  const eventId = Number(req.query.eventId);
  if (!Number.isInteger(eventId) || eventId < 0) {
    res.status(400).json({ error: "eventId không hợp lệ." });
    return;
  }
  try {
    const found = await head(blobPath(eventId), { token: process.env.BLOB_READ_WRITE_TOKEN });
    // Blob bi ghi de khi organizer sua thong tin; CDN co the con giu ban cu
    // -> gan uploadedAt vao URL de luon lay dung ban moi nhat.
    const fileRes = await fetch(found.url + "?v=" + new Date(found.uploadedAt).getTime());
    const data = await fileRes.json();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      res.status(200).json({});
      return;
    }
    console.error("GET /api/metadata lỗi:", err);
    res.status(500).json({ error: "Không đọc được metadata." });
  }
}

async function handlePost(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { eventId, data, timestamp, signature } = body;

  const id = Number(eventId);
  if (!Number.isInteger(id) || id < 0) {
    res.status(400).json({ error: "eventId không hợp lệ." });
    return;
  }
  if (!data || typeof data !== "object") {
    res.status(400).json({ error: "Thiếu dữ liệu metadata." });
    return;
  }
  if (!Number.isFinite(timestamp) || !signature) {
    res.status(400).json({ error: "Thiếu chữ ký ví." });
    return;
  }
  if (Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS) {
    res.status(401).json({ error: "Chữ ký đã hết hạn, vui lòng thử lại." });
    return;
  }

  // Server tu dung lai noi dung thong diep tu (eventId, timestamp) - khong
  // tin noi dung message tu client gui len - de chu ky chi co the hop le
  // cho dung eventId nay, khong the dung lai cho su kien khac.
  const message = buildMessage(id, timestamp);
  let signerAddress;
  try {
    signerAddress = ethers.verifyMessage(message, signature);
  } catch {
    res.status(401).json({ error: "Chữ ký không hợp lệ." });
    return;
  }

  let organizer;
  try {
    organizer = await getOrganizer(id);
  } catch (err) {
    console.error("Không đọc được organizer từ contract:", err);
    res.status(502).json({ error: "Không xác minh được organizer trên hợp đồng." });
    return;
  }

  if (!organizer || organizer === ethers.ZeroAddress || organizer.toLowerCase() !== signerAddress.toLowerCase()) {
    res.status(403).json({ error: "Chỉ organizer của sự kiện này được cập nhật." });
    return;
  }

  const payload = {
    description: typeof data.description === "string" ? data.description.slice(0, 5000) : "",
    location: typeof data.location === "string" ? data.location.slice(0, 300) : "",
    address: typeof data.address === "string" ? data.address.slice(0, 300) : "",
    image: typeof data.image === "string" && SAFE_IMAGE_RE.test(data.image) ? data.image : "",
    category: CATEGORY_IDS.includes(data.category) ? data.category : "other",
  };

  try {
    await put(blobPath(id), JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("POST /api/metadata lỗi:", err);
    res.status(500).json({ error: "Không lưu được metadata." });
  }
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    await handleGet(req, res);
  } else if (req.method === "POST") {
    await handlePost(req, res);
  } else {
    res.status(405).json({ error: "Method not allowed." });
  }
};
