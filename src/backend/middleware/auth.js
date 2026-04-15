/* eslint-disable */
// ============================================================
// JWT 身份驗證中介軟體 + 角色權限輔助函式
// 角色對應職稱：
//   admin      = TitleLevel 00,01,02 → 最高權限
//   manager    = TitleLevel 03       → 同組審核
//   user       = TitleLevel 04,05    → 一般上傳/下載
//   contractor = TitleLevel 06       → 僅看所屬課別時效區
// ============================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'please-change-this-secret-in-production';

/** 驗證 JWT，將使用者資訊附加至 req.user */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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

/** 僅限 admin */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '權限不足，此功能僅限管理員使用' });
    }
    next();
}

/** admin 或 manager（審核相關操作） */
function requireManagerOrAdmin(req, res, next) {
    if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: '權限不足，此功能需課長以上職稱' });
    }
    next();
}

/** contractor 不可執行的操作（刪除等） */
function denyContractor(req, res, next) {
    if (req.user && req.user.role === 'contractor') {
        return res.status(403).json({ success: false, message: '外包人員無此操作權限' });
    }
    next();
}

/**
 * 判斷某使用者是否可讀取指定組別的永久區
 *   - admin：全組別
 *   - manager/user：同組別
 *   - contractor：不可
 */
function canReadPermanent(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'contractor') return false;
    if (user.role === 'admin') return true;
    return user.所屬組別 === 目標組別;
}

/**
 * 判斷是否可對永久區進行寫入（上傳/刪除）
 *   - admin：全組別
 *   - manager：同組別（但需審核流程）
 *   - user：同組別（需送審）
 *   - contractor：不可
 */
function canWritePermanent(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'contractor') return false;
    if (user.role === 'admin') return true;
    return user.所屬組別 === 目標組別;
}

/**
 * 判斷是否可審核（通過/退回）永久區檔案
 *   - admin：全組別
 *   - manager：同組別
 */
function canApprove(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager') return user.所屬組別 === 目標組別;
    return false;
}

module.exports = {
    verifyToken,
    requireAdmin,
    requireManagerOrAdmin,
    denyContractor,
    canReadPermanent,
    canWritePermanent,
    canApprove,
    JWT_SECRET,
};