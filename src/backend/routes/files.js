/* eslint-disable */
// ============================================================
// 檔案路由 - 上傳 / 下載(串流) / 列表 / 審核 / 刪除
//
// 實體路徑模式：檔案存在 D:\Storage_NewFileSys\ 以下
// 下載一律走 API 串流，前端不可直接存取磁碟路徑
// ============================================================

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const { sql, poolPromise } = require('../db');
const {
    verifyToken,
    requireManagerOrAdmin,
    denyContractor,
    canReadPermanent,
    canWritePermanent,
    canApprove,
} = require('../middleware/auth');

const router = express.Router();

// 根儲存目錄（優先取環境變數，預設 D:\Storage_NewFileSys）
const STORAGE_ROOT = process.env.STORAGE_ROOT || 'D:\\Storage_NewFileSys';

// 禁止上傳的副檔名（預設值，系統設定可覆蓋）
const DEFAULT_BLOCKED_EXT = ['.exe','.bat','.cmd','.com','.msi','.ps1','.vbs','.sh'];

// 從系統設定讀取禁止副檔名（非同步，每次請求都取 DB 值）
async function getBlockedExtensions(pool) {
    const r = await pool.request()
        .query(`SELECT TOP 1 禁止上傳副檔名 FROM dbo.系統設定`);
    const raw = r.recordset[0]?.禁止上傳副檔名;
    if (!raw) return DEFAULT_BLOCKED_EXT;
    return raw.split(',').map(e => e.trim().toLowerCase());
}

// multer 設定：先存到暫存區，驗證通過後再移至正式目錄
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tmp = path.join(STORAGE_ROOT, 'tmp');
        if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
        cb(null, tmp);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(Buffer.from(file.originalname, 'latin1').toString('utf8'));
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_MB || '500') * 1024 * 1024 }
});

// -------------------------------------------------------
// GET /api/files  →  取得檔案列表（依權限過濾）
// -------------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
    const { 資料夾ID, 儲存區域, 所屬組別, 所屬課別, 已刪除 } = req.query;
    const user = req.user;

    // contractor 只能看自己課別的時效區
    if (user.role === 'contractor') {
        if (儲存區域 === '永久區') {
            return res.status(403).json({ success: false, message: '外包人員不可存取永久區' });
        }
        // 強制限制課別
        if (所屬課別 && 所屬課別 !== user.所屬課別) {
            return res.json({ success: true, data: [] });
        }
    }

    // 非 admin 查詢永久區時需驗證組別
    if (儲存區域 === '永久區' && user.role !== 'admin') {
        const targetGroup = 所屬組別 || '';
        if (!canReadPermanent(user, targetGroup)) {
            return res.status(403).json({ success: false, message: '無權存取此組別永久區' });
        }
    }

    const pool = await poolPromise;
    const request = pool.request();
    let conditions = ['1=1'];

    if (資料夾ID && 資料夾ID !== 'null' && 資料夾ID !== '') {
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

    if (所屬課別) {
        request.input('所屬課別', sql.NVarChar, 所屬課別);
        conditions.push('所屬課別 = @所屬課別');
    }

    const isDeleted = 已刪除 === 'true' ? 1 : 0;
    request.input('已刪除', sql.Bit, isDeleted);
    conditions.push('已刪除 = @已刪除');

    const result = await request.query(
        `SELECT id, 檔案名稱, 檔案類型, 檔案大小, 副檔名,
                所屬資料夾, 儲存區域, 所屬組別, 所屬課別,
                審核狀態, 審核人, 審核時間, 審核備註,
                上傳者IP, 到期日期, 已刪除, 刪除時間, created_date, created_by
         FROM dbo.檔案 WHERE ${conditions.join(' AND ')} ORDER BY created_date DESC`
        // 注意：不回傳 實體路徑，避免前端取得磁碟路徑
    );

    res.json({ success: true, data: result.recordset });
});

