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

1. 開啟 SQL Server Management Studio（SSMS）
2. 建立資料庫：`CREATE DATABASE [檔案管理系統];`
3. 執行 `schema.sql`（在 SSMS 選擇「檔案管理系統」後執行）
4. 預設管理員帳號：`admin`，密碼：`admin`（首次登入須強制變更）

---

## 步驟二：設定後端

```powershell
cd backend
copy .env.example .env
# 以記事本或 VS Code 編輯 .env，填入正確設定
notepad .env

npm install
node server.js
```

後端預設在 `http://localhost:4000`

---

## 步驟三：建置前端

```powershell
# 在前端根目錄
# 建立 .env 並設定 API 位址
echo VITE_API_BASE=http://你的伺服器IP:4000/api > .env

npm install
npm run build
# 產出 dist/ 資料夾
```

---

## 步驟四：部署方案

### 方案 A：Node.js 直接服務（最快速）
```
前端建置目錄=../dist  ← 在 .env 中設定
node server.js        ← 同時提供前後端服務
```

### 方案 B：IIS + Node.js（建議正式環境）
1. IIS 安裝 `URL Rewrite` 模組（[下載](https://www.iis.net/downloads/microsoft/url-rewrite)）
2. 前端 `dist/` 放到 IIS 網站根目錄
3. IIS 設定反向代理，將 `/api/*` 轉到 `http://localhost:4000`
4. Node.js 後端用 **NSSM** 或 **PM2** 設定為 Windows 服務

---

## 步驟五：設定為 Windows 服務（使用 NSSM）

```powershell
# 下載 nssm.exe（https://nssm.cc/download）後：
nssm install 雲端檔案管理後端 "C:\Program Files\nodejs\node.exe"
nssm set 雲端檔案管理後端 AppDirectory "D:\FileManagement\backend"
nssm set 雲端檔案管理後端 AppParameters "server.js"
nssm set 雲端檔案管理後端 AppEnvironmentExtra "NODE_ENV=production"
nssm start 雲端檔案管理後端
```

---

## 使用者管理說明

| 操作 | 說明 |
|------|------|
| 新增使用者 | 管理員在「使用者管理」頁面新增，預設密碼 = 帳號 |
| 首次登入 | 系統強制要求變更密碼（密碼至少 8 字元） |
| 忘記密碼 | 管理員至「使用者管理」→ 點擊「🔑 重置密碼」→ 密碼重置為帳號，下次登入須再次強制變更 |
| 停用帳號 | 管理員可點擊「停用帳號」，停用後該帳號無法登入 |

---

## 角色權限對照

| 角色 | 永久區 | 時效區 | 回收桶 | 審核管理 | 使用者管理 | 系統設定 |
|------|--------|--------|--------|----------|------------|----------|
| 管理員 | ✅ 完整 | ✅ 完整 | ✅ | ✅ | ✅ | ✅ |
| 資訊人員 | ✅（IP限制） | ✅ | ✅ | ✅ | ❌ | ❌ |
| 一般使用者 | ✅（本組） | ✅ | ❌ | ❌ | ❌ | ❌ |
| 外包人員 | ❌ | ✅（下載） | ❌ | ❌ | ❌ | ❌ |

---

## 檔案儲存建議

```
上傳目錄=D:\FileStorage\uploads
```

請確保 Node.js 程序（NSSM 服務帳號）對此目錄具有讀寫權限。  
建議定期備份此目錄及 MSSQL 資料庫。