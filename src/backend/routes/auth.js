/* eslint-disable */
// ============================================================
// 驗證路由 - 登入 / 取得目前使用者 / 變更密碼 / 更新個人資料
// ============================================================

const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { sql, poolPromise } = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// -------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: '請輸入帳號與密碼' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`SELECT * FROM dbo.使用者 WHERE email = @email AND 是否啟用 = 1`);

    const user = result.recordset[0];
    if (!user) {
        return res.status(401).json({ success: false, message: '帳號不存在或已停用' });
    }

    const passwordMatch = await bcrypt.compare(password, user.密碼雜湊);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, message: '密碼錯誤' });
    }

    // 更新最後登入時間
    await pool.request()
        .input('id', sql.UniqueIdentifier, user.id)
        .query(`UPDATE dbo.使用者 SET 最後登入時間 = GETDATE() WHERE id = @id`);

    // 記錄登入日誌
    await pool.request()
        .input('操作者', sql.NVarChar, user.email)
        .input('操作者IP', sql.NVarChar, req.ip)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 詳細內容)
                VALUES (N'登入', @操作者, @操作者IP, N'使用者登入系統')`);

    const token = jwt.sign(
        {
            id:       user.id,
            email:    user.email,
            role:     user.role,
            full_name: user.full_name,
            TitleLevel: user.TitleLevel,
            所屬組別: user.所屬組別,
            所屬課別: user.所屬課別,
        },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({
        success: true,
        token,
        user: {
            id:                 user.id,
            UserID:             user.UserID,
            email:              user.email,
            full_name:          user.full_name,
            role:               user.role,
            TitleLevel:         user.TitleLevel,
            所屬組別:           user.所屬組別,
            所屬課別:           user.所屬課別,
            分機號碼:           user.分機號碼,
            手機號碼:           user.手機號碼,
            NeedChangePassword: user.NeedChangePassword,  // 前端用於強制導向變更密碼頁
        }
    });
});

// -------------------------------------------------------
// GET /api/auth/me
// -------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, req.user.id)
        .query(`SELECT id, UserID, email, full_name, role, TitleLevel,
                       所屬組別, 所屬課別, 分機號碼, 手機號碼, NeedChangePassword
                FROM dbo.使用者 WHERE id = @id AND 是否啟用 = 1`);

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ success: false, message: '使用者不存在' });

    res.json({ success: true, data: user });
});

// -------------------------------------------------------
// POST /api/auth/change-password
// -------------------------------------------------------
router.post('/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: '新密碼長度至少需要8個字元' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, req.user.id)
        .query(`SELECT 密碼雜湊, NeedChangePassword FROM dbo.使用者 WHERE id = @id`);

    const user = result.recordset[0];

    // 非強制變更時需驗證舊密碼
    if (!user.NeedChangePassword && currentPassword) {
        const match = await bcrypt.compare(currentPassword, user.密碼雜湊);
        if (!match) {
            return res.status(401).json({ success: false, message: '目前密碼錯誤' });
        }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.request()
        .input('id',   sql.UniqueIdentifier, req.user.id)
        .input('hash', sql.NVarChar, newHash)
        .query(`UPDATE dbo.使用者 SET 密碼雜湊 = @hash, NeedChangePassword = 0 WHERE id = @id`);

    res.json({ success: true, message: '密碼變更成功' });
});

// -------------------------------------------------------
// PATCH /api/auth/me  →  更新個人資料（分機/手機）
// -------------------------------------------------------
router.patch('/me', verifyToken, async (req, res) => {
    const { 分機號碼, 手機號碼 } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('id',     sql.UniqueIdentifier, req.user.id)
        .input('分機號碼', sql.NVarChar, 分機號碼 || null)
        .input('手機號碼', sql.NVarChar, 手機號碼 || null)
        .query(`UPDATE dbo.使用者 SET 分機號碼 = @分機號碼, 手機號碼 = @手機號碼 WHERE id = @id`);

    res.json({ success: true, message: '個人資料已更新' });
});

module.exports = router;