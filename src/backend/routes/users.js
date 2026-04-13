/* eslint-disable */
// ============================================================
// 使用者管理路由（管理員用）
// ============================================================

const express = require('express');
const bcrypt  = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users  →  取得所有使用者（管理員）
router.get('/', verifyToken, requireAdmin, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`SELECT id, email, full_name, role, 所屬組別, 所屬課別, 員工編號,
                       分機號碼, 手機號碼, 是否啟用, 需要變更密碼, 最後登入時間, created_date
                FROM dbo.使用者 ORDER BY created_date DESC`);

    res.json({ success: true, data: result.recordset });
});

// POST /api/users  →  新增使用者（管理員）
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { email, full_name, role, 所屬組別, 所屬課別, 員工編號, 分機號碼, 手機號碼, password } = req.body;

    if (!email || !full_name || !password) {
        return res.status(400).json({ success: false, message: '請填寫必要欄位（Email、姓名、密碼）' });
    }

    const pool = await poolPromise;

    // 確認 Email 是否已存在
    const existing = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`SELECT id FROM dbo.使用者 WHERE email = @email`);

    if (existing.recordset.length > 0) {
        return res.status(409).json({ success: false, message: '此 Email 已被使用' });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.request()
        .input('id',         sql.UniqueIdentifier, id)
        .input('email',      sql.NVarChar, email)
        .input('full_name',  sql.NVarChar, full_name)
        .input('密碼雜湊',   sql.NVarChar, hash)
        .input('role',       sql.NVarChar, role || 'user')
        .input('所屬組別',   sql.NVarChar, 所屬組別 || null)
        .input('所屬課別',   sql.NVarChar, 所屬課別 || null)
        .input('員工編號',   sql.NVarChar, 員工編號 || null)
        .input('分機號碼',   sql.NVarChar, 分機號碼 || null)
        .input('手機號碼',   sql.NVarChar, 手機號碼 || null)
        .input('created_by', sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.使用者
                (id, email, full_name, 密碼雜湊, role, 所屬組別, 所屬課別, 員工編號, 分機號碼, 手機號碼)
                VALUES (@id, @email, @full_name, @密碼雜湊, @role, @所屬組別, @所屬課別, @員工編號, @分機號碼, @手機號碼)`);

    res.status(201).json({ success: true, message: '使用者已建立', data: { id } });
});

// PATCH /api/users/:id  →  更新使用者
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { full_name, role, 所屬組別, 所屬課別, 員工編號, 分機號碼, 手機號碼, 是否啟用 } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('id',       sql.UniqueIdentifier, req.params.id)
        .input('full_name', sql.NVarChar, full_name)
        .input('role',     sql.NVarChar, role)
        .input('所屬組別', sql.NVarChar, 所屬組別 || null)
        .input('所屬課別', sql.NVarChar, 所屬課別 || null)
        .input('員工編號', sql.NVarChar, 員工編號 || null)
        .input('分機號碼', sql.NVarChar, 分機號碼 || null)
        .input('手機號碼', sql.NVarChar, 手機號碼 || null)
        .input('是否啟用', sql.Bit, 是否啟用 !== undefined ? (是否啟用 ? 1 : 0) : 1)
        .query(`UPDATE dbo.使用者 SET full_name = @full_name, role = @role, 所屬組別 = @所屬組別,
                所屬課別 = @所屬課別, 員工編號 = @員工編號, 分機號碼 = @分機號碼,
                手機號碼 = @手機號碼, 是否啟用 = @是否啟用 WHERE id = @id`);

    res.json({ success: true, message: '使用者資料已更新' });
});

// POST /api/users/:id/reset-password  →  重設密碼（管理員）
router.post('/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: '新密碼長度至少需要8個字元' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    const pool = await poolPromise;

    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .input('hash', sql.NVarChar, hash)
        .query(`UPDATE dbo.使用者 SET 密碼雜湊 = @hash, 需要變更密碼 = 1 WHERE id = @id`);

    res.json({ success: true, message: '密碼已重設，使用者下次登入需變更密碼' });
});

module.exports = router;