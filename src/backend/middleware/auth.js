/* eslint-disable */
// ============================================================
// JWT 身份驗證中介軟體
// ============================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-please-change-in-production';

/**
 * 驗證 JWT Token，將使用者資訊附加至 req.user
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ success: false, message: '未提供驗證憑證，請先登入' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: '憑證已過期或無效，請重新登入' });
        }
        req.user = user;
        next();
    });
}

/**
 * 驗證是否為管理員
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '權限不足，此功能僅限管理員使用' });
    }
    next();
}

module.exports = { verifyToken, requireAdmin, JWT_SECRET };