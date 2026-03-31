/**
 * MSSQL 連線池
 */
const sql = require("mssql");

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "YourPassword",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "FileManagement",
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: false,          // 若使用 SSL 改為 true
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log("[DB] MSSQL 連線成功");
  }
  return pool;
}

module.exports = { getPool, sql };