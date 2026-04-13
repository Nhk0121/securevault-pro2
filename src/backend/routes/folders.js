/* eslint-disable */
// ============================================================
// 資料夾路由
// ============================================================

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/folders  →  取得資料夾列表
router.get('/', verifyToken, async (req, res) => {
    const { 上層資料夾, 儲存區域, 所屬組別 } = req.query;

    const pool = await poolPromise;
    const request = pool.request();
    let conditions = ['1=1'];

    if (上層資料夾) {
        request.input('上層資料夾', sql.UniqueIdentifier, 上層資料夾);
        conditions.push('上層資料夾 = @上層資料夾');
    } else {
        conditions.push('上層資料夾 IS NULL');
    }

    if (儲存區域) {
        request.input('儲存區域', sql.NVarChar, 儲存區域);
        conditions.push('儲存區域 = @儲存區域');
    }

    if (所屬組別) {
        request.input('所屬組別', sql.NVarChar, 所屬組別);
        conditions.push('所屬組別 = @所屬組別');
    }

    const result = await request.query(
        `SELECT * FROM dbo.資料夾 WHERE ${conditions.join(' AND ')} ORDER BY 資料夾名稱`
    );

    res.json({ success: true, data: result.recordset });
});

// POST /api/folders  →  建立資料夾
router.post('/', verifyToken, async (req, res) => {
    const { 資料夾名稱, 上層資料夾, 所屬組別, 所屬課別, 儲存區域, 層級, 是課別資料夾, 虛擬路徑 } = req.body;

    if (!資料夾名稱 || !所屬組別) {
        return res.status(400).json({ success: false, message: '請填寫資料夾名稱與所屬組別' });
    }

    const pool = await poolPromise;
    const id = uuidv4();

    await pool.request()
        .input('id',         sql.UniqueIdentifier, id)
        .input('資料夾名稱', sql.NVarChar, 資料夾名稱)
        .input('上層資料夾', sql.UniqueIdentifier, 上層資料夾 || null)
        .input('所屬組別',   sql.NVarChar, 所屬組別)
        .input('所屬課別',   sql.NVarChar, 所屬課別 || null)
        .input('儲存區域',   sql.NVarChar, 儲存區域 || '時效區')
        .input('層級',       sql.Int, 層級 || 1)
        .input('是課別資料夾', sql.Bit, 是課別資料夾 ? 1 : 0)
        .input('虛擬路徑',   sql.NVarChar, 虛擬路徑 || null)
        .input('created_by', sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.資料夾 (id, 資料夾名稱, 上層資料夾, 所屬組別, 所屬課別, 儲存區域, 層級, 是課別資料夾, 虛擬路徑, created_by)
                VALUES (@id, @資料夾名稱, @上層資料夾, @所屬組別, @所屬課別, @儲存區域, @層級, @是課別資料夾, @虛擬路徑, @created_by)`);

    res.status(201).json({ success: true, message: '資料夾已建立', data: { id } });
});

// DELETE /api/folders/:id  →  刪除資料夾
router.delete('/:id', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`DELETE FROM dbo.資料夾 WHERE id = @id`);

    res.json({ success: true, message: '資料夾已刪除' });
});

module.exports = router;