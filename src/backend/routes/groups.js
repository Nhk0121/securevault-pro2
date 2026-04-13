/* eslint-disable */
// ============================================================
// 組課別管理路由
// ============================================================

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/groups  →  取得組課別清單
router.get('/', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`SELECT * FROM dbo.組課別設定 ORDER BY 排序`);

    res.json({ success: true, data: result.recordset });
});

// POST /api/groups  →  新增組課別
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { 組別, 課別名稱, 排序 } = req.body;

    if (!組別 || !課別名稱) {
        return res.status(400).json({ success: false, message: '請填寫組別與課別名稱' });
    }

    const pool = await poolPromise;
    const id = uuidv4();

    await pool.request()
        .input('id',     sql.UniqueIdentifier, id)
        .input('組別',   sql.NVarChar, 組別)
        .input('課別名稱', sql.NVarChar, 課別名稱)
        .input('排序',   sql.Int, 排序 || 0)
        .input('created_by', sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.組課別設定 (id, 組別, 課別名稱, 排序, created_by)
                VALUES (@id, @組別, @課別名稱, @排序, @created_by)`);

    res.status(201).json({ success: true, message: '組課別已新增', data: { id } });
});

// PATCH /api/groups/:id  →  更新組課別
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { 組別, 課別名稱, 排序 } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('id',     sql.UniqueIdentifier, req.params.id)
        .input('組別',   sql.NVarChar, 組別)
        .input('課別名稱', sql.NVarChar, 課別名稱)
        .input('排序',   sql.Int, 排序 || 0)
        .query(`UPDATE dbo.組課別設定 SET 組別 = @組別, 課別名稱 = @課別名稱, 排序 = @排序 WHERE id = @id`);

    res.json({ success: true, message: '組課別已更新' });
});

// DELETE /api/groups/:id  →  刪除組課別
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`DELETE FROM dbo.組課別設定 WHERE id = @id`);

    res.json({ success: true, message: '組課別已刪除' });
});

module.exports = router;