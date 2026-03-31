/**
 * 通用 Entity CRUD 路由
 * 對應前端 base44.entities.XXX.list/filter/get/create/update/delete
 *
 * GET    /api/entities/:entity          list/filter
 * GET    /api/entities/:entity/:id      get
 * POST   /api/entities/:entity          create
 * POST   /api/entities/:entity/bulk     bulkCreate
 * PUT    /api/entities/:entity/:id      update
 * DELETE /api/entities/:entity/:id      delete
 */
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { getPool, sql } = require("../db");
const { requireAuth } = require("../middleware/auth");

// Entity 名稱 → 資料表名稱對應
const TABLE_MAP = {
  "檔案": "檔案",
  "資料夾": "資料夾",
  "操作日誌": "操作日誌",
  "審核記錄": "審核記錄",
  "組課別設定": "組課別設定",
  "系統設定": "系統設定",
  "User": "Users",
};

// 允許的排序欄位（防止 SQL Injection）
const ALLOWED_SORT_COLS = [
  "created_date", "updated_date", "id", "排序",
  "檔案名稱", "資料夾名稱", "操作類型", "課別名稱",
];

router.use(requireAuth);

function parseSort(sort = "-created_date") {
  const desc = sort.startsWith("-");
  const col = sort.replace(/^-/, "");
  const safe = ALLOWED_SORT_COLS.includes(col) ? col : "created_date";
  return `${safe} ${desc ? "DESC" : "ASC"}`;
}

// ─── List / Filter ────────────────────────────────────────────
router.get("/:entity", async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ message: "Entity 不存在" });

  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  const order = parseSort(req.query.sort);
  const filter = req.query.filter ? JSON.parse(req.query.filter) : null;

  const pool = await getPool();
  const request = pool.request();
  let where = "";

  if (filter) {
    const conditions = Object.entries(filter).map(([key, val], i) => {
      request.input(`f${i}`, sql.NVarChar, String(val));
      return `[${key}] = @f${i}`;
    });
    where = `WHERE ${conditions.join(" AND ")}`;
  }

  const result = await request.query(
    `SELECT TOP ${limit} * FROM [${table}] ${where} ORDER BY ${order}`
  );
  res.json(result.recordset);
});

// ─── Get by ID ────────────────────────────────────────────────
router.get("/:entity/:id", async (req, res) => {
  if (req.params.id === "schema") return res.json({});
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ message: "Entity 不存在" });

  const pool = await getPool();
  const result = await pool.request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .query(`SELECT * FROM [${table}] WHERE id = @id`);

  if (!result.recordset[0]) return res.status(404).json({ message: "找不到" });
  res.json(result.recordset[0]);
});

// ─── Create ───────────────────────────────────────────────────
router.post("/:entity", async (req, res) => {
  if (req.params.id === "bulk") return; // handled below
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ message: "Entity 不存在" });

  const data = { ...req.body, id: uuidv4(), created_date: new Date(), updated_date: new Date(), created_by: req.user.email || req.user.帳號 };

  const pool = await getPool();
  const request = pool.request();
  const cols = Object.keys(data);
  const params = cols.map((c, i) => { request.input(`v${i}`, sql.NVarChar, data[c] === null ? null : String(data[c])); return `@v${i}`; });

  await request.query(
    `INSERT INTO [${table}] (${cols.map(c => `[${c}]`).join(",")}) VALUES (${params.join(",")})`
  );
  res.status(201).json({ id: data.id, ...data });
});

// ─── Bulk Create ──────────────────────────────────────────────
router.post("/:entity/bulk", async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ message: "Entity 不存在" });

  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ message: "需要陣列格式" });

  const pool = await getPool();
  const ids = [];
  for (const item of items) {
    const data = { ...item, id: uuidv4(), created_date: new Date(), updated_date: new Date(), created_by: req.user.email };
    ids.push(data.id);
    const request = pool.request();
    const cols = Object.keys(data);
    const params = cols.map((c, i) => { request.input(`v${i}`, sql.NVarChar, data[c] === null ? null : String(data[c])); return `@v${i}`; });
    await request.query(`INSERT INTO [${table}] (${cols.map(c=>`[${c}]`).join(",")}) VALUES (${params.join(",")})`);
  }
  res.status(201).json({ inserted: ids.length, ids });
});

// ─── Update ───────────────────────────────────────────────────
router.put("/:entity/:id", async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ message: "Entity 不存在" });

  const data = { ...req.body, updated_date: new Date() };
  delete data.id; delete data.created_date; delete data.created_by;

  const pool = await getPool();
  const request = pool.request();
  request.input("id", sql.NVarChar, req.params.id);
  const sets = Object.entries(data).map(([key, val], i) => {
    request.input(`v${i}`, sql.NVarChar, val === null ? null : String(val));
    return `[${key}] = @v${i}`;
  });

  await request.query(`UPDATE [${table}] SET ${sets.join(",")} WHERE id = @id`);
  res.json({ message: "已更新" });
});

// ─── Delete ───────────────────────────────────────────────────
router.delete("/:entity/:id", async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ message: "Entity 不存在" });

  const pool = await getPool();
  await pool.request()
    .input("id", sql.NVarChar, req.params.id)
    .query(`DELETE FROM [${table}] WHERE id = @id`);
  res.json({ message: "已刪除" });
});

module.exports = router;