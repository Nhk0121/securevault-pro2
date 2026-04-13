/* eslint-disable */
// ============================================================
// 系統設定路由
// ============================================================

const express = require('express');
const { sql, poolPromise } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings  →  取得系統設定
router.get('/', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .query(`SELECT TOP 1 * FROM dbo.系統設定 ORDER BY created_date`);

    res.json({ success: true, data: result.recordset[0] || null });
});

// PATCH /api/settings/:id  →  更新系統設定（管理員）
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
    const { 允許上傳執行檔IP, 組別審核人, 時效區天數, 檔案名稱長度上限, 資料夾名稱長度上限, 異常偵測下載次數, 異常偵測時間範圍 } = req.body;

    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .input('允許上傳執行檔IP', sql.NVarChar, JSON.stringify(允許上傳執行檔IP || []))
        .input('組別審核人', sql.NVarChar, JSON.stringify(組別審核人 || []))
        .input('時效區天數', sql.Int, 時效區天數 || 30)
        .input('檔案名稱長度上限', sql.Int, 檔案名稱長度上限 || 50)
        .input('資料夾名稱長度上限', sql.Int, 資料夾名稱長度上限 || 30)
        .input('異常偵測下載次數', sql.Int, 異常偵測下載次數 || 20)
        .input('異常偵測時間範圍', sql.Int, 異常偵測時間範圍 || 10)
        .query(`UPDATE dbo.系統設定 SET
                允許上傳執行檔IP = @允許上傳執行檔IP,
                組別審核人 = @組別審核人,
                時效區天數 = @時效區天數,
                檔案名稱長度上限 = @檔案名稱長度上限,
                資料夾名稱長度上限 = @資料夾名稱長度上限,
                異常偵測下載次數 = @異常偵測下載次數,
                異常偵測時間範圍 = @異常偵測時間範圍
                WHERE id = @id`);

    res.json({ success: true, message: '系統設定已更新' });
});

module.exports = router;