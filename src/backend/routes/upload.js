/**
 * 檔案上傳路由
 * POST /api/upload  → { file_url }
 */
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { requireAuth } = require("../middleware/auth");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

// 確保目錄存在
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 依日期分資料夾
    const sub = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const dir = path.join(UPLOAD_DIR, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_MB || "500") * 1024 * 1024 },
});

router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "未收到檔案" });

  const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, "/");
  const file_url = `${process.env.SERVER_BASE_URL || "http://localhost:4000"}/uploads/${relativePath}`;

  res.json({ file_url, original_name: req.file.originalname, size: req.file.size });
});

module.exports = router;