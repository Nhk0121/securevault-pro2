/* eslint-disable */
// ============================================================
// 資料庫連線設定 - MSSQL
// ============================================================

const sql = require('mssql');

const dbConfig = {
    server:   process.env.DB_SERVER   || 'localhost',       // MSSQL 伺服器位址
    port:     parseInt(process.env.DB_PORT) || 1433,        // MSSQL 預設埠號
    database: process.env.DB_NAME     || 'FileManagement',  // 資料庫名稱
    user:     process.env.DB_USER     || 'sa',              // 資料庫帳號
    password: process.env.DB_PASSWORD || '',                // 資料庫密碼
    options: {
        encrypt:                false,  // 內部網路通常不需加密
        trustServerCertificate: true,   // 信任自簽憑證
        enableArithAbort:       true,
    },
    pool: {
        max:              10,   // 最大連線數
        min:              2,    // 最小連線數
        idleTimeoutMillis: 30000
    }
};

// 建立連線池
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ 資料庫連線成功');
        return pool;
    })
    .catch(err => {
        console.error('❌ 資料庫連線失敗：', err.message);
        process.exit(1);
    });

module.exports = { sql, poolPromise };