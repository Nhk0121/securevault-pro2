/**
 * ╔══════════════════════════════════════════════════╗
 * ║  雲端檔案管理系統 - Node.js 後端                  ║
 * ║  環境：Windows Server 2019 + MSSQL               ║
 * ║  執行：node server.js                             ║
 * ╚══════════════════════════════════════════════════╝
 * 
 * 安裝依賴：
 *   npm install express mssql bcrypt jsonwebtoken multer
 *             cors dotenv uuid morgan
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const entitiesRouter = require("./routes/entities");
const uploadRouter = require("./routes/upload");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(morgan("combined"));

// 靜態檔案（上傳後的檔案）
app.use("/uploads", express.static(process.env.UPLOAD_DIR || "./uploads"));

// 路由
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/entities", entitiesRouter);
app.use("/api/upload", uploadRouter);

// 健康檢查
app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date() }));

// 前端 SPA fallback（IIS 也可以做）
app.use(express.static(process.env.FRONTEND_DIST || "../dist"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[Server] 啟動於 http://localhost:${PORT}`);
});