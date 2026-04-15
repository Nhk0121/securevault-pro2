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

// GET /api/users  →  取得所有使用者
router.get('/', verifyToken, requireAdmin, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`SELECT id, UserID, email, full_name, role, TitleLevel,
                       所屬組別, 所屬課別, 分機號碼, 手機號碼, SortOrder,
                       是否啟用, NeedChangePassword, 最後登入時間, created_date
                FROM dbo.使用者 ORDER BY SortOrder, created_date`);

    res.json({ success: true, data: result.recordset });
});

// POST /api/users  →  新增使用者
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { UserID, email, full_name, role, TitleLevel, 所屬組別, 所屬課別,
            分機號碼, 手機號碼, SortOrder, password } = req.body;

    if (!UserID || !email || !full_name || !password || !所屬組別) {
        return res.status(400).json({ success: false, message: '請填寫必要欄位（UserID、Email、姓名、所屬組別、密碼）' });
    }

    // 驗證 UserID 格式：員工6碼 或 外包10碼
    const isContractor = role === 'contractor';
    if (isContractor && UserID.length !== 10) {
        return res.status(400).json({ success: false, message: '外包人員 UserID 必須為 10 碼' });
    }
    if (!isContractor && UserID.length !== 6) {
        return res.status(400).json({ success: false, message: '員工 UserID 必須為 6 碼' });
    }

    const pool = await poolPromise;

    const existing = await pool.request()
        .input('email',  sql.NVarChar, email)
        .input('UserID', sql.NVarChar, UserID)
        .query(`SELECT id FROM dbo.使用者 WHERE email = @email OR UserID = @UserID`);

    if (existing.recordset.length > 0) {
        return res.status(409).json({ success: false, message: '此 Email 或 UserID 已被使用' });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.request()
        .input('id',         sql.UniqueIdentifier, id)
        .input('UserID',     sql.NVarChar, UserID)
        .input('email',      sql.NVarChar, email)
        .input('full_name',  sql.NVarChar, full_name)
        .input('密碼雜湊',   sql.NVarChar, hash)
        .input('role',       sql.NVarChar, role || 'user')
        .input('TitleLevel', sql.NVarChar, TitleLevel || '05')
        .input('所屬組別',   sql.NVarChar, 所屬組別)
        .input('所屬課別',   sql.NVarChar, 所屬課別 || null)
        .input('分機號碼',   sql.NVarChar, 分機號碼 || null)
        .input('手機號碼',   sql.NVarChar, 手機號碼 || null)
        .input('SortOrder',  sql.Int, SortOrder || 50)
        .query(`INSERT INTO dbo.使用者
                (id, UserID, email, full_name, 密碼雜湊, role, TitleLevel,
                 所屬組別, 所屬課別, 分機號碼, 手機號碼, SortOrder)
                VALUES
                (@id, @UserID, @email, @full_name, @密碼雜湊, @role, @TitleLevel,
                 @所屬組別, @所屬課別, @分機號碼, @手機號碼, @SortOrder)`);

    res.status(201).json({ success: true, message: '使用者已建立', data: { id } });
});

// PATCH /api/users/:id  →  更新使用者
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { full_name, role, TitleLevel, 所屬組別, 所屬課別,
            分機號碼, 手機號碼, SortOrder, 是否啟用 } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('id',         sql.UniqueIdentifier, req.params.id)
        .input('full_name',  sql.NVarChar, full_name)
        .input('role',       sql.NVarChar, role)
        .input('TitleLevel', sql.NVarChar, TitleLevel || '05')
        .input('所屬組別',   sql.NVarChar, 所屬組別)
        .input('所屬課別',   sql.NVarChar, 所屬課別 || null)
        .input('分機號碼',   sql.NVarChar, 分機號碼 || null)
        .input('手機號碼',   sql.NVarChar, 手機號碼 || null)
        .input('SortOrder',  sql.Int, SortOrder !== undefined ? SortOrder : 50)
        .input('是否啟用',   sql.Bit, 是否啟用 !== undefined ? (是否啟用 ? 1 : 0) : 1)
        .query(`UPDATE dbo.使用者 SET
                    full_name = @full_name, role = @role, TitleLevel = @TitleLevel,
                    所屬組別 = @所屬組別, 所屬課別 = @所屬課別,
                    分機號碼 = @分機號碼, 手機號碼 = @手機號碼,
                    SortOrder = @SortOrder, 是否啟用 = @是否啟用
                WHERE id = @id`);

    res.json({ success: true, message: '使用者資料已更新' });
});

// POST /api/users/:id/reset-password  →  重設密碼（強制變更旗標）
router.post('/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: '新密碼長度至少需要8個字元' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    const pool = await poolPromise;

    await pool.request()
        .input('id',   sql.UniqueIdentifier, req.params.id)
        .input('hash', sql.NVarChar, hash)
        .query(`UPDATE dbo.使用者 SET 密碼雜湊 = @hash, NeedChangePassword = 1 WHERE id = @id`);

    res.json({ success: true, message: '密碼已重設，使用者下次登入時需強制變更密碼' });
});

// DELETE /api/users/:id  →  停用使用者
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`UPDATE dbo.使用者 SET 是否啟用 = 0 WHERE id = @id`);

    res.json({ success: true, message: '使用者已停用' });
});

module.exports = router;