// -------------------------------------------------------
// POST /api/files/upload  →  上傳檔案
// -------------------------------------------------------
router.post('/upload', verifyToken, denyContractor, upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '未收到檔案' });

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase();

    const pool = await poolPromise;

    // 檢查禁止副檔名
    const blocked = await getBlockedExtensions(pool);
    if (blocked.includes(ext)) {
        fs.unlinkSync(file.path); // 刪除暫存檔
        return res.status(400).json({ success: false, message: `禁止上傳 ${ext} 類型的檔案` });
    }

    // 計算正式儲存路徑
    const 儲存區域 = req.body.儲存區域 || '時效區';
    const 所屬組別 = req.body.所屬組別 || '';
    const dateDir  = new Date().toISOString().slice(0, 10).replace(/-/g, path.sep);
    const destDir  = path.join(STORAGE_ROOT, 儲存區域, 所屬組別, dateDir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const destPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, destPath); // 從 tmp 移至正式目錄

    const fileId = uuidv4();
    const 到期日期 = 儲存區域 === '時效區'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 預設 30 天
        : null;

    await pool.request()
        .input('id',           sql.UniqueIdentifier, fileId)
        .input('檔案名稱',     sql.NVarChar, originalName)
        .input('實體路徑',     sql.NVarChar, destPath)
        .input('檔案類型',     sql.NVarChar, file.mimetype)
        .input('檔案大小',     sql.BigInt, file.size)
        .input('副檔名',       sql.NVarChar, ext.replace('.', ''))
        .input('所屬資料夾',   sql.UniqueIdentifier, req.body.資料夾ID || null)
        .input('儲存區域',     sql.NVarChar, 儲存區域)
        .input('所屬組別',     sql.NVarChar, 所屬組別 || null)
        .input('所屬課別',     sql.NVarChar, req.body.所屬課別 || null)
        .input('上傳者IP',     sql.NVarChar, req.ip)
        .input('到期日期',     sql.DateTime2, 到期日期)
        .input('created_by',   sql.NVarChar, req.user.email)
        .query(`INSERT INTO dbo.檔案
                (id, 檔案名稱, 實體路徑, 檔案類型, 檔案大小, 副檔名, 所屬資料夾,
                 儲存區域, 所屬組別, 所屬課別, 上傳者IP, 到期日期, created_by)
                VALUES
                (@id, @檔案名稱, @實體路徑, @檔案類型, @檔案大小, @副檔名, @所屬資料夾,
                 @儲存區域, @所屬組別, @所屬課別, @上傳者IP, @到期日期, @created_by)`);

    // 操作日誌
    await pool.request()
        .input('操作者',     sql.NVarChar, req.user.email)
        .input('操作者IP',   sql.NVarChar, req.ip)
        .input('目標檔案',   sql.NVarChar, originalName)
        .input('目標檔案ID', sql.UniqueIdentifier, fileId)
        .input('所屬組別',   sql.NVarChar, 所屬組別 || null)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID, 所屬組別)
                VALUES (N'上傳', @操作者, @操作者IP, @目標檔案, @目標檔案ID, @所屬組別)`);

    res.json({ success: true, message: '檔案上傳成功', data: { id: fileId, 檔案名稱: originalName } });
});

// -------------------------------------------------------
// GET /api/files/:id/download  →  串流下載（驗證 Session）
// -------------------------------------------------------
router.get('/:id/download', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 檔案名稱, 實體路徑, 儲存區域, 所屬組別, 所屬課別
                FROM dbo.檔案 WHERE id = @id AND 已刪除 = 0`);

    const fileRecord = result.recordset[0];
    if (!fileRecord) return res.status(404).json({ success: false, message: '檔案不存在' });

    const user = req.user;

    // contractor 只能下載自己課別的時效區
    if (user.role === 'contractor') {
        if (fileRecord.儲存區域 === '永久區') {
            return res.status(403).json({ success: false, message: '外包人員無法下載永久區檔案' });
        }
        if (fileRecord.所屬課別 !== user.所屬課別) {
            return res.status(403).json({ success: false, message: '外包人員只能下載所屬課別的檔案' });
        }
    }

    // 非 admin 下載永久區需同組別
    if (fileRecord.儲存區域 === '永久區' && !canReadPermanent(user, fileRecord.所屬組別)) {
        return res.status(403).json({ success: false, message: '無權下載此檔案' });
    }

    if (!fileRecord.實體路徑 || !fs.existsSync(fileRecord.實體路徑)) {
        return res.status(404).json({ success: false, message: '實體檔案不存在，請聯繫管理員' });
    }

    // 記錄下載日誌
    await pool.request()
        .input('操作者',     sql.NVarChar, user.email)
        .input('操作者IP',   sql.NVarChar, req.ip)
        .input('目標檔案',   sql.NVarChar, fileRecord.檔案名稱)
        .input('目標檔案ID', sql.UniqueIdentifier, req.params.id)
        .input('所屬組別',   sql.NVarChar, fileRecord.所屬組別 || null)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID, 所屬組別)
                VALUES (N'下載', @操作者, @操作者IP, @目標檔案, @目標檔案ID, @所屬組別)`);

    // 串流回應
    const fileName = encodeURIComponent(fileRecord.檔案名稱);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(fileRecord.實體路徑).pipe(res);
});

// -------------------------------------------------------
// GET /api/files/:id/preview  →  串流預覽（同下載但 inline）
// -------------------------------------------------------
router.get('/:id/preview', verifyToken, async (req, res) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 檔案名稱, 實體路徑, 檔案類型, 儲存區域, 所屬組別, 所屬課別
                FROM dbo.檔案 WHERE id = @id AND 已刪除 = 0`);

    const fileRecord = result.recordset[0];
    if (!fileRecord) return res.status(404).json({ success: false, message: '檔案不存在' });

    const user = req.user;

    if (user.role === 'contractor') {
        if (fileRecord.儲存區域 === '永久區') {
            return res.status(403).json({ success: false, message: '外包人員無法預覽永久區檔案' });
        }
        if (fileRecord.所屬課別 !== user.所屬課別) {
            return res.status(403).json({ success: false, message: '外包人員只能預覽所屬課別的檔案' });
        }
    }

    if (fileRecord.儲存區域 === '永久區' && !canReadPermanent(user, fileRecord.所屬組別)) {
        return res.status(403).json({ success: false, message: '無權預覽此檔案' });
    }

    if (!fileRecord.實體路徑 || !fs.existsSync(fileRecord.實體路徑)) {
        return res.status(404).json({ success: false, message: '實體檔案不存在' });
    }

    const fileName = encodeURIComponent(fileRecord.檔案名稱);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${fileName}`);
    res.setHeader('Content-Type', fileRecord.檔案類型 || 'application/octet-stream');
    fs.createReadStream(fileRecord.實體路徑).pipe(res);
});

// -------------------------------------------------------
// PATCH /api/files/:id/review  →  審核（manager/admin）
// -------------------------------------------------------
router.patch('/:id/review', verifyToken, requireManagerOrAdmin, async (req, res) => {
    const { 審核狀態, 審核備註 } = req.body;

    if (!['已通過', '已退回'].includes(審核狀態)) {
        return res.status(400).json({ success: false, message: '審核狀態無效' });
    }

    const pool = await poolPromise;

    // 取得檔案組別，確認 manager 只能審核同組
    const fileResult = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 所屬組別, 檔案名稱 FROM dbo.檔案 WHERE id = @id`);

    const fileRecord = fileResult.recordset[0];
    if (!fileRecord) return res.status(404).json({ success: false, message: '檔案不存在' });

    if (!canApprove(req.user, fileRecord.所屬組別)) {
        return res.status(403).json({ success: false, message: '您僅能審核所屬組別的檔案' });
    }

    await pool.request()
        .input('id',     sql.UniqueIdentifier, req.params.id)
        .input('審核狀態', sql.NVarChar, 審核狀態)
        .input('審核備註', sql.NVarChar, 審核備註 || null)
        .input('審核人',   sql.NVarChar, req.user.email)
        .query(`UPDATE dbo.檔案 SET
                    審核狀態 = @審核狀態, 審核備註 = @審核備註,
                    審核人 = @審核人, 審核時間 = GETDATE()
                WHERE id = @id`);

    // 記錄審核日誌
    const logType = 審核狀態 === '已通過' ? '審核通過' : '審核退回';
    await pool.request()
        .input('操作者',     sql.NVarChar, req.user.email)
        .input('操作者IP',   sql.NVarChar, req.ip)
        .input('目標檔案',   sql.NVarChar, fileRecord.檔案名稱)
        .input('目標檔案ID', sql.UniqueIdentifier, req.params.id)
        .input('詳細內容',   sql.NVarChar, 審核備註 || null)
        .input('logType',    sql.NVarChar, logType)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID, 詳細內容)
                VALUES (@logType, @操作者, @操作者IP, @目標檔案, @目標檔案ID, @詳細內容)`);

    res.json({ success: true, message: `審核已${審核狀態 === '已通過' ? '通過' : '退回'}` });
});

// -------------------------------------------------------
// DELETE /api/files/:id  →  移至回收桶（contractor 不可）
// -------------------------------------------------------
router.delete('/:id', verifyToken, denyContractor, async (req, res) => {
    const pool = await poolPromise;

    const r = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 所屬組別, 儲存區域, 檔案名稱 FROM dbo.檔案 WHERE id = @id`);

    const f = r.recordset[0];
    if (!f) return res.status(404).json({ success: false, message: '檔案不存在' });

    // user 只能刪除同組別檔案
    if (req.user.role === 'user' && f.所屬組別 !== req.user.所屬組別) {
        return res.status(403).json({ success: false, message: '跨組別檔案只能下載，無法刪除' });
    }

    await pool.request()
        .input('id',     sql.UniqueIdentifier, req.params.id)
        .input('刪除者', sql.NVarChar, req.user.email)
        .query(`UPDATE dbo.檔案 SET 已刪除 = 1, 刪除時間 = GETDATE(), 刪除者 = @刪除者,
                儲存區域 = N'資源回收桶' WHERE id = @id`);

    // 日誌
    await pool.request()
        .input('操作者',     sql.NVarChar, req.user.email)
        .input('操作者IP',   sql.NVarChar, req.ip)
        .input('目標檔案',   sql.NVarChar, f.檔案名稱)
        .input('目標檔案ID', sql.UniqueIdentifier, req.params.id)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID)
                VALUES (N'刪除', @操作者, @操作者IP, @目標檔案, @目標檔案ID)`);

    res.json({ success: true, message: '檔案已移至回收桶' });
});

// -------------------------------------------------------
// PATCH /api/files/:id/restore  →  從回收桶還原
// -------------------------------------------------------
router.patch('/:id/restore', verifyToken, denyContractor, async (req, res) => {
    const pool = await poolPromise;

    const r = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 到期日期 FROM dbo.檔案 WHERE id = @id`);

    // 還原時判斷原始儲存區
    const 原本到期 = r.recordset[0]?.到期日期;
    const 還原區域 = 原本到期 ? '時效區' : '永久區';

    await pool.request()
        .input('id',     sql.UniqueIdentifier, req.params.id)
        .input('區域',   sql.NVarChar, 還原區域)
        .query(`UPDATE dbo.檔案 SET 已刪除 = 0, 刪除時間 = NULL, 刪除者 = NULL,
                儲存區域 = @區域 WHERE id = @id`);

    res.json({ success: true, message: '檔案已還原' });
});

