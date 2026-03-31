/**
 * 通用實體 CRUD 路由
 * 對應前端 base44.entities.XXX.list/filter/get/create/update/delete
 *
 * GET    /api/資料/:實體名稱               列出 / 篩選
 * GET    /api/資料/:實體名稱/:識別碼        取得單筆
 * POST   /api/資料/:實體名稱               新增
 * POST   /api/資料/:實體名稱/批次新增       批次新增
 * PUT    /api/資料/:實體名稱/:識別碼        更新
 * DELETE /api/資料/:實體名稱/:識別碼        刪除
 */
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { 取得連線池, sql } = require("../db");
const { 驗證登入 } = require("../middleware/auth");

// 前端實體名稱 → 資料庫資料表名稱對應表
const 實體對應表 = {
  "檔案":     "檔案",
  "資料夾":   "資料夾",
  "操作日誌": "操作日誌",
  "審核記錄": "審核記錄",
  "組課別設定":"組課別設定",
  "系統設定": "系統設定",
  "User":     "使用者",         // 相容前端 User entity 呼叫
  "使用者":   "使用者",
};

// 允許排序的欄位白名單（防止 SQL Injection）
const 允許排序欄位 = [
  "建立時間", "更新時間", "識別碼",
  "排列順序", "檔案名稱", "資料夾名稱",
  "操作類型", "課別名稱",
  // 相容舊欄位名（移機前的 Base44 資料）
  "created_date", "updated_date", "id", "排序",
];

router.use(驗證登入);

function 解析排序(排序字串 = "-建立時間") {
  const 降冪 = 排序字串.startsWith("-");
  const 欄位 = 排序字串.replace(/^-/, "");
  const 安全欄位 = 允許排序欄位.includes(欄位) ? 欄位 : "建立時間";
  return `[${安全欄位}] ${降冪 ? "DESC" : "ASC"}`;
}

// ─── 列出 / 篩選 ──────────────────────────────────────────────
router.get("/:實體名稱", async (req, res) => {
  const 資料表 = 實體對應表[req.params.實體名稱];
  if (!資料表) return res.status(404).json({ 訊息: `實體「${req.params.實體名稱}」不存在` });

  const 筆數上限 = Math.min(parseInt(req.query.limit) || 100, 1000);
  const 排序 = 解析排序(req.query.sort);
  const 篩選條件 = req.query.filter ? JSON.parse(req.query.filter) : null;

  const pool = await 取得連線池();
  const 請求 = pool.request();
  let 條件子句 = "";

  if (篩選條件) {
    const 條件陣列 = Object.entries(篩選條件).map(([欄位, 值], 索引) => {
      請求.input(`篩選${索引}`, sql.NVarChar, String(值));
      return `[${欄位}] = @篩選${索引}`;
    });
    條件子句 = `WHERE ${條件陣列.join(" AND ")}`;
  }

  const 結果 = await 請求.query(
    `SELECT TOP ${筆數上限} * FROM [${資料表}] ${條件子句} ORDER BY ${排序}`
  );
  res.json(結果.recordset);
});

// ─── 取得單筆 ─────────────────────────────────────────────────
router.get("/:實體名稱/:識別碼", async (req, res) => {
  if (req.params.識別碼 === "schema") return res.json({});
  const 資料表 = 實體對應表[req.params.實體名稱];
  if (!資料表) return res.status(404).json({ 訊息: `實體「${req.params.實體名稱}」不存在` });

  const pool = await 取得連線池();
  const 結果 = await pool.request()
    .input("識別碼", sql.UniqueIdentifier, req.params.識別碼)
    .query(`SELECT * FROM [${資料表}] WHERE 識別碼 = @識別碼`);

  if (!結果.recordset[0]) return res.status(404).json({ 訊息: "找不到此筆資料" });
  res.json(結果.recordset[0]);
});

