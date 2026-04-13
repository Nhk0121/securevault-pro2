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
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
const fileRoutes     = require('./routes/files');
const reviewRoutes   = require('./routes/reviews');
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

// ============================================================
// 靜態檔案服務（前端打包後）
// ============================================================
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
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