// -------------------------------------------------------
// DELETE /api/files/:id/permanent  →  永久刪除（admin only）
// -------------------------------------------------------
router.delete('/:id/permanent', verifyToken, async (req, res) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: '僅管理員或課長可永久刪除檔案' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`SELECT 實體路徑, 檔案名稱 FROM dbo.檔案 WHERE id = @id`);

    const fileRecord = result.recordset[0];
    if (fileRecord?.實體路徑 && fs.existsSync(fileRecord.實體路徑)) {
        fs.unlinkSync(fileRecord.實體路徑);
    }

    await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`DELETE FROM dbo.檔案 WHERE id = @id`);

    // 日誌
    await pool.request()
        .input('操作者',     sql.NVarChar, req.user.email)
        .input('操作者IP',   sql.NVarChar, req.ip)
        .input('目標檔案',   sql.NVarChar, fileRecord?.檔案名稱 || '')
        .input('目標檔案ID', sql.UniqueIdentifier, req.params.id)
        .query(`INSERT INTO dbo.操作日誌 (操作類型, 操作者, 操作者IP, 目標檔案, 目標檔案ID)
                VALUES (N'永久刪除', @操作者, @操作者IP, @目標檔案, @目標檔案ID)`);

    res.json({ success: true, message: '檔案已永久刪除' });
});

module.exports = router;