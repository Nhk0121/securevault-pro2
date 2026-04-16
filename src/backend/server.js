/* eslint-disable */
// ============================================================
// 雲端檔案管理系統 - Node.js + Express 後端伺服器
// 適用環境：Windows Server 2019 + Node.js 18+
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// 中介軟體設定
// ============================================================
app.use(helmet());
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3001', 'https://localhost', 'http://127.0.0.1:3001'];

app.use(cors({
    origin: (origin, callback) => {
        // 允許無 origin（如 Postman、同源請求）或在白名單內的來源
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS 不允許此來源：' + origin));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

// ============================================================
// 路由載入
// ============================================================
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const folderRoutes   = require('./routes/folders');
const fileRoutes     = require('./routes/files');   // 含上傳/下載串流/審核
const reviewRoutes   = require('./routes/reviews'); // 僅查詢待審清單
const logRoutes      = require('./routes/logs');
const settingRoutes  = require('./routes/settings');
const groupRoutes    = require('./routes/groups');

app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/folders',  folderRoutes);
app.use('/api/files',    fileRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/logs',     logRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/groups',   groupRoutes);

// 注意：D:\Storage_NewFileSys 不提供靜態存取
// 所有檔案下載一律走 GET /api/files/:id/download（JWT 驗證後串流）

// ============================================================
// Health Check
// ============================================================
app.get('/api/health', async (req, res) => {
    const { poolPromise } = require('./db');
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT GETDATE() AS now');
    res.json({ ok: true, db_time: result.recordset[0].now });
});

// ============================================================
// 靜態檔案服務（前端打包後）
// backend 在 src/backend/，dist 在專案根目錄，需往上兩層
// ============================================================
app.use(express.static(path.join(__dirname, '../../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// ============================================================
// 全域錯誤處理
// ============================================================
app.use((err, req, res, next) => {
    console.error('伺服器錯誤：', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '伺服器內部錯誤'
    });
});

// ============================================================
// 啟動伺服器
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ 伺服器已啟動，監聽埠號：${PORT}`);
});

module.exports = app;