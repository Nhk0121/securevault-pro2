-- ============================================================
-- 雲端檔案管理系統 - MSSQL 資料庫結構
-- 適用環境：Windows Server 2019 + SQL Server 2019+
-- 建立日期：2026-04-13
-- 說明：所有資料表均包含建立時間、更新時間、建立者欄位
-- ============================================================

USE master;
GO

-- 建立資料庫（若已存在請略過）
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'FileManagement')
BEGIN
    CREATE DATABASE FileManagement
    COLLATE Chinese_Taiwan_Stroke_CI_AS;
END
GO

USE FileManagement;
GO

-- ============================================================
-- 1. 使用者資料表
-- ============================================================
IF OBJECT_ID('dbo.使用者', 'U') IS NOT NULL DROP TABLE dbo.使用者;
GO
CREATE TABLE dbo.使用者 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    email           NVARCHAR(200)       NOT NULL UNIQUE,           -- 登入帳號（Email）
    full_name       NVARCHAR(100)       NOT NULL,                  -- 姓名
    密碼雜湊        NVARCHAR(255)       NOT NULL,                  -- bcrypt 雜湊密碼
    role            NVARCHAR(20)        NOT NULL DEFAULT 'user'    -- 角色：admin / user
                    CHECK (role IN ('admin', 'user')),
    所屬組別        NVARCHAR(50)        NULL,                      -- 所屬組別
    所屬課別        NVARCHAR(50)        NULL,                      -- 所屬課別
    員工編號        NVARCHAR(20)        NULL,                      -- 員工編號
    分機號碼        NVARCHAR(20)        NULL,                      -- 分機號碼
    手機號碼        NVARCHAR(20)        NULL,                      -- 手機號碼
    是否啟用        BIT                 NOT NULL DEFAULT 1,        -- 帳號是否啟用
    需要變更密碼    BIT                 NOT NULL DEFAULT 0,        -- 是否強制變更密碼
    最後登入時間    DATETIME2           NULL,
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- 2. 組課別設定資料表
-- ============================================================
IF OBJECT_ID('dbo.組課別設定', 'U') IS NOT NULL DROP TABLE dbo.組課別設定;
GO
CREATE TABLE dbo.組課別設定 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    組別            NVARCHAR(50)        NOT NULL,                  -- 所屬組別名稱
    課別名稱        NVARCHAR(50)        NOT NULL,                  -- 課別名稱
    排序            INT                 NOT NULL DEFAULT 0,        -- 顯示排序
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL                       -- 建立者 Email
);
GO

-- ============================================================
-- 3. 資料夾資料表
-- ============================================================
IF OBJECT_ID('dbo.資料夾', 'U') IS NOT NULL DROP TABLE dbo.資料夾;
GO
CREATE TABLE dbo.資料夾 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    資料夾名稱      NVARCHAR(100)       NOT NULL,                  -- 資料夾名稱（最多30字元）
    上層資料夾      UNIQUEIDENTIFIER    NULL                       -- 上層資料夾ID，NULL為根目錄
                    REFERENCES dbo.資料夾(id),
    所屬組別        NVARCHAR(50)        NOT NULL,                  -- 所屬組別
    所屬課別        NVARCHAR(50)        NULL,                      -- 所屬課別
    儲存區域        NVARCHAR(20)        NOT NULL DEFAULT '時效區'
                    CHECK (儲存區域 IN ('永久區', '時效區')),
    層級            INT                 NOT NULL DEFAULT 1,        -- 資料夾層級（1-3）
    是課別資料夾    BIT                 NOT NULL DEFAULT 0,        -- 是否為課別層級資料夾
    虛擬路徑        NVARCHAR(500)       NULL,                      -- 完整虛擬路徑
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL                       -- 建立者 Email
);
GO

