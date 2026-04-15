-- ============================================================
-- 雲端檔案管理系統 - MSSQL 資料庫結構 (最終確認版)
-- 適用環境：Windows Server 2019 + SQL Server 2019+
-- 建立日期：2026-04-15
-- ============================================================

USE master;
GO

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
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserID              NVARCHAR(10)        NOT NULL UNIQUE,    -- 員工 6 碼或外包 10 碼
    email               NVARCHAR(200)       NOT NULL UNIQUE,    -- 登入帳號（Email）
    full_name           NVARCHAR(100)       NOT NULL,           -- 姓名
    密碼雜湊            NVARCHAR(255)       NOT NULL,           -- bcrypt 雜湊

    -- 職稱層級
    -- 00.處長 01.副處長 02.課長/主任 03.課長/主任(審核) 04.員工 05.員工 06.外包
    TitleLevel          NVARCHAR(2)         NOT NULL DEFAULT '05',

    -- 系統權限角色
    role                NVARCHAR(20)        NOT NULL DEFAULT 'user'
                        CHECK (role IN ('admin', 'manager', 'user', 'contractor')),
    --  admin       = TitleLevel 00,01,02 → 最高權限
    --  manager     = TitleLevel 03       → 同組審核權
    --  user        = TitleLevel 04,05    → 一般上傳/下載
    --  contractor  = TitleLevel 06       → 僅看所屬課別時效區，不可刪除

    所屬組別            NVARCHAR(50)        NOT NULL,           -- 16 個組別之一
    所屬課別            NVARCHAR(50)        NULL,
    分機號碼            NVARCHAR(20)        NULL,
    手機號碼            NVARCHAR(20)        NULL,
    SortOrder           INT                 NOT NULL DEFAULT 50, -- 電話簿排序（越小越前）
    是否啟用            BIT                 NOT NULL DEFAULT 1,
    NeedChangePassword  BIT                 NOT NULL DEFAULT 0,  -- 強制變更密碼旗標
    最後登入時間        DATETIME2           NULL,
    created_date        DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date        DATETIME2           NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- 2. 組課別設定資料表
-- ============================================================
IF OBJECT_ID('dbo.組課別設定', 'U') IS NOT NULL DROP TABLE dbo.組課別設定;
GO
CREATE TABLE dbo.組課別設定 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    組別            NVARCHAR(50)        NOT NULL,
    課別名稱        NVARCHAR(50)        NOT NULL,
    排序            INT                 NOT NULL DEFAULT 0,
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- 3. 資料夾資料表（支援 5 層結構）
-- ============================================================
IF OBJECT_ID('dbo.資料夾', 'U') IS NOT NULL DROP TABLE dbo.資料夾;
GO
CREATE TABLE dbo.資料夾 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    資料夾名稱      NVARCHAR(100)       NOT NULL,
    上層資料夾      UNIQUEIDENTIFIER    NULL
                    REFERENCES dbo.資料夾(id),
    所屬組別        NVARCHAR(50)        NOT NULL,
    所屬課別        NVARCHAR(50)        NULL,
    擁有者UserID    NVARCHAR(10)        NULL,               -- L4 人員層判定用
    儲存區域        NVARCHAR(20)        NOT NULL DEFAULT N'時效區'
                    CHECK (儲存區域 IN (N'永久區', N'時效區')),
    -- 層級：1.區域 2.組 3.課 4.人員 5.分類
    層級            INT                 NOT NULL DEFAULT 1
                    CHECK (層級 BETWEEN 1 AND 5),
    虛擬路徑        NVARCHAR(500)       NULL,
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL
);
GO

-- ============================================================
-- 4. 檔案資料表（實體磁碟路徑 + 審核欄位整合）
-- ============================================================
IF OBJECT_ID('dbo.檔案', 'U') IS NOT NULL DROP TABLE dbo.檔案;
GO
CREATE TABLE dbo.檔案 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    檔案名稱        NVARCHAR(200)       NOT NULL,
    實體路徑        NVARCHAR(1000)      NULL,               -- 伺服器 D 槽完整路徑
    檔案類型        NVARCHAR(200)       NULL,
    檔案大小        BIGINT              NULL,
    副檔名          NVARCHAR(20)        NULL,
    所屬資料夾      UNIQUEIDENTIFIER    NULL
                    REFERENCES dbo.資料夾(id),
    儲存區域        NVARCHAR(20)        NOT NULL DEFAULT N'時效區'
                    CHECK (儲存區域 IN (N'永久區', N'時效區', N'資源回收桶')),
    所屬組別        NVARCHAR(50)        NULL,
    所屬課別        NVARCHAR(50)        NULL,

    -- 審核狀態（直接存在檔案表，manager 以上可審核）
    審核狀態        NVARCHAR(20)        NOT NULL DEFAULT N'免審核'
                    CHECK (審核狀態 IN (N'待審核', N'已通過', N'已退回', N'免審核')),
    審核人          NVARCHAR(200)       NULL,               -- 審核者 Email
    審核時間        DATETIME2           NULL,
    審核備註        NVARCHAR(500)       NULL,

    上傳者IP        NVARCHAR(50)        NULL,
    到期日期        DATETIME2           NULL,               -- 時效區 30 天後刪除
    已刪除          BIT                 NOT NULL DEFAULT 0,
    刪除時間        DATETIME2           NULL,
    刪除者          NVARCHAR(200)       NULL,
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_date    DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by      NVARCHAR(200)       NULL                -- 上傳者 Email
);
GO

