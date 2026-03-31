/**
 * ╔══════════════════════════════════════════════════╗
 * ║  雲端檔案管理系統 - Node.js 後端伺服器            ║
 * ║  環境：Windows Server 2019 + MSSQL               ║
 * ║  啟動：node server.js                            ║
 * ╚══════════════════════════════════════════════════╝
 *
 * 安裝依賴套件：
 *   npm install express mssql bcrypt jsonwebtoken multer cors dotenv uuid morgan
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const 認證路由 = require("./routes/auth");
const 使用者管理路由 = require("./routes/users");
const 資料路由 = require("./routes/entities");
const 上傳路由 = require("./routes/upload");

const app = express();

// ─── 中介軟體 ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.前端網址 || process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(morgan("combined"));

// ─── 靜態檔案（上傳的檔案） ───────────────────────────────────
app.use("/uploads", express.static(process.env.上傳目錄 || process.env.UPLOAD_DIR || "./uploads"));

// ─── API 路由 ─────────────────────────────────────────────────
app.use("/api/認證", 認證路由);
app.use("/api/使用者管理", 使用者管理路由);
app.use("/api/資料", 資料路由);
app.use("/api/上傳", 上傳路由);

// ─── 系統健康檢查 ─────────────────────────────────────────────
app.get("/api/健康檢查", (_, res) => res.json({ 狀態: "正常", 時間: new Date() }));

// ─── 前端 SPA 靜態服務（或交由 IIS 處理） ────────────────────
app.use(express.static(process.env.前端建置目錄 || process.env.FRONTEND_DIST || "../dist"));

// ─── 啟動伺服器 ───────────────────────────────────────────────
const 埠號 = process.env.埠號 || process.env.PORT || 4000;
app.listen(埠號, () => {
  console.log(`[伺服器] 已啟動於 http://localhost:${埠號}`);
  console.log(`[伺服器] 環境：${process.env.NODE_ENV || "開發"}`);
});