-- ============================================================
-- 4. 檔案資料表
-- ============================================================
IF OBJECT_ID('dbo.檔案', 'U') IS NOT NULL DROP TABLE dbo.檔案;
GO
CREATE TABLE dbo.檔案 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    檔案名稱        NVARCHAR(200)       NOT NULL,                  -- 檔案名稱（最多50字元）
    檔案網址        NVARCHAR(1000)      NULL,                      -- 上傳後的檔案URL或路徑
    檔案類型        NVARCHAR(200)       NULL,                      -- 檔案MIME類型
    檔案大小        BIGINT              NULL,                      -- 檔案大小（bytes）
    副檔名          NVARCHAR(20)        NULL,                      -- 檔案副檔名
    所屬資料夾      UNIQUEIDENTIFIER    NULL                       -- 所屬資料夾ID
                    REFERENCES dbo.資料夾(id),
    儲存區域        NVARCHAR(20)        NOT NULL DEFAULT '時效區'
                    CHECK (儲存區域 IN ('永久區', '時效區', '資源回收桶')),
    所屬組別        NVARCHAR(50)        NULL,                      -- 所屬組別
    所屬課別        NVARCHAR(50)        NULL,                      -- 所屬課別
    審核狀態        NVARCHAR(20)        NOT NULL DEFAULT '免審核'
                    CHECK (審核狀態 IN ('待審核', '已通過', '已退回', '免審核')),
    審核人          NVARCHAR(200)       NULL,                      -- 審核人 Email
    審核時間        DATETIME2           NULL,                      -- 審核時間
    審核備註        NVARCHAR(500)       NULL,                      -- 審核備註
    上傳者IP        NVARCHAR(50)        NULL,                      -- 上傳者IP位址
    是否為執行檔    BIT                 NOT NULL DEFAULT 0,        -- 是否為exe等執行檔
    到期日期        DATETIME2           NULL,                      -- 時效區到期日期
    已刪除          BIT                 NOT NULL DEFAULT 0,        -- 是否已移至回收桶
    刪除時間        DATETIME2           NULL,                      -- 刪除時間
    刪除者          NVARCHAR(200)       NULL,                      -- 刪除者 Email
    虛擬路徑        NVARCHAR(500)       NULL,                      -- 完整虛擬路徑
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL                       -- 建立者 Email
);
GO

-- ============================================================
-- 5. 審核記錄資料表
-- ============================================================
IF OBJECT_ID('dbo.審核記錄', 'U') IS NOT NULL DROP TABLE dbo.審核記錄;
GO
CREATE TABLE dbo.審核記錄 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    檔案ID          UNIQUEIDENTIFIER    NOT NULL                   -- 被審核的檔案ID
                    REFERENCES dbo.檔案(id),
    檔案名稱        NVARCHAR(200)       NOT NULL,                  -- 被審核的檔案名稱
    申請者          NVARCHAR(200)       NOT NULL,                  -- 申請者 Email
    審核者          NVARCHAR(200)       NULL,                      -- 審核者 Email
    所屬組別        NVARCHAR(50)        NULL,                      -- 所屬組別
    審核狀態        NVARCHAR(20)        NOT NULL DEFAULT '待審核'
                    CHECK (審核狀態 IN ('待審核', '已通過', '已退回')),
    審核備註        NVARCHAR(500)       NULL,                      -- 審核意見
    審核時間        DATETIME2           NULL,                      -- 審核時間
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL
);
GO

-- ============================================================
-- 6. 操作日誌資料表
-- ============================================================
IF OBJECT_ID('dbo.操作日誌', 'U') IS NOT NULL DROP TABLE dbo.操作日誌;
GO
CREATE TABLE dbo.操作日誌 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    操作類型        NVARCHAR(20)        NOT NULL                   -- 操作類型
                    CHECK (操作類型 IN ('上傳','下載','預覽','編輯','刪除','移動','審核','建立資料夾','還原','永久刪除','登入')),
    操作者          NVARCHAR(200)       NOT NULL,                  -- 操作者 Email
    操作者IP        NVARCHAR(50)        NULL,                      -- 操作者IP位址
    目標檔案        NVARCHAR(200)       NULL,                      -- 目標檔案名稱
    目標檔案ID      UNIQUEIDENTIFIER    NULL,                      -- 目標檔案ID
    詳細內容        NVARCHAR(1000)      NULL,                      -- 操作詳細說明
    所屬組別        NVARCHAR(50)        NULL,                      -- 相關組別
    儲存區域        NVARCHAR(20)        NULL,                      -- 相關儲存區域
    是否異常        BIT                 NOT NULL DEFAULT 0,        -- 是否為異常行為
    異常原因        NVARCHAR(500)       NULL,                      -- 異常原因說明
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL
);
GO

