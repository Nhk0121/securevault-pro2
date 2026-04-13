/* eslint-disable */
// ============================================================
// 檔案路由 - 上傳 / 下載 / 列表 / 刪除 / 移動
// ============================================================

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// 檔案儲存設定（存放至本機 uploads 資料夾）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 以 UUID 作為檔名，避免重複與特殊字元問題
        const ext = path.extname(Buffer.from(file.originalname, 'latin1').toString('utf8'));
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 最大100MB
});

// -------------------------------------------------------
// GET /api/files  →  取得檔案列表
// -------------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
    const { 資料夾ID, 儲存區域, 所屬組別, 已刪除 } = req.query;

    const pool = await poolPromise;
    const request = pool.request();

    let conditions = ['1=1'];

    if (資料夾ID) {
        request.input('資料夾ID', sql.UniqueIdentifier, 資料夾ID);
        conditions.push('所屬資料夾 = @資料夾ID');
    } else if (資料夾ID === 'null' || 資料夾ID === '') {
        conditions.push('所屬資料夾 IS NULL');
    }

    if (儲存區域) {
        request.input('儲存區域', sql.NVarChar, 儲存區域);
        conditions.push('儲存區域 = @儲存區域');
    }

    if (所屬組別) {
        request.input('所屬組別', sql.NVarChar, 所屬組別);
        conditions.push('所屬組別 = @所屬組別');
    }

    const isDeleted = 已刪除 === 'true' ? 1 : 0;
    request.input('已刪除', sql.Bit, isDeleted);
    conditions.push('已刪除 = @已刪除');

    const whereClause = conditions.join(' AND ');
    const result = await request.query(
        `SELECT * FROM dbo.檔案 WHERE ${whereClause} ORDER BY created_date DESC`
    );

    res.json({ success: true, data: result.recordset });
});

// -------------------------------------------------------
// POST /api/files/upload  →  上傳檔案
// -------------------------------------------------------
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ success: false, message: '未收到檔案' });
    }

    // 還原原始檔名（multer 可能轉換編碼）
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const fileUrl = `/uploads/${file.filename}`;

    // 判斷是否為執行檔
    const execExtensions = ['exe', 'bat', 'cmd', 'com', 'msi', 'ps1', 'vbs', 'js', 'sh'];
    const isExec = execExtensions.includes(ext);

    const pool = await poolPromise;
    const fileId = uuidv4();

    await pool.request()
        .input('id',           sql.UniqueIdentifier, fileId)
        .input('檔案名稱',     sql.NVarChar, originalName)
        .input('檔案網址',     sql.NVarChar, fileUrl)
        .input('檔案類型',     sql.NVarChar, file.mimetype)
        .input('檔案大小',     sql.BigInt, file.size)
        .input('副檔名',       sql.NVarChar, ext)
        .input('所屬資料夾',   sql.UniqueIdentifier, req.body.資料夾ID || null)
        .input('儲存區域',     sql.NVarChar, req.body.儲存區域 || '時效區')
        .input('所屬組別',     sql.NVarChar, req.body.所屬組別 || null)
        .input('所屬課別',     sql.NVarChar, req.body.所屬課別 || null)
        .input('上傳者IP',     sql.NVarChar, req.ip)
        .input('是否為執行檔', sql.Bit, isExec ? 1 : 0)
        .input('created_by',   sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.檔案
                (id, 檔案名稱, 檔案網址, 檔案類型, 檔案大小, 副檔名, 所屬資料夾,
                 儲存區域, 所屬組別, 所屬課別, 上傳者IP, 是否為執行檔, created_by)
                VALUES
                (@id, @檔案名稱, @檔案網址, @檔案類型, @檔案大小, @副檔名, @所屬資料夾,
                 @儲存區域, @所屬組別, @所屬課別, @上傳者IP, @是否為執行檔, @created_by)`);

    // 記錄上傳日誌
    await pool.request()
        .input('操作類型', sql.NVarChar, '上傳')
        .input('操作者', sql.NVarChar, req.user.email)
        .input('操作者IP', sql.NVarChar, req.ip)
        .input('目標檔案', sql.NVarChar, originalName)
        .input('目標檔案ID', sql.UniqueIdentifier, fileId)
        .input('所屬組別', sql.NVarChar, req.body.所屬組別 || null)
        .input('儲存區域', sql.NVarChar, req.body.儲存區域 || '時效區')
        .input('created_by', sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID, 所屬組別, 儲存區域, created_by)
                VALUES (@操作類型, @操作者, @操作者IP, @目標檔案, @目標檔案ID, @所屬組別, @儲存區域, @created_by)`);

    res.json({ success: true, message: '檔案上傳成功', data: { id: fileId, 檔案網址: fileUrl, 檔案名稱: originalName } });
});

// -------------------------------------------------------
// DELETE /api/files/:id  →  移至回收桶（軟刪除）
// -------------------------------------------------------
router.delete('/:id', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .input('刪除者', sql.NVarChar, req.user.email)
        .query(`UPDATE dbo.檔案 SET 已刪除 = 1, 刪除時間 = GETDATE(), 刪除者 = @刪除者
                WHERE id = @id`);

    res.json({ success: true, message: '檔案已移至回收桶' });
});

// -------------------------------------------------------
// PATCH /api/files/:id/restore  →  從回收桶還原
// -------------------------------------------------------
router.patch('/:id/restore', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`UPDATE dbo.檔案 SET 已刪除 = 0, 刪除時間 = NULL, 刪除者 = NULL WHERE id = @id`);

    res.json({ success: true, message: '檔案已還原' });
});

// -------------------------------------------------------
// DELETE /api/files/:id/permanent  →  永久刪除
// -------------------------------------------------------
router.delete('/:id/permanent', verifyToken, async (req, res) => {
    const pool = await poolPromise;

    // 取得檔案路徑
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 檔案網址 FROM dbo.檔案 WHERE id = @id`);

    const fileRecord = result.recordset[0];
    if (fileRecord && fileRecord.檔案網址) {
        // 刪除實體檔案
        const filePath = path.join(process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'),
            path.basename(fileRecord.檔案網址));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`DELETE FROM dbo.檔案 WHERE id = @id`);

    res.json({ success: true, message: '檔案已永久刪除' });
});

module.exports = router;