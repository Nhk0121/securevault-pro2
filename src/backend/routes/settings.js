/* eslint-disable */
// ============================================================
// 系統設定路由
// ============================================================

const express = require('express');
const { sql, poolPromise } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings  →  取得系統設定（所有登入者可讀）
router.get('/', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`SELECT TOP 1 * FROM dbo.系統設定 ORDER BY created_date`);

    res.json({ success: true, data: result.recordset[0] || null });
});

// PATCH /api/settings/:id  →  更新系統設定（admin only）
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
    const {
        時效區天數,
        禁止上傳副檔名,
        允許上傳執行檔IP,
        組別審核人,
    } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('id',              sql.UniqueIdentifier, req.params.id)
        .input('時效區天數',      sql.Int,      時效區天數 || 30)
        .input('禁止上傳副檔名',  sql.NVarChar, 禁止上傳副檔名 || '.exe,.bat,.cmd,.com,.msi,.ps1,.vbs,.sh')
        .input('允許上傳執行檔IP', sql.NVarChar, JSON.stringify(允許上傳執行檔IP || []))
        .input('組別審核人',      sql.NVarChar, JSON.stringify(組別審核人 || []))
        .query(`UPDATE dbo.系統設定 SET
                    時效區天數 = @時效區天數,
                    禁止上傳副檔名 = @禁止上傳副檔名,
                    允許上傳執行檔IP = @允許上傳執行檔IP,
                    組別審核人 = @組別審核人
                WHERE id = @id`);

    res.json({ success: true, message: '系統設定已更新' });
});

module.exports = router;