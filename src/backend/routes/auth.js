/**
 * 認證路由
 *
 * POST /api/認證/登入
 * GET  /api/認證/目前使用者
 * PUT  /api/認證/目前使用者
 * POST /api/認證/變更密碼
 * POST /api/認證/重置密碼/:使用者識別碼   （管理員專用）
 */
const router = require("express").Router();
const bcrypt = require("bcrypt");
const { 取得連線池, sql } = require("../db");
const { 驗證登入, 僅限管理員, 產生Token } = require("../middleware/auth");

// ─── 登入 ─────────────────────────────────────────────────────
router.post("/登入", async (req, res) => {
  const { 帳號, 密碼 } = req.body;
  if (!帳號 || !密碼) return res.status(400).json({ 訊息: "帳號與密碼不得為空" });

  const pool = await 取得連線池();
  const 結果 = await pool.request()
    .input("帳號", sql.NVarChar, 帳號.trim())
    .query("SELECT * FROM 使用者 WHERE 帳號 = @帳號 AND 帳號停用 = 0");

  const 使用者 = 結果.recordset[0];
  if (!使用者) return res.status(401).json({ 訊息: "帳號或密碼錯誤" });

  const 密碼正確 = await bcrypt.compare(密碼, 使用者.密碼雜湊);
  if (!密碼正確) return res.status(401).json({ 訊息: "帳號或密碼錯誤" });

  // 記錄登入日誌
  await pool.request()
    .input("操作類型", sql.NVarChar, "登入")
    .input("操作者帳號", sql.NVarChar, 使用者.帳號)
    .input("操作者IP", sql.NVarChar, req.ip)
    .input("操作詳細說明", sql.NVarChar, `使用者 ${使用者.帳號} 登入系統`)
    .query(`INSERT INTO 操作日誌 (操作類型, 操作者帳號, 操作者IP, 操作詳細說明, 是否為異常操作, 建立時間)
            VALUES (@操作類型, @操作者帳號, @操作者IP, @操作詳細說明, 0, GETDATE())`);

  const token = 產生Token(使用者);
  res.json({ token, 使用者: 過濾敏感欄位(使用者) });
});

// ─── 取得目前使用者資料 ───────────────────────────────────────
router.get("/目前使用者", 驗證登入, async (req, res) => {
  const pool = await 取得連線池();
  const 結果 = await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.使用者.識別碼)
    .query("SELECT * FROM 使用者 WHERE 識別碼 = @識別碼");
  const 使用者 = 結果.recordset[0];
  if (!使用者) return res.status(404).json({ 訊息: "使用者不存在" });
  res.json(過濾敏感欄位(使用者));
});

// ─── 更新自己的基本資料 ───────────────────────────────────────
router.put("/目前使用者", 驗證登入, async (req, res) => {
  const { 姓名代號, 聯絡電話, 辦公室分機 } = req.body;
  const pool = await 取得連線池();
  await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.使用者.識別碼)
    .input("姓名代號", sql.NVarChar, 姓名代號 || "")
    .input("聯絡電話", sql.NVarChar, 聯絡電話 || "")
    .input("辦公室分機", sql.NVarChar, 辦公室分機 || "")
    .query(`UPDATE 使用者 SET 姓名代號=@姓名代號, 聯絡電話=@聯絡電話, 辦公室分機=@辦公室分機,
            更新時間=GETDATE() WHERE 識別碼=@識別碼`);
  res.json({ 訊息: "資料已更新" });
});

// ─── 自行變更密碼 ─────────────────────────────────────────────
router.post("/變更密碼", 驗證登入, async (req, res) => {
  const { 目前密碼, 新密碼 } = req.body;
  if (!目前密碼 || !新密碼) return res.status(400).json({ 訊息: "欄位不得為空" });
  if (新密碼.length < 8) return res.status(400).json({ 訊息: "新密碼至少需要 8 個字元" });

  const pool = await 取得連線池();
  const 結果 = await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.使用者.識別碼)
    .query("SELECT 密碼雜湊 FROM 使用者 WHERE 識別碼 = @識別碼");

  const 使用者 = 結果.recordset[0];
  const 密碼正確 = await bcrypt.compare(目前密碼, 使用者.密碼雜湊);
  if (!密碼正確) return res.status(400).json({ 訊息: "目前密碼錯誤" });

  const 新雜湊 = await bcrypt.hash(新密碼, 12);
  await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.使用者.識別碼)
    .input("新雜湊", sql.NVarChar, 新雜湊)
    .query("UPDATE 使用者 SET 密碼雜湊=@新雜湊, 首次登入須改密碼=0, 更新時間=GETDATE() WHERE 識別碼=@識別碼");

  res.json({ 訊息: "密碼已成功變更" });
});

// ─── 管理員重置密碼（重置為帳號，強制下次登入變更） ──────────
router.post("/重置密碼/:使用者識別碼", 驗證登入, 僅限管理員, async (req, res) => {
  const pool = await 取得連線池();
  const 結果 = await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.params.使用者識別碼)
    .query("SELECT 帳號 FROM 使用者 WHERE 識別碼 = @識別碼");

  const 目標 = 結果.recordset[0];
  if (!目標) return res.status(404).json({ 訊息: "使用者不存在" });

  const 新雜湊 = await bcrypt.hash(目標.帳號, 12);
  await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.params.使用者識別碼)
    .input("新雜湊", sql.NVarChar, 新雜湊)
    .query("UPDATE 使用者 SET 密碼雜湊=@新雜湊, 首次登入須改密碼=1, 更新時間=GETDATE() WHERE 識別碼=@識別碼");

  // 記錄操作日誌
  await pool.request()
    .input("操作類型", sql.NVarChar, "重置密碼")
    .input("操作者帳號", sql.NVarChar, req.使用者.帳號)
    .input("操作者IP", sql.NVarChar, req.ip)
    .input("操作詳細說明", sql.NVarChar, `管理員重置使用者「${目標.帳號}」的密碼為帳號，下次登入須強制變更`)
    .query(`INSERT INTO 操作日誌 (操作類型, 操作者帳號, 操作者IP, 操作詳細說明, 是否為異常操作, 建立時間)
            VALUES (@操作類型, @操作者帳號, @操作者IP, @操作詳細說明, 0, GETDATE())`);

  res.json({ 訊息: `已重置「${目標.帳號}」的密碼，下次登入須強制變更` });
});

// 移除敏感欄位
function 過濾敏感欄位(使用者) {
  const { 密碼雜湊, ...安全資料 } = 使用者;
  return 安全資料;
}

module.exports = router;