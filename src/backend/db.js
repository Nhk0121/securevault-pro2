/**
 * MSSQL 連線池設定
 * 資料庫名稱：檔案管理系統
 */
const sql = require("mssql");

const 連線設定 = {
  user: process.env.資料庫帳號 || process.env.DB_USER || "sa",
  password: process.env.資料庫密碼 || process.env.DB_PASSWORD || "YourPassword",
  server: process.env.資料庫主機 || process.env.DB_SERVER || "localhost",
  database: process.env.資料庫名稱 || process.env.DB_NAME || "檔案管理系統",
  port: parseInt(process.env.資料庫埠號 || process.env.DB_PORT || "1433"),
  options: {
    encrypt: false,               // 若使用 SSL 加密連線請改為 true
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 20,                      // 最大連線數
    min: 2,                       // 最小連線數
    idleTimeoutMillis: 30000,     // 閒置逾時（毫秒）
  },
};

let 連線池 = null;

async function 取得連線池() {
  if (!連線池) {
    連線池 = await sql.connect(連線設定);
    console.log("[資料庫] MSSQL 連線成功");
  }
  return 連線池;
}

module.exports = { 取得連線池, sql };