/* eslint-disable */
/**
 * 審核記錄路由（已簡化）
 * 審核狀態直接存在 dbo.檔案 上，不再有獨立審核記錄表。
 * 所有審核操作改由 PATCH /api/files/:id/review 處理。
 * 此檔案僅提供「查詢待審核清單」的便捷 API。
 */

const express = require('express');
const { sql, poolPromise } = require('../db');
const { verifyToken, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews  →  取得待審核檔案清單（manager/admin）
router.get('/', verifyToken, requireManagerOrAdmin, async (req, res) => {
    const { 審核狀態, 所屬組別 } = req.query;
    const user = req.user;

    const pool = await poolPromise;
    const request = pool.request();
    let conditions = ["儲存區域 = N'永久區'"];

    // manager 只能看自己組別
    if (user.role === 'manager') {
        request.input('所屬組別_user', sql.NVarChar, user.所屬組別);
        conditions.push('所屬組別 = @所屬組別_user');
    } else if (所屬組別) {
        request.input('所屬組別', sql.NVarChar, 所屬組別);
        conditions.push('所屬組別 = @所屬組別');
    }

    const 狀態 = 審核狀態 || '待審核';
    request.input('審核狀態', sql.NVarChar, 狀態);
    conditions.push('審核狀態 = @審核狀態');

    const result = await request.query(
        `SELECT id, 檔案名稱, 檔案大小, 副檔名,
                所屬組別, 所屬課別, 審核狀態, 審核人, 審核時間, 審核備註,
                created_by, created_date
         FROM dbo.檔案 WHERE ${conditions.join(' AND ')} ORDER BY created_date DESC`
    );

    res.json({ success: true, data: result.recordset });
});

module.exports = router;