-- ╔══════════════════════════════════════════════════════════════╗
-- ║  雲端檔案管理系統 - MSSQL Schema                             ║
-- ║  執行環境：SQL Server 2019 on Windows Server 2019            ║
-- ║  執行方式：在 SSMS 中開啟此檔案，選擇目標資料庫後執行          ║
-- ╚══════════════════════════════════════════════════════════════╝

USE [FileManagement];
GO

-- ════════════════════════════════════════════════════
-- 1. 使用者表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    帳號              NVARCHAR(50)  NOT NULL UNIQUE,
    email             NVARCHAR(100) NOT NULL UNIQUE,
    full_name         NVARCHAR(50)  NOT NULL DEFAULT '',
    密碼Hash          NVARCHAR(255) NOT NULL,
    role              NVARCHAR(20)  NOT NULL DEFAULT 'user',
        -- admin / it_staff / user / contractor
    姓名代號          NVARCHAR(10)  DEFAULT '',
    所屬組別          NVARCHAR(50)  DEFAULT '',
    所屬課別          NVARCHAR(50)  DEFAULT '',
    電話              NVARCHAR(20)  DEFAULT '',
    分機              NVARCHAR(10)  DEFAULT '',
    資訊人員IP        NVARCHAR(200) DEFAULT '',
    公司名稱          NVARCHAR(100) DEFAULT '',    -- 外包人員
    外包部門          NVARCHAR(100) DEFAULT '',    -- 外包人員
    mustChangePassword BIT          NOT NULL DEFAULT 1,
    停用              BIT           NOT NULL DEFAULT 0,
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- 建立第一個管理員帳號（密碼：admin，首次登入須變更）
-- bcrypt hash of 'admin' with salt 12
IF NOT EXISTS (SELECT 1 FROM Users WHERE 帳號 = 'admin')
INSERT INTO Users (帳號, email, full_name, 密碼Hash, role, mustChangePassword, 停用)
VALUES ('admin', 'admin@company.com', '系統管理員',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniCiWBpz.vxOYOL/1E.f2k.de',
        'admin', 1, 0);
GO

-- ════════════════════════════════════════════════════
-- 2. 資料夾表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='資料夾' AND xtype='U')
CREATE TABLE 資料夾 (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    資料夾名稱        NVARCHAR(30)  NOT NULL,
    上層資料夾        NVARCHAR(50)  DEFAULT '',
    所屬組別          NVARCHAR(50)  DEFAULT '',
    所屬課別          NVARCHAR(50)  DEFAULT '',
    儲存區域          NVARCHAR(10)  DEFAULT '時效區',
    層級              INT           DEFAULT 1,
    是課別資料夾      BIT           DEFAULT 0,
    虛擬路徑          NVARCHAR(500) DEFAULT '',
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 3. 檔案表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='檔案' AND xtype='U')
CREATE TABLE 檔案 (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    檔案名稱          NVARCHAR(100) NOT NULL,
    檔案網址          NVARCHAR(1000)DEFAULT '',
    檔案類型          NVARCHAR(100) DEFAULT '',
    檔案大小          BIGINT        DEFAULT 0,
    副檔名            NVARCHAR(20)  DEFAULT '',
    所屬資料夾        NVARCHAR(50)  DEFAULT '',
    儲存區域          NVARCHAR(10)  DEFAULT '時效區',
    所屬組別          NVARCHAR(50)  DEFAULT '',
    所屬課別          NVARCHAR(50)  DEFAULT '',
    審核狀態          NVARCHAR(10)  DEFAULT '免審核',
        -- 待審核 / 已通過 / 已退回 / 免審核
    審核人            NVARCHAR(100) DEFAULT '',
    審核時間          DATETIME2     NULL,
    審核備註          NVARCHAR(500) DEFAULT '',
    上傳者IP          NVARCHAR(50)  DEFAULT '',
    是否為執行檔      BIT           DEFAULT 0,
    到期日期          DATETIME2     NULL,
    已刪除            BIT           DEFAULT 0,
    刪除時間          DATETIME2     NULL,
    刪除者            NVARCHAR(100) DEFAULT '',
    虛擬路徑          NVARCHAR(500) DEFAULT '',
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- 時效區索引（每天自動查詢到期檔案）
CREATE INDEX IF NOT EXISTS IX_檔案_到期 ON 檔案 (儲存區域, 到期日期, 已刪除);
GO

-- ════════════════════════════════════════════════════
-- 4. 操作日誌表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='操作日誌' AND xtype='U')
CREATE TABLE 操作日誌 (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    操作類型          NVARCHAR(20)  NOT NULL,
        -- 上傳/下載/預覽/刪除/還原/審核/建立資料夾/登入/重置密碼
    操作者            NVARCHAR(100) NOT NULL,
    操作者IP          NVARCHAR(50)  DEFAULT '',
    目標檔案          NVARCHAR(200) DEFAULT '',
    目標檔案ID        NVARCHAR(50)  DEFAULT '',
    詳細內容          NVARCHAR(1000)DEFAULT '',
    所屬組別          NVARCHAR(50)  DEFAULT '',
    儲存區域          NVARCHAR(10)  DEFAULT '',
    是否異常          BIT           DEFAULT 0,
    異常原因          NVARCHAR(500) DEFAULT '',
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 5. 審核記錄表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='審核記錄' AND xtype='U')
CREATE TABLE 審核記錄 (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    檔案ID            NVARCHAR(50)  NOT NULL,
    檔案名稱          NVARCHAR(200) DEFAULT '',
    申請者            NVARCHAR(100) NOT NULL,
    審核者            NVARCHAR(100) DEFAULT '',
    所屬組別          NVARCHAR(50)  DEFAULT '',
    審核狀態          NVARCHAR(10)  DEFAULT '待審核',
    審核備註          NVARCHAR(500) DEFAULT '',
    審核時間          DATETIME2     NULL,
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 6. 組課別設定表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='組課別設定' AND xtype='U')
CREATE TABLE 組課別設定 (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    組別              NVARCHAR(50)  NOT NULL,
    課別名稱          NVARCHAR(50)  NOT NULL,
    排序              INT           DEFAULT 0,
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 7. 系統設定表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='系統設定' AND xtype='U')
CREATE TABLE 系統設定 (
    id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    設定名稱          NVARCHAR(50)  NOT NULL UNIQUE,
    設定值            NVARCHAR(MAX) DEFAULT '',    -- JSON 字串
    created_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_date      DATETIME2     NOT NULL DEFAULT GETDATE(),
    created_by        NVARCHAR(100) DEFAULT ''
);
GO

-- 預設系統設定
IF NOT EXISTS (SELECT 1 FROM 系統設定 WHERE 設定名稱 = '主要設定')
INSERT INTO 系統設定 (設定名稱, 設定值)
VALUES ('主要設定', '{"時效區天數":30,"檔案名稱長度上限":50,"資料夾名稱長度上限":30}');
GO