# 雲端檔案管理系統 - Windows Server 2019 部署說明

## 系統需求

| 項目 | 版本需求 |
|------|---------|
| 作業系統 | Windows Server 2019 |
| 資料庫 | SQL Server 2019+ |
| Node.js | v18.0.0 以上 |
| IIS | 10.0（前端靜態檔案 + ARR 反向代理） |
| PM2 | 最新版（Node.js 程序管理） |
| IIS ARR | Application Request Routing（反向代理） |
| URL Rewrite | IIS URL Rewrite 模組 |

---

## 整體架構說明

```
使用者瀏覽器
     │  HTTPS 443
     ▼
   IIS 10.0
   ├─ 前端靜態檔案（dist/）      → 直接提供
   └─ /api/* 路徑                → ARR 反向代理 → Node.js :3001（僅內網）
```

- **對外只開放 443（HTTPS）**，不對外開放 3001
- Node.js API 監聽 `localhost:3001`，僅供 IIS ARR 轉發
- SSL 憑證統一由 IIS 管理

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

# 後端監聽埠號（僅供 IIS ARR 內部轉發，不對外開放）
PORT=3001

# 上傳檔案存放路徑（請確保目錄存在且有寫入權限）
UPLOAD_PATH=D:\FileStorage\uploads\
```

#### 確認後端正常啟動

後端啟動後，在**伺服器本機**瀏覽器開啟（localhost 確認用）：

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

外部可透過 HTTPS 驗證（ARR 設定完成後）：

```
https://your-domain.com/api/health
```

---

### 第三步：前端環境變數與打包

#### 設定 API 連線環境變數（build 前必做）

在**專案根目錄**建立 `.env.production` 檔案：

```env
# 使用 IIS ARR 反向代理（同源 HTTPS，前端與 API 同網域）
VITE_API_BASE=/api
```

> ⚠️ `VITE_API_BASE` 是 **build 時注入**的，修改後必須重新 build 才會生效。
> 使用 `/api` 同源路徑，讓瀏覽器自動走 HTTPS 443，不需額外指定 IP 或 port。

```bash
# 在專案根目錄執行
npm install
npm run build
# 打包結果在 dist/ 資料夾
```

#### 快速部署腳本（建議建立 deploy.bat）

Vite 打包不會自動複製 `web.config`，需手動放入 `dist/`：

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

### 第四步：IIS 設定（前端 + HTTPS + ARR 反向代理）

#### 4.1 安裝必要模組

- [URL Rewrite 模組](https://www.iis.net/downloads/microsoft/url-rewrite)
- [Application Request Routing (ARR)](https://www.iis.net/downloads/microsoft/application-request-routing)

#### 4.2 啟用 ARR Proxy

1. 開啟 **IIS 管理員** → 點選伺服器節點
2. 雙擊 **Application Request Routing Cache**
3. 右側點選 **Server Proxy Settings**
4. 勾選 **Enable proxy** → 套用

#### 4.3 設定 HTTPS 繫結（443）

1. IIS 管理員 → 新增或選擇現有網站
2. 實體路徑指向 `dist/` 資料夾
3. 設定繫結（Bindings）：
   - 類型：`https`
   - 埠號：`443`
   - SSL 憑證：選擇已匯入的憑證

> 若使用自簽憑證（內網測試），可用 IIS 自建：伺服器憑證 → 建立自我簽署憑證

#### 4.4 強制 HTTP → HTTPS 重新導向

在網站繫結中同時加入：
- 類型：`http`、埠號：`80`

然後在 `web.config` 加入 80→443 重導規則（見下方 web.config）。

#### 4.5 web.config（放入 dist/ 資料夾）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>

        <!-- 規則 1：強制 HTTP 轉 HTTPS -->
        <rule name="HTTP轉HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>

        <!-- 規則 2：/api/* 反向代理至 Node.js -->
        <rule name="API反向代理" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
        </rule>

        <!-- 規則 3：SPA React Router 支援 -->
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

### 第五步：防火牆設定

| 埠號 | 用途 | 方向 | 說明 |
|------|------|------|------|
| 443 | IIS HTTPS 前端 + API | 入站 | **對外開放** |
| 80 | HTTP（自動導向 443） | 入站 | 對外開放（重導用） |
| 3001 | Node.js API | 本機 | **僅允許 localhost，不對外** |
| 1433 | MSSQL | 本機 | 僅允許本機連線 |

```powershell
# 開放 443（PowerShell 執行）
New-NetFirewallRule -DisplayName "HTTPS 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# 開放 80（重導用）
New-NetFirewallRule -DisplayName "HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# 確認 3001 未對外開放（預設即封鎖，確認一下）
# 不需要新增 3001 入站規則
```

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
| 登入後一直轉圈 | `.env.production` 未設定或 build 前未建立 | 確認 `VITE_API_BASE=/api` 並重新 build |
| `/api/*` 回傳 404 | ARR 反向代理未啟用或 web.config 設定錯誤 | 確認 ARR Proxy 已啟用、規則順序正確 |
| 瀏覽器顯示「不安全」 | SSL 憑證未匯入或繫結未選憑證 | IIS 繫結確認選擇正確憑證 |
| HTTP 未自動跳 HTTPS | web.config 缺少重導規則 | 確認規則 1（HTTP轉HTTPS）已加入 |
| `NeedChangePassword` 欄位錯誤 | 舊版 schema 缺少欄位 | 執行第一步的補丁 SQL |
| 上傳失敗 | UPLOAD_PATH 目錄無寫入權限 | 確認 Node.js 執行帳號有該目錄存取權 |
| IIS 顯示 404 | 未安裝 URL Rewrite 或缺少 web.config | 安裝 URL Rewrite 模組並確認 web.config 存在 |
| 重開機後後端停止 | PM2 未設定開機自啟 | 執行 `pm2 startup` 和 `pm2 save` |

---

## 注意事項

- `JWT_SECRET` 請設定為複雜的隨機字串，不要使用預設值
- 資料庫密碼建議使用強密碼
- Node.js（port 3001）**不可對外開放**，僅供 IIS ARR 內部轉發
- 定期備份 MSSQL 資料庫與上傳檔案