# 雲端檔案管理系統 - Windows Server 2019 部署說明

## 系統需求

| 項目 | 版本需求 |
|------|---------|
| 作業系統 | Windows Server 2019 |
| 資料庫 | SQL Server 2019+ |
| Node.js | v18.0.0 以上 |
| IIS | 10.0（用於前端靜態檔案） |
| PM2 | 最新版（Node.js 程序管理） |

---

## 部署步驟

### 第一步：建立資料庫

1. 開啟 **SQL Server Management Studio (SSMS)**
2. 連線至您的 SQL Server 執行個體
3. 開啟 `schema.sql` 檔案
4. 執行全部 SQL 腳本
5. 確認 `FileManagement` 資料庫已建立成功

#### 建立第一個管理員帳號

資料庫建立後需手動插入第一個 admin 帳號（之後可透過使用者管理頁面新增其他人）。

**Step 1：在本機用 Node.js 產生密碼雜湊**

```bash
node -e "const b=require('bcrypt');b.hash('your_password',12).then(h=>console.log(h))"
```

> 將 `your_password` 換成真實密碼，執行後複製輸出的 `$2b$12$...` 字串

**Step 2：在 SSMS 執行以下 SQL**

```sql
USE FileManagement;
INSERT INTO dbo.使用者
    (id, UserID, email, full_name, 密碼雜湊, role, TitleLevel, 所屬組別, SortOrder, 是否啟用, NeedChangePassword)
VALUES
    (NEWID(),
     'A00001',                          -- 登入帳號（6碼員工編號）
     'admin@company.com',               -- Email
     '系統管理員',                       -- 顯示名稱
     '$2b$12$<貼上剛才產生的hash>',      -- 密碼雜湊
     'admin',                           -- 角色：admin
     '00',                              -- TitleLevel
     '00.處長室',                        -- 所屬組別
     1,                                 -- SortOrder
     1,                                 -- 是否啟用
     0);                                -- NeedChangePassword
```

#### 確認 NeedChangePassword 欄位存在

若 schema 為舊版，可能缺少此欄位，請執行補丁：

```sql
USE FileManagement;
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.使用者') AND name = 'NeedChangePassword'
)
    ALTER TABLE dbo.使用者 ADD NeedChangePassword BIT NOT NULL DEFAULT 0;
```

---

### 第二步：後端 API 伺服器

```bash
# 1. 進入 backend 資料夾
cd backend

# 2. 安裝相依套件
npm install

# 3. 複製環境變數設定
copy .env.example .env

# 4. 編輯 .env 填入正確的資料庫連線資訊
notepad .env

# 5. 安裝 PM2（全域）
npm install -g pm2

# 6. 以 PM2 啟動伺服器
pm2 start server.js --name file-management

# 7. 設定 PM2 開機自動啟動
pm2 startup
pm2 save
```

#### .env 範例

```env
# 資料庫連線
DB_SERVER=localhost
DB_NAME=FileManagement
DB_USER=sa
DB_PASSWORD=your_strong_password
DB_PORT=1433

# JWT 金鑰（請換成複雜隨機字串）
JWT_SECRET=請換成至少32字元的隨機字串例如abc123xyz789...

# 後端監聽埠號
PORT=3001

# 上傳檔案存放路徑（請確保目錄存在且有寫入權限）
UPLOAD_PATH=D:\FileStorage\uploads\
```

#### 確認資料庫連線正常

啟動後端後，瀏覽器開啟（視 PORT 而定）：

```
http://localhost:3001/api/health
```

若回傳如下 JSON，代表後端與資料庫均正常：

```json
{ "ok": true, "db_time": "2026-04-16T08:00:00.000Z" }
```

> 若要加入此端點，在 `server.js` 加上：
> ```js
> app.get('/api/health', async (req, res) => {
>   const { poolPromise } = require('./db');
>   const pool = await poolPromise;
>   const result = await pool.request().query('SELECT GETDATE() AS now');
>   res.json({ ok: true, db_time: result.recordset[0].now });
> });
> ```

---

### 第三步：前端環境變數與打包

#### 設定 API 連線環境變數（build 前必做）

