/* eslint-disable */
// ============================================================
// 審核記錄路由
// ============================================================

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews  →  取得審核清單
router.get('/', verifyToken, async (req, res) => {
    const { 審核狀態, 所屬組別 } = req.query;

    const pool = await poolPromise;
    const request = pool.request();
    let conditions = ['1=1'];

    if (審核狀態) {
        request.input('審核狀態', sql.NVarChar, 審核狀態);
        conditions.push('審核狀態 = @審核狀態');
    }

    if (所屬組別) {
        request.input('所屬組別', sql.NVarChar, 所屬組別);
        conditions.push('所屬組別 = @所屬組別');
    }

    const result = await request.query(
        `SELECT * FROM dbo.審核記錄 WHERE ${conditions.join(' AND ')} ORDER BY created_date DESC`
    );

    res.json({ success: true, data: result.recordset });
});

// POST /api/reviews  →  建立審核申請
router.post('/', verifyToken, async (req, res) => {
    const { 檔案ID, 檔案名稱, 所屬組別 } = req.body;

    const pool = await poolPromise;
    const id = uuidv4();

    await pool.request()
        .input('id',     sql.UniqueIdentifier, id)
        .input('檔案ID', sql.UniqueIdentifier, 檔案ID)
        .input('檔案名稱', sql.NVarChar, 檔案名稱)
        .input('申請者', sql.NVarChar, req.user.email)
        .input('所屬組別', sql.NVarChar, 所屬組別 || null)
        .input('created_by', sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.審核記錄 (id, 檔案ID, 檔案名稱, 申請者, 所屬組別, created_by)
                VALUES (@id, @檔案ID, @檔案名稱, @申請者, @所屬組別, @created_by)`);

    // 同步更新檔案審核狀態
    await pool.request()
        .input('檔案ID', sql.UniqueIdentifier, 檔案ID)
        .query(`UPDATE dbo.檔案 SET 審核狀態 = '待審核' WHERE id = @檔案ID`);

    res.status(201).json({ success: true, message: '已送出審核申請', data: { id } });
});

// PATCH /api/reviews/:id  →  審核（通過/退回）
router.patch('/:id', verifyToken, async (req, res) => {
    const { 審核狀態, 審核備註, 檔案ID } = req.body;

    if (!['已通過', '已退回'].includes(審核狀態)) {
        return res.status(400).json({ success: false, message: '審核狀態無效' });
    }

    const pool = await poolPromise;

    await pool.request()
        .input('id',     sql.UniqueIdentifier, req.params.id)
        .input('審核狀態', sql.NVarChar, 審核狀態)
        .input('審核備註', sql.NVarChar, 審核備註 || null)
        .input('審核者', sql.NVarChar, req.user.email)
        .query(`UPDATE dbo.審核記錄 SET 審核狀態 = @審核狀態, 審核備註 = @審核備註,
                審核者 = @審核者, 審核時間 = GETDATE() WHERE id = @id`);

    // 同步更新檔案審核狀態
    if (檔案ID) {
        await pool.request()
            .input('檔案ID', sql.UniqueIdentifier, 檔案ID)
            .input('審核狀態', sql.NVarChar, 審核狀態)
            .input('審核者', sql.NVarChar, req.user.email)
            .query(`UPDATE dbo.檔案 SET 審核狀態 = @審核狀態, 審核人 = @審核者, 審核時間 = GETDATE() WHERE id = @檔案ID`);
    }

    res.json({ success: true, message: `審核已${審核狀態 === '已通過' ? '通過' : '退回'}` });
});

module.exports = router;