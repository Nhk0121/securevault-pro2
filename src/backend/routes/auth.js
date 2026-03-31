/**
 * 認證路由
 * POST /api/auth/login
 * GET  /api/auth/me
 * PUT  /api/auth/me
 * POST /api/auth/change-password
 * POST /api/auth/reset-password/:userId  (管理員)
 */
const router = require("express").Router();
const bcrypt = require("bcrypt");
const { getPool, sql } = require("../db");
const { requireAuth, requireAdmin, signToken } = require("../middleware/auth");

// ─── 登入 ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { 帳號, 密碼 } = req.body;
  if (!帳號 || !密碼) return res.status(400).json({ message: "帳號密碼不得為空" });

  const pool = await getPool();
  const result = await pool.request()
    .input("帳號", sql.NVarChar, 帳號.trim())
    .query("SELECT * FROM Users WHERE 帳號 = @帳號 AND 停用 = 0");

  const user = result.recordset[0];
  if (!user) return res.status(401).json({ message: "帳號或密碼錯誤" });

  const match = await bcrypt.compare(密碼, user.密碼Hash);
  if (!match) return res.status(401).json({ message: "帳號或密碼錯誤" });

  // 記錄登入日誌
  await pool.request()
    .input("操作類型", sql.NVarChar, "登入")
    .input("操作者", sql.NVarChar, user.email || user.帳號)
    .input("操作者IP", sql.NVarChar, req.ip)
    .input("詳細內容", sql.NVarChar, `使用者 ${user.帳號} 登入系統`)
    .query(`INSERT INTO 操作日誌 (操作類型, 操作者, 操作者IP, 詳細內容, 是否異常, created_date)
            VALUES (@操作類型, @操作者, @操作者IP, @詳細內容, 0, GETDATE())`);

  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

// ─── 取得目前使用者 ───────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("id", sql.UniqueIdentifier, req.user.id)
    .query("SELECT * FROM Users WHERE id = @id");
  const user = result.recordset[0];
  if (!user) return res.status(404).json({ message: "使用者不存在" });
  res.json(sanitize(user));
});

// ─── 更新自己的資料 ───────────────────────────────────────────
router.put("/me", requireAuth, async (req, res) => {
  const { 姓名代號, 電話, 分機 } = req.body;
  const pool = await getPool();
  await pool.request()
    .input("id", sql.UniqueIdentifier, req.user.id)
    .input("姓名代號", sql.NVarChar, 姓名代號 || "")
    .input("電話", sql.NVarChar, 電話 || "")
    .input("分機", sql.NVarChar, 分機 || "")
    .query(`UPDATE Users SET 姓名代號=@姓名代號, 電話=@電話, 分機=@分機, updated_date=GETDATE()
            WHERE id=@id`);
  res.json({ message: "已更新" });
});

// ─── 自行修改密碼 ─────────────────────────────────────────────
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "欄位不得為空" });
  if (newPassword.length < 8) return res.status(400).json({ message: "新密碼至少需要 8 個字元" });

  const pool = await getPool();
  const result = await pool.request()
    .input("id", sql.UniqueIdentifier, req.user.id)
    .query("SELECT 密碼Hash FROM Users WHERE id = @id");

  const user = result.recordset[0];
  const match = await bcrypt.compare(currentPassword, user.密碼Hash);
  if (!match) return res.status(400).json({ message: "目前密碼錯誤" });

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.request()
    .input("id", sql.UniqueIdentifier, req.user.id)
    .input("hash", sql.NVarChar, newHash)
    .query("UPDATE Users SET 密碼Hash=@hash, mustChangePassword=0, updated_date=GETDATE() WHERE id=@id");

  res.json({ message: "密碼已更新" });
});

// ─── 管理員重置密碼（重置為帳號） ────────────────────────────
router.post("/reset-password/:userId", requireAuth, requireAdmin, async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("id", sql.UniqueIdentifier, req.params.userId)
    .query("SELECT 帳號 FROM Users WHERE id = @id");

  const target = result.recordset[0];
  if (!target) return res.status(404).json({ message: "使用者不存在" });

  // 重置密碼 = 帳號
  const newHash = await bcrypt.hash(target.帳號, 12);
  await pool.request()
    .input("id", sql.UniqueIdentifier, req.params.userId)
    .input("hash", sql.NVarChar, newHash)
    .query("UPDATE Users SET 密碼Hash=@hash, mustChangePassword=1, updated_date=GETDATE() WHERE id=@id");

  // 記錄日誌
  await pool.request()
    .input("操作類型", sql.NVarChar, "重置密碼")
    .input("操作者", sql.NVarChar, req.user.email || req.user.帳號)
    .input("操作者IP", sql.NVarChar, req.ip)
    .input("詳細內容", sql.NVarChar, `管理員重置使用者 ${target.帳號} 的密碼`)
    .query(`INSERT INTO 操作日誌 (操作類型, 操作者, 操作者IP, 詳細內容, 是否異常, created_date)
            VALUES (@操作類型, @操作者, @操作者IP, @詳細內容, 0, GETDATE())`);

  res.json({ message: `已重置 ${target.帳號} 的密碼為帳號，登入後須強制變更` });
});

function sanitize(u) {
  const { 密碼Hash, ...rest } = u;
  return rest;
}

module.exports = router;