// ─── 新增單筆 ─────────────────────────────────────────────────
router.post("/:實體名稱", async (req, res) => {
  const 資料表 = 實體對應表[req.params.實體名稱];
  if (!資料表) return res.status(404).json({ 訊息: `實體「${req.params.實體名稱}」不存在` });

  const 資料 = {
    ...req.body,
    識別碼: uuidv4(),
    建立時間: new Date(),
    更新時間: new Date(),
    建立者: req.使用者?.帳號 || req.使用者?.電子信箱 || "",
  };

  const pool = await 取得連線池();
  const 請求 = pool.request();
  const 欄位清單 = Object.keys(資料);
  const 參數清單 = 欄位清單.map((欄位, 索引) => {
    請求.input(`值${索引}`, sql.NVarChar, 資料[欄位] === null ? null : String(資料[欄位]));
    return `@值${索引}`;
  });

  await 請求.query(
    `INSERT INTO [${資料表}] (${欄位清單.map(c => `[${c}]`).join(",")})
     VALUES (${參數清單.join(",")})`
  );
  res.status(201).json({ 識別碼: 資料.識別碼, ...資料 });
});

// ─── 批次新增 ─────────────────────────────────────────────────
router.post("/:實體名稱/批次新增", async (req, res) => {
  const 資料表 = 實體對應表[req.params.實體名稱];
  if (!資料表) return res.status(404).json({ 訊息: `實體「${req.params.實體名稱}」不存在` });

  const 項目陣列 = req.body;
  if (!Array.isArray(項目陣列)) return res.status(400).json({ 訊息: "請傳入陣列格式的資料" });

  const pool = await 取得連線池();
  const 識別碼清單 = [];

  for (const 項目 of 項目陣列) {
    const 資料 = {
      ...項目,
      識別碼: uuidv4(),
      建立時間: new Date(),
      更新時間: new Date(),
      建立者: req.使用者?.帳號 || "",
    };
    識別碼清單.push(資料.識別碼);

    const 請求 = pool.request();
    const 欄位清單 = Object.keys(資料);
    const 參數清單 = 欄位清單.map((欄位, 索引) => {
      請求.input(`值${索引}`, sql.NVarChar, 資料[欄位] === null ? null : String(資料[欄位]));
      return `@值${索引}`;
    });
    await 請求.query(
      `INSERT INTO [${資料表}] (${欄位清單.map(c => `[${c}]`).join(",")})
       VALUES (${參數清單.join(",")})`
    );
  }

  res.status(201).json({ 新增筆數: 識別碼清單.length, 識別碼清單 });
});

// ─── 更新 ─────────────────────────────────────────────────────
router.put("/:實體名稱/:識別碼", async (req, res) => {
  const 資料表 = 實體對應表[req.params.實體名稱];
  if (!資料表) return res.status(404).json({ 訊息: `實體「${req.params.實體名稱}」不存在` });

  const 資料 = { ...req.body, 更新時間: new Date() };
  delete 資料.識別碼;
  delete 資料.建立時間;
  delete 資料.建立者;

  const pool = await 取得連線池();
  const 請求 = pool.request();
  請求.input("識別碼", sql.NVarChar, req.params.識別碼);

  const 更新子句 = Object.entries(資料).map(([欄位, 值], 索引) => {
    請求.input(`值${索引}`, sql.NVarChar, 值 === null ? null : String(值));
    return `[${欄位}] = @值${索引}`;
  });

  await 請求.query(`UPDATE [${資料表}] SET ${更新子句.join(",")} WHERE 識別碼 = @識別碼`);
  res.json({ 訊息: "已更新" });
});

// ─── 刪除 ─────────────────────────────────────────────────────
router.delete("/:實體名稱/:識別碼", async (req, res) => {
  const 資料表 = 實體對應表[req.params.實體名稱];
  if (!資料表) return res.status(404).json({ 訊息: `實體「${req.params.實體名稱}」不存在` });

  const pool = await 取得連線池();
  await pool.request()
    .input("識別碼", sql.NVarChar, req.params.識別碼)
    .query(`DELETE FROM [${資料表}] WHERE 識別碼 = @識別碼`);
  res.json({ 訊息: "已刪除" });
});

module.exports = router;