在**專案根目錄**建立 `.env.production` 檔案，內容擇一填入：

```env
# 方案 A（建議）：IIS ARR 反向代理，前端與 API 同源
VITE_API_BASE=/api

# 方案 B：直接指定後端 IP（不用反向代理）
# VITE_API_BASE=http://192.168.1.100:3001/api

# 方案 C：有網域且啟用 HTTPS
# VITE_API_BASE=https://files.company.com/api
```

> ⚠️ `VITE_API_BASE` 是 **build 時注入**的，修改後必須重新 build 才會生效。

```bash
# 在專案根目錄執行
npm install
npm run build
# 打包結果在 dist/ 資料夾
```

#### 手動補入必要設定檔（建議建立 deploy.bat）

Vite 打包不會自動複製 `web.config` 和 `manifest.json`，需手動放入 `dist/`：

```bat
@echo off
REM deploy.bat - 放在專案根目錄

echo [1/3] 打包前端...
call npm run build

echo [2/3] 複製 web.config...
copy /Y web.config dist\web.config

echo [3/3] 複製 manifest.json...
copy /Y public\manifest.json dist\manifest.json

echo 完成！請將 dist\ 資料夾內容複製到 IIS 網站實體路徑。
pause
```

---

### 第四步：IIS 設定（前端）

1. 開啟 **IIS 管理員**
2. 新增網站，實體路徑指向 `dist/` 資料夾
3. 設定繫結（Binding）：埠號建議 `80` 或 `443`（HTTPS）
4. 安裝 **URL Rewrite 模組**（支援 React Router）
5. 在 `dist/` 資料夾新增 `web.config`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA路由支援" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

### 第五步：前端 API 連線設定

修改前端的 `api/apiClient.js`，將 Base URL 改為本機 API 伺服器：

```javascript
// 範例：同主機不同埠號
const API_BASE_URL = 'http://localhost:3001/api';

// 範例：區網 IP
const API_BASE_URL = 'http://192.168.1.100:3001/api';

// 範例：有對應網域名稱
const API_BASE_URL = 'https://files.company.com/api';
```

---

### 第六步：防火牆設定

| 埠號 | 用途 | 方向 |
|------|------|------|
| 80 / 443 | IIS 前端網站 | 入站 |
| 3001 | Node.js API（建議僅允許內網） | 入站 |
| 1433 | MSSQL（建議僅允許本機） | 本機 |

---

## 檔案儲存位置

上傳的檔案存放於 `.env` 中設定的 `UPLOAD_PATH`，例如：

```
D:\FileStorage\uploads\
```

請確保：
- 磁碟空間充足
- 定期備份此資料夾
- Node.js 程序對此資料夾有讀寫權限

---

## 常用 PM2 指令

```bash
pm2 list                          # 查看執行中的程序
pm2 logs file-management          # 查看日誌
pm2 restart file-management       # 重新啟動
pm2 stop file-management          # 停止
pm2 monit                         # 即時監控
```

---

## 常見問題排查

| 症狀 | 可能原因 | 解決方式 |
|------|---------|---------|
| 登入後一直轉圈 | API Base URL 設定錯誤 | 檢查 `apiClient.js` 的 URL |
| `NeedChangePassword` 欄位錯誤 | 舊版 schema 缺少欄位 | 執行第一步的補丁 SQL |
| 上傳失敗 | UPLOAD_PATH 目錄無寫入權限 | 確認 Node.js 執行帳號有該目錄存取權 |
| IIS 顯示 404 | 未安裝 URL Rewrite 或缺少 web.config | 安裝 URL Rewrite 模組並確認 web.config 存在 |
| `/api/health` 無回應 | 後端未啟動或 PORT 被佔用 | 執行 `pm2 logs` 確認錯誤訊息 |
| 重開機後後端停止 | PM2 未設定開機自啟 | 執行 `pm2 startup` 和 `pm2 save` |

---

## 注意事項

- `JWT_SECRET` 請設定為複雜的隨機字串，不要使用預設值
- 資料庫密碼建議使用強密碼
- 建議啟用 HTTPS（SSL 憑證）
- 定期備份 MSSQL 資料庫與上傳檔案