-- ============================================================
-- 7. 系統設定資料表
-- ============================================================
IF OBJECT_ID('dbo.系統設定', 'U') IS NOT NULL DROP TABLE dbo.系統設定;
GO
CREATE TABLE dbo.系統設定 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    設定名稱        NVARCHAR(100)       NOT NULL UNIQUE,           -- 設定項目名稱
    允許上傳執行檔IP    NVARCHAR(MAX)   NULL,                      -- JSON陣列：允許上傳執行檔的IP清單
    組別審核人      NVARCHAR(MAX)       NULL,                      -- JSON陣列：各組別永久區審核人對應設定
    時效區天數      INT                 NOT NULL DEFAULT 30,       -- 時效區檔案保留天數
    檔案名稱長度上限    INT             NOT NULL DEFAULT 50,       -- 檔案名稱最大字元數
    資料夾名稱長度上限  INT             NOT NULL DEFAULT 30,       -- 資料夾名稱最大字元數
    異常偵測下載次數    INT             NOT NULL DEFAULT 20,       -- 短時間內下載超過此次數視為異常
    異常偵測時間範圍    INT             NOT NULL DEFAULT 10,       -- 異常偵測的時間範圍（分鐘）
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL
);
GO

-- ============================================================
-- 建立索引（提升查詢效能）
-- ============================================================

-- 檔案資料表索引
CREATE INDEX IX_檔案_所屬資料夾    ON dbo.檔案(所屬資料夾);
CREATE INDEX IX_檔案_儲存區域      ON dbo.檔案(儲存區域);
CREATE INDEX IX_檔案_已刪除        ON dbo.檔案(已刪除);
CREATE INDEX IX_檔案_所屬組別      ON dbo.檔案(所屬組別);
CREATE INDEX IX_檔案_審核狀態      ON dbo.檔案(審核狀態);
CREATE INDEX IX_檔案_建立者        ON dbo.檔案(created_by);
CREATE INDEX IX_檔案_到期日期      ON dbo.檔案(到期日期);

-- 資料夾資料表索引
CREATE INDEX IX_資料夾_上層資料夾  ON dbo.資料夾(上層資料夾);
CREATE INDEX IX_資料夾_所屬組別    ON dbo.資料夾(所屬組別);

-- 操作日誌索引
CREATE INDEX IX_日誌_操作者        ON dbo.操作日誌(操作者);
CREATE INDEX IX_日誌_操作類型      ON dbo.操作日誌(操作類型);
CREATE INDEX IX_日誌_建立時間      ON dbo.操作日誌(created_date);
CREATE INDEX IX_日誌_是否異常      ON dbo.操作日誌(是否異常);

-- 審核記錄索引
CREATE INDEX IX_審核_檔案ID        ON dbo.審核記錄(檔案ID);
CREATE INDEX IX_審核_審核狀態      ON dbo.審核記錄(審核狀態);

-- 使用者索引
CREATE INDEX IX_使用者_所屬組別    ON dbo.使用者(所屬組別);
GO

-- ============================================================
-- 建立更新時間自動觸發器
-- ============================================================

-- 檔案資料表觸發器
CREATE OR ALTER TRIGGER TR_檔案_更新時間
ON dbo.檔案
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.檔案 SET updated_date = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- 資料夾資料表觸發器
CREATE OR ALTER TRIGGER TR_資料夾_更新時間
ON dbo.資料夾
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.資料夾 SET updated_date = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- 使用者資料表觸發器
CREATE OR ALTER TRIGGER TR_使用者_更新時間
ON dbo.使用者
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.使用者 SET updated_date = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- ============================================================
-- 插入預設系統設定
-- ============================================================
INSERT INTO dbo.系統設定 (設定名稱, 時效區天數, 檔案名稱長度上限, 資料夾名稱長度上限, 異常偵測下載次數, 異常偵測時間範圍)
VALUES (N'預設設定', 30, 50, 30, 20, 10);
GO

-- ============================================================
-- 插入預設組別清單
-- ============================================================
INSERT INTO dbo.組課別設定 (組別, 課別名稱, 排序) VALUES
(N'00.處長室', N'處長室', 0),
(N'01.維護組', N'維護課', 1),
(N'02.設計組', N'設計課', 2),
(N'03.業務組', N'業務課', 3),
(N'04.電費組', N'電費課', 4),
(N'05.調度組', N'調度課', 5),
(N'06.總務組', N'總務課', 6),
(N'07.會計組', N'會計課', 7),
(N'08.人資組', N'人資課', 8),
(N'09.政風組', N'政風課', 9),
(N'10.工務段', N'工務段', 10),
(N'11.工安組', N'工安課', 11),
(N'12.電控組', N'電控課', 12),
(N'13.電力工會', N'電力工會', 13),
(N'14.福利會', N'福利會', 14),
(N'15.檔案下載', N'檔案下載', 15);
GO

PRINT N'資料庫結構建立完成！';
GO