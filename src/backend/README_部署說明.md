# 雲端檔案管理系統 - WinServer 2019 部署說明

## 環境需求

| 項目 | 版本 |
|------|------|
| Windows Server | 2019 |
| Node.js | 20 LTS（[下載](https://nodejs.org/)） |
| SQL Server | 2019 / Express |
| IIS | 10（選用，也可直接用 Node） |

---

## 步驟一：建立 MSSQL 資料庫

1. 開啟 SQL Server Management Studio (SSMS)
2. 建立資料庫：`CREATE DATABASE FileManagement;`
3. 執行 `schema.sql`（選擇 FileManagement 後執行）
4. 預設管理員帳號：`admin`，密碼：`admin`（首次登入須強制變更）

---

## 步驟二：設定後端

```powershell
cd backend
copy .env.example .env
# 編輯 .env，填入資料庫連線資訊
npm install
node server.js
```

後端預設在 `http://localhost:4000`

---

## 步驟三：建置前端

```powershell
# 在前端根目錄
copy .env.example .env
# 設定 VITE_API_BASE=http://your-server-ip:4000/api
npm install
npm run build
# 產出 dist/ 資料夾
```

---

## 步驟四：部署

### 方案 A：Node.js 直接服務（最簡單）
```
FRONTEND_DIST=../dist  ← .env 中設定
node server.js         ← 同時服務前後端
```

### 方案 B：IIS + Node.js（建議生產環境）
1. IIS 安裝 `URL Rewrite` 模組
2. 前端 `dist/` 放到 IIS 網站根目錄
3. IIS 設定 Reverse Proxy 將 `/api/*` 轉到 `http://localhost:4000`
4. Node.js 後端用 **NSSM** 或 **PM2** 設定為 Windows 服務

---

## 步驟五：設定 Windows 服務（用 NSSM）

```powershell
# 下載 nssm.exe 後
nssm install FileManagementAPI "C:\Program Files\nodejs\node.exe"
nssm set FileManagementAPI AppDirectory "D:\FileManagement\backend"
nssm set FileManagementAPI AppParameters "server.js"
nssm set FileManagementAPI AppEnvironmentExtra "NODE_ENV=production"
nssm start FileManagementAPI
```

---

## 使用者管理說明

| 操作 | 說明 |
|------|------|
| 新增使用者 | 管理員在「使用者管理」頁面新增，預設密碼=帳號 |
| 首次登入 | 系統強制要求變更密碼 |
| 忘記密碼 | 管理員至「使用者管理」→ 點「重置密碼」→ 密碼重置為帳號，使用者下次登入須再次變更 |
| 停用帳號 | 管理員可停用，停用後無法登入 |

---

## 檔案儲存路徑

建議設定 `UPLOAD_DIR=D:\FileStorage\uploads`  
請確保 Node.js 程序對此目錄有讀寫權限。