-- ============================================================
-- 5. 操作日誌（資安稽核，保留）
-- ============================================================
IF OBJECT_ID('dbo.操作日誌', 'U') IS NOT NULL DROP TABLE dbo.操作日誌;
GO
CREATE TABLE dbo.操作日誌 (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    操作類型        NVARCHAR(20)        NOT NULL
                    CHECK (操作類型 IN (
                        N'上傳', N'下載', N'預覽', N'編輯',
                        N'刪除', N'移動', N'審核通過', N'審核退回',
                        N'建立資料夾', N'還原', N'永久刪除', N'登入'
                    )),
    操作者          NVARCHAR(200)       NOT NULL,
    操作者IP        NVARCHAR(50)        NULL,
    目標檔案        NVARCHAR(200)       NULL,
    目標檔案ID      UNIQUEIDENTIFIER    NULL,
    詳細內容        NVARCHAR(1000)      NULL,
    所屬組別        NVARCHAR(50)        NULL,
    是否異常        BIT                 NOT NULL DEFAULT 0,
    異常原因        NVARCHAR(500)       NULL,
    created_date    DATETIME2           NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- 6. 系統設定
-- ============================================================
IF OBJECT_ID('dbo.系統設定', 'U') IS NOT NULL DROP TABLE dbo.系統設定;
GO
CREATE TABLE dbo.系統設定 (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    設定名稱            NVARCHAR(100)       NOT NULL UNIQUE,
    時效區天數          INT                 NOT NULL DEFAULT 30,
    禁止上傳副檔名      NVARCHAR(MAX)       DEFAULT N'.exe,.bat,.cmd,.com,.msi,.ps1,.vbs,.sh',
    允許上傳執行檔IP    NVARCHAR(MAX)       NULL,           -- JSON 陣列：特殊允許的 IP
    組別審核人          NVARCHAR(MAX)       NULL,           -- JSON 陣列：各組 manager Email
    created_date        DATETIME2           NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- 建立索引
-- ============================================================
CREATE INDEX IX_使用者_UserID      ON dbo.使用者(UserID);
CREATE INDEX IX_使用者_所屬組別    ON dbo.使用者(所屬組別);
CREATE INDEX IX_使用者_role        ON dbo.使用者(role);

CREATE INDEX IX_資料夾_上層        ON dbo.資料夾(上層資料夾);
CREATE INDEX IX_資料夾_層級        ON dbo.資料夾(層級);
CREATE INDEX IX_資料夾_所屬組別    ON dbo.資料夾(所屬組別);

CREATE INDEX IX_檔案_所屬資料夾    ON dbo.檔案(所屬資料夾);
CREATE INDEX IX_檔案_儲存區域      ON dbo.檔案(儲存區域);
CREATE INDEX IX_檔案_已刪除        ON dbo.檔案(已刪除);
CREATE INDEX IX_檔案_所屬組別      ON dbo.檔案(所屬組別);
CREATE INDEX IX_檔案_審核狀態      ON dbo.檔案(審核狀態);
CREATE INDEX IX_檔案_到期日期      ON dbo.檔案(到期日期);
CREATE INDEX IX_檔案_建立者        ON dbo.檔案(created_by);

CREATE INDEX IX_日誌_操作者        ON dbo.操作日誌(操作者);
CREATE INDEX IX_日誌_建立時間      ON dbo.操作日誌(created_date);
CREATE INDEX IX_日誌_是否異常      ON dbo.操作日誌(是否異常);
GO

-- ============================================================
-- 觸發器：自動更新 updated_date
-- ============================================================
CREATE OR ALTER TRIGGER TR_使用者_更新時間
ON dbo.使用者 AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE dbo.使用者 SET updated_date = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE OR ALTER TRIGGER TR_資料夾_更新時間
ON dbo.資料夾 AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE dbo.資料夾 SET updated_date = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

CREATE OR ALTER TRIGGER TR_檔案_更新時間
ON dbo.檔案 AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
    UPDATE dbo.檔案 SET updated_date = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

-- ============================================================
-- 預設資料
-- ============================================================
INSERT INTO dbo.系統設定 (設定名稱, 時效區天數)
VALUES (N'預設設定', 30);

INSERT INTO dbo.組課別設定 (組別, 課別名稱, 排序) VALUES
(N'00.處長室',   N'處長室',   0),
(N'01.維護組',   N'維護課',   1),
(N'02.設計組',   N'設計課',   2),
(N'03.業務組',   N'業務課',   3),
(N'04.電費組',   N'電費課',   4),
(N'05.調度組',   N'調度課',   5),
(N'06.總務組',   N'總務課',   6),
(N'07.會計組',   N'會計課',   7),
(N'08.人資組',   N'人資課',   8),
(N'09.政風組',   N'政風課',   9),
(N'10.工務段',   N'工務段',   10),
(N'11.工安組',   N'工安課',   11),
(N'12.電控組',   N'電控課',   12),
(N'13.電力工會', N'電力工會', 13),
(N'14.福利會',   N'福利會',   14),
(N'15.檔案下載', N'檔案下載', 15);
GO

PRINT N'桃園區處雲端檔案管理系統 - 資料庫建立完成！';
GO