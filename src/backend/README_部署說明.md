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

---

### 第三步：前端打包

```bash
# 在專案根目錄執行
npm install
npm run build
# 打包結果在 dist/ 資料夾
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
const API_BASE_URL = 'http://localhost:3001/api';
// 或使用實際 IP：http://192.168.x.x:3001/api
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

## 注意事項

- `JWT_SECRET` 請設定為複雜的隨機字串，不要使用預設值
- 資料庫密碼建議使用強密碼
- 建議啟用 HTTPS（SSL 憑證）
- 定期備份 MSSQL 資料庫與上傳檔案