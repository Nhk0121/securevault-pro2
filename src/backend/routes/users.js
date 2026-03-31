/**
 * 使用者管理路由（管理員）
 * GET    /api/users           列出所有使用者
 * POST   /api/users           新建使用者
 * PUT    /api/users/:id       更新使用者
 * DELETE /api/users/:id       刪除使用者
 */
const router = require("express").Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { getPool, sql } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);

// ─── 列出所有使用者 ───────────────────────────────────────────
router.get("/", async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .query("SELECT id, 帳號, email, full_name, role, 姓名代號, 所屬組別, 所屬課別, 電話, 分機, 資訊人員IP, mustChangePassword, 停用, created_date, updated_date FROM Users ORDER BY created_date DESC");
  res.json(result.recordset);
});

// ─── 新建使用者 ───────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { 帳號, email, full_name, role, 姓名代號, 所屬組別, 所屬課別, 電話, 分機, 資訊人員IP } = req.body;
  if (!帳號 || !email) return res.status(400).json({ message: "帳號與信箱為必填" });

  // 預設密碼 = 帳號，且強制首次登入須變更
  const 密碼Hash = await bcrypt.hash(帳號, 12);
  const id = uuidv4();
  const pool = await getPool();

  await pool.request()
    .input("id", sql.UniqueIdentifier, id)
    .input("帳號", sql.NVarChar, 帳號.trim())
    .input("email", sql.NVarChar, email.trim())
    .input("full_name", sql.NVarChar, full_name || "")
    .input("role", sql.NVarChar, role || "user")
    .input("姓名代號", sql.NVarChar, 姓名代號 || "")
    .input("所屬組別", sql.NVarChar, 所屬組別 || "")
    .input("所屬課別", sql.NVarChar, 所屬課別 || "")
    .input("電話", sql.NVarChar, 電話 || "")
    .input("分機", sql.NVarChar, 分機 || "")
    .input("資訊人員IP", sql.NVarChar, 資訊人員IP || "")
    .input("密碼Hash", sql.NVarChar, 密碼Hash)
    .query(`INSERT INTO Users (id, 帳號, email, full_name, role, 姓名代號, 所屬組別, 所屬課別, 電話, 分機, 資訊人員IP, 密碼Hash, mustChangePassword, 停用, created_date, updated_date)
            VALUES (@id, @帳號, @email, @full_name, @role, @姓名代號, @所屬組別, @所屬課別, @電話, @分機, @資訊人員IP, @密碼Hash, 1, 0, GETDATE(), GETDATE())`);

  res.status(201).json({ message: `使用者 ${帳號} 建立成功，預設密碼為帳號，首次登入須變更` });
});

// ─── 更新使用者 ───────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { role, full_name, 姓名代號, 所屬組別, 所屬課別, 電話, 分機, 資訊人員IP, 停用 } = req.body;
  const pool = await getPool();
  await pool.request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .input("role", sql.NVarChar, role || "user")
    .input("full_name", sql.NVarChar, full_name || "")
    .input("姓名代號", sql.NVarChar, 姓名代號 || "")
    .input("所屬組別", sql.NVarChar, 所屬組別 || "")
    .input("所屬課別", sql.NVarChar, 所屬課別 || "")
    .input("電話", sql.NVarChar, 電話 || "")
    .input("分機", sql.NVarChar, 分機 || "")
    .input("資訊人員IP", sql.NVarChar, 資訊人員IP || "")
    .input("停用", sql.Bit, 停用 ? 1 : 0)
    .query(`UPDATE Users SET role=@role, full_name=@full_name, 姓名代號=@姓名代號,
            所屬組別=@所屬組別, 所屬課別=@所屬課別, 電話=@電話, 分機=@分機,
            資訊人員IP=@資訊人員IP, 停用=@停用, updated_date=GETDATE() WHERE id=@id`);
  res.json({ message: "已更新" });
});

// ─── 刪除使用者（停用，不實際刪除） ──────────────────────────
router.delete("/:id", async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .query("UPDATE Users SET 停用=1, updated_date=GETDATE() WHERE id=@id");
  res.json({ message: "已停用" });
});

module.exports = router;