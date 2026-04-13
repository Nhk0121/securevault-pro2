/* eslint-disable */
// ============================================================
// 操作日誌路由
// ============================================================

const express = require('express');
const { sql, poolPromise } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/logs  →  取得操作日誌（管理員）
router.get('/', verifyToken, requireAdmin, async (req, res) => {
    const { 操作類型, 操作者, 是否異常, limit = 200 } = req.query;

    const pool = await poolPromise;
    const request = pool.request();
    let conditions = ['1=1'];

    if (操作類型) {
        request.input('操作類型', sql.NVarChar, 操作類型);
        conditions.push('操作類型 = @操作類型');
    }

    if (操作者) {
        request.input('操作者', sql.NVarChar, `%${操作者}%`);
        conditions.push('操作者 LIKE @操作者');
    }

    if (是否異常 === 'true') {
        conditions.push('是否異常 = 1');
    }

    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(
        `SELECT TOP (@limit) * FROM dbo.操作日誌
         WHERE ${conditions.join(' AND ')} ORDER BY created_date DESC`
    );

    res.json({ success: true, data: result.recordset });
});

// POST /api/logs  →  記錄操作（內部使用）
router.post('/', verifyToken, async (req, res) => {
    const { 操作類型, 目標檔案, 目標檔案ID, 詳細內容, 所屬組別, 儲存區域, 是否異常, 異常原因 } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('操作類型',   sql.NVarChar, 操作類型)
        .input('操作者',     sql.NVarChar, req.user.email)
        .input('操作者IP',   sql.NVarChar, req.ip)
        .input('目標檔案',   sql.NVarChar, 目標檔案 || null)
        .input('目標檔案ID', sql.UniqueIdentifier, 目標檔案ID || null)
        .input('詳細內容',   sql.NVarChar, 詳細內容 || null)
        .input('所屬組別',   sql.NVarChar, 所屬組別 || null)
        .input('儲存區域',   sql.NVarChar, 儲存區域 || null)
        .input('是否異常',   sql.Bit, 是否異常 ? 1 : 0)
        .input('異常原因',   sql.NVarChar, 異常原因 || null)
        .input('created_by', sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID, 詳細內容, 所屬組別, 儲存區域, 是否異常, 異常原因, created_by)
                VALUES (@操作類型, @操作者, @操作者IP, @目標檔案, @目標檔案ID, @詳細內容, @所屬組別, @儲存區域, @是否異常, @異常原因, @created_by)`);

    res.status(201).json({ success: true, message: '日誌已記錄' });
});

module.exports = router;