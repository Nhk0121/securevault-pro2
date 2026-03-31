/**
 * 使用者管理路由（管理員專用）
 *
 * GET    /api/使用者管理           列出所有使用者
 * POST   /api/使用者管理           新建使用者
 * PUT    /api/使用者管理/:識別碼   更新使用者資料
 * DELETE /api/使用者管理/:識別碼   停用使用者帳號
 */
const router = require("express").Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { 取得連線池, sql } = require("../db");
const { 驗證登入, 僅限管理員 } = require("../middleware/auth");

router.use(驗證登入, 僅限管理員);

// ─── 列出所有使用者 ───────────────────────────────────────────
router.get("/", async (req, res) => {
  const pool = await 取得連線池();
  const 結果 = await pool.request().query(`
    SELECT 識別碼, 帳號, 電子信箱, 顯示名稱, 角色,
           姓名代號, 所屬組別, 所屬課別, 聯絡電話, 辦公室分機,
           資訊人員IP白名單, 廠商公司名稱, 外包負責部門,
           首次登入須改密碼, 帳號停用, 建立時間, 更新時間
    FROM 使用者
    ORDER BY 建立時間 DESC
  `);
  res.json(結果.recordset);
});

// ─── 新建使用者 ───────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    帳號, 電子信箱, 顯示名稱, 角色,
    姓名代號, 所屬組別, 所屬課別, 聯絡電話, 辦公室分機,
    資訊人員IP白名單, 廠商公司名稱, 外包負責部門
  } = req.body;

  if (!帳號 || !電子信箱) return res.status(400).json({ 訊息: "帳號與電子信箱為必填" });

  // 預設密碼 = 帳號，首次登入強制變更
  const 密碼雜湊 = await bcrypt.hash(帳號, 12);
  const 識別碼 = uuidv4();
  const pool = await 取得連線池();

  await pool.request()
    .input("識別碼", sql.UniqueIdentifier, 識別碼)
    .input("帳號", sql.NVarChar, 帳號.trim())
    .input("電子信箱", sql.NVarChar, 電子信箱.trim())
    .input("顯示名稱", sql.NVarChar, 顯示名稱 || "")
    .input("角色", sql.NVarChar, 角色 || "一般使用者")
    .input("姓名代號", sql.NVarChar, 姓名代號 || "")
    .input("所屬組別", sql.NVarChar, 所屬組別 || "")
    .input("所屬課別", sql.NVarChar, 所屬課別 || "")
    .input("聯絡電話", sql.NVarChar, 聯絡電話 || "")
    .input("辦公室分機", sql.NVarChar, 辦公室分機 || "")
    .input("資訊人員IP白名單", sql.NVarChar, 資訊人員IP白名單 || "")
    .input("廠商公司名稱", sql.NVarChar, 廠商公司名稱 || "")
    .input("外包負責部門", sql.NVarChar, 外包負責部門 || "")
    .input("密碼雜湊", sql.NVarChar, 密碼雜湊)
    .query(`
      INSERT INTO 使用者
        (識別碼, 帳號, 電子信箱, 顯示名稱, 角色, 姓名代號, 所屬組別, 所屬課別,
         聯絡電話, 辦公室分機, 資訊人員IP白名單, 廠商公司名稱, 外包負責部門,
         密碼雜湊, 首次登入須改密碼, 帳號停用, 建立時間, 更新時間)
      VALUES
        (@識別碼, @帳號, @電子信箱, @顯示名稱, @角色, @姓名代號, @所屬組別, @所屬課別,
         @聯絡電話, @辦公室分機, @資訊人員IP白名單, @廠商公司名稱, @外包負責部門,
         @密碼雜湊, 1, 0, GETDATE(), GETDATE())
    `);

  res.status(201).json({ 訊息: `使用者「${帳號}」建立成功，預設密碼為帳號，首次登入須強制變更` });
});

// ─── 更新使用者資料 ───────────────────────────────────────────
router.put("/:識別碼", async (req, res) => {
  const {
    角色, 顯示名稱, 姓名代號, 所屬組別, 所屬課別,
    聯絡電話, 辦公室分機, 資訊人員IP白名單,
    廠商公司名稱, 外包負責部門, 帳號停用
  } = req.body;
  const pool = await 取得連線池();
  await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.params.識別碼)
    .input("角色", sql.NVarChar, 角色 || "一般使用者")
    .input("顯示名稱", sql.NVarChar, 顯示名稱 || "")
    .input("姓名代號", sql.NVarChar, 姓名代號 || "")
    .input("所屬組別", sql.NVarChar, 所屬組別 || "")
    .input("所屬課別", sql.NVarChar, 所屬課別 || "")
    .input("聯絡電話", sql.NVarChar, 聯絡電話 || "")
    .input("辦公室分機", sql.NVarChar, 辦公室分機 || "")
    .input("資訊人員IP白名單", sql.NVarChar, 資訊人員IP白名單 || "")
    .input("廠商公司名稱", sql.NVarChar, 廠商公司名稱 || "")
    .input("外包負責部門", sql.NVarChar, 外包負責部門 || "")
    .input("帳號停用", sql.Bit, 帳號停用 ? 1 : 0)
    .query(`
      UPDATE 使用者 SET
        角色=@角色, 顯示名稱=@顯示名稱, 姓名代號=@姓名代號,
        所屬組別=@所屬組別, 所屬課別=@所屬課別, 聯絡電話=@聯絡電話,
        辦公室分機=@辦公室分機, 資訊人員IP白名單=@資訊人員IP白名單,
        廠商公司名稱=@廠商公司名稱, 外包負責部門=@外包負責部門,
        帳號停用=@帳號停用, 更新時間=GETDATE()
      WHERE 識別碼=@識別碼
    `);
  res.json({ 訊息: "使用者資料已更新" });
});

// ─── 停用使用者（軟刪除，不實際移除資料） ────────────────────
router.delete("/:識別碼", async (req, res) => {
  const pool = await 取得連線池();
  await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.params.識別碼)
    .query("UPDATE 使用者 SET 帳號停用=1, 更新時間=GETDATE() WHERE 識別碼=@識別碼");
  res.json({ 訊息: "帳號已停用" });
});

module.exports = router;