/**
 * 檔案上傳路由
 * POST /api/上傳  → { file_url, 原始檔名, 檔案大小 }
 */
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { 驗證登入 } = require("../middleware/auth");

const 上傳目錄 = process.env.上傳目錄 || process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

// 確保上傳根目錄存在
if (!fs.existsSync(上傳目錄)) fs.mkdirSync(上傳目錄, { recursive: true });

const 儲存設定 = multer.diskStorage({
  destination: (req, file, cb) => {
    // 依年月日分子目錄存放
    const 子目錄 = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const 完整目錄 = path.join(上傳目錄, 子目錄);
    fs.mkdirSync(完整目錄, { recursive: true });
    cb(null, 完整目錄);
  },
  filename: (req, file, cb) => {
    const 副檔名 = path.extname(file.originalname);
    cb(null, `${uuidv4()}${副檔名}`);
  },
});

const 上傳設定 = multer({
  storage: 儲存設定,
  limits: {
    fileSize: parseInt(process.env.檔案大小上限MB || process.env.MAX_FILE_MB || "500") * 1024 * 1024,
  },
});

router.post("/", 驗證登入, 上傳設定.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ 訊息: "未收到檔案" });

  const 相對路徑 = path.relative(上傳目錄, req.file.path).replace(/\\/g, "/");
  const 檔案網址 = `${process.env.伺服器網址 || process.env.SERVER_BASE_URL || "http://localhost:4000"}/uploads/${相對路徑}`;

  res.json({
    file_url: 檔案網址,    // 保留 file_url 以相容前端
    原始檔名: req.file.originalname,
    檔案大小: req.file.size,
  });
});

module.exports = router;