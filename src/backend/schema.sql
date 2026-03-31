-- ╔══════════════════════════════════════════════════════════════╗
-- ║  雲端檔案管理系統 - MSSQL 資料庫結構定義                      ║
-- ║  執行環境：SQL Server 2019 on Windows Server 2019            ║
-- ║  執行方式：在 SSMS 中開啟此檔案，選擇目標資料庫後執行          ║
-- ╚══════════════════════════════════════════════════════════════╝

USE [檔案管理系統];
GO

-- ════════════════════════════════════════════════════
-- 1. 使用者資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='使用者' AND xtype='U')
CREATE TABLE 使用者 (
    識別碼              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    帳號                NVARCHAR(50)  NOT NULL UNIQUE,
    電子信箱            NVARCHAR(100) NOT NULL UNIQUE,
    顯示名稱            NVARCHAR(50)  NOT NULL DEFAULT '',
    密碼雜湊            NVARCHAR(255) NOT NULL,
    角色                NVARCHAR(20)  NOT NULL DEFAULT '一般使用者',
        -- 管理員 / 資訊人員 / 一般使用者 / 外包人員
    姓名代號            NVARCHAR(10)  DEFAULT '',
    所屬組別            NVARCHAR(50)  DEFAULT '',
    所屬課別            NVARCHAR(50)  DEFAULT '',
    聯絡電話            NVARCHAR(20)  DEFAULT '',
    辦公室分機          NVARCHAR(10)  DEFAULT '',
    資訊人員IP白名單    NVARCHAR(200) DEFAULT '',
    廠商公司名稱        NVARCHAR(100) DEFAULT '',
    外包負責部門        NVARCHAR(100) DEFAULT '',
    首次登入須改密碼    BIT           NOT NULL DEFAULT 1,
    帳號停用            BIT           NOT NULL DEFAULT 0,
    建立時間            DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間            DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者              NVARCHAR(100) DEFAULT ''
);
GO

-- 建立預設管理員帳號（密碼：admin，首次登入須強制變更）
-- bcrypt 雜湊值對應密碼：admin（rounds=12）
IF NOT EXISTS (SELECT 1 FROM 使用者 WHERE 帳號 = 'admin')
INSERT INTO 使用者 (帳號, 電子信箱, 顯示名稱, 密碼雜湊, 角色, 首次登入須改密碼, 帳號停用)
VALUES ('admin', 'admin@company.com', '系統管理員',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniCiWBpz.vxOYOL/1E.f2k.de',
        '管理員', 1, 0);
GO

-- ════════════════════════════════════════════════════
-- 2. 資料夾資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='資料夾' AND xtype='U')
CREATE TABLE 資料夾 (
    識別碼          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    資料夾名稱      NVARCHAR(30)  NOT NULL,
    上層資料夾識別  NVARCHAR(50)  DEFAULT '',
    所屬組別        NVARCHAR(50)  DEFAULT '',
    所屬課別        NVARCHAR(50)  DEFAULT '',
    儲存區域        NVARCHAR(10)  DEFAULT '時效區',
    資料夾層級      INT           DEFAULT 1,
    是否為課別層    BIT           DEFAULT 0,
    完整虛擬路徑    NVARCHAR(500) DEFAULT '',
    建立時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者          NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 3. 檔案資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='檔案' AND xtype='U')
CREATE TABLE 檔案 (
    識別碼          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    檔案名稱        NVARCHAR(100) NOT NULL,
    檔案網址        NVARCHAR(1000)DEFAULT '',
    檔案類型        NVARCHAR(100) DEFAULT '',   -- MIME type
    檔案大小位元組  BIGINT        DEFAULT 0,
    副檔名          NVARCHAR(20)  DEFAULT '',
    所屬資料夾識別  NVARCHAR(50)  DEFAULT '',
    儲存區域        NVARCHAR(10)  DEFAULT '時效區',
        -- 永久區 / 時效區 / 資源回收桶
    所屬組別        NVARCHAR(50)  DEFAULT '',
    所屬課別        NVARCHAR(50)  DEFAULT '',
    審核狀態        NVARCHAR(10)  DEFAULT '免審核',
        -- 待審核 / 已通過 / 已退回 / 免審核
    審核人員        NVARCHAR(100) DEFAULT '',
    審核時間        DATETIME2     NULL,
    審核備註        NVARCHAR(500) DEFAULT '',
    上傳者IP位址    NVARCHAR(50)  DEFAULT '',
    是否為執行檔    BIT           DEFAULT 0,
    時效到期日      DATETIME2     NULL,
    已移至回收桶    BIT           DEFAULT 0,
    移入回收桶時間  DATETIME2     NULL,
    刪除操作者      NVARCHAR(100) DEFAULT '',
    完整虛擬路徑    NVARCHAR(500) DEFAULT '',
    建立時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者          NVARCHAR(100) DEFAULT ''
);
GO

-- 時效到期日查詢索引（排程工作每日掃描用）
CREATE NONCLUSTERED INDEX IX_檔案_時效到期
    ON 檔案 (儲存區域, 時效到期日, 已移至回收桶);
GO

-- ════════════════════════════════════════════════════
-- 4. 操作日誌資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='操作日誌' AND xtype='U')
CREATE TABLE 操作日誌 (
    識別碼          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    操作類型        NVARCHAR(20)  NOT NULL,
        -- 上傳/下載/預覽/刪除/還原/審核/建立資料夾/登入/重置密碼/永久刪除
    操作者帳號      NVARCHAR(100) NOT NULL,
    操作者IP        NVARCHAR(50)  DEFAULT '',
    目標檔案名稱    NVARCHAR(200) DEFAULT '',
    目標檔案識別    NVARCHAR(50)  DEFAULT '',
    操作詳細說明    NVARCHAR(1000)DEFAULT '',
    所屬組別        NVARCHAR(50)  DEFAULT '',
    儲存區域        NVARCHAR(10)  DEFAULT '',
    是否為異常操作  BIT           DEFAULT 0,
    異常說明        NVARCHAR(500) DEFAULT '',
    建立時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者          NVARCHAR(100) DEFAULT ''
);
GO

-- 快速查詢索引
CREATE NONCLUSTERED INDEX IX_操作日誌_時間
    ON 操作日誌 (建立時間 DESC);
CREATE NONCLUSTERED INDEX IX_操作日誌_異常
    ON 操作日誌 (是否為異常操作, 建立時間 DESC);
GO

-- ════════════════════════════════════════════════════
-- 5. 審核記錄資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='審核記錄' AND xtype='U')
CREATE TABLE 審核記錄 (
    識別碼          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    檔案識別碼      NVARCHAR(50)  NOT NULL,
    檔案名稱        NVARCHAR(200) DEFAULT '',
    申請上傳者      NVARCHAR(100) NOT NULL,
    審核人員        NVARCHAR(100) DEFAULT '',
    所屬組別        NVARCHAR(50)  DEFAULT '',
    審核狀態        NVARCHAR(10)  DEFAULT '待審核',
        -- 待審核 / 已通過 / 已退回
    審核備註        NVARCHAR(500) DEFAULT '',
    審核完成時間    DATETIME2     NULL,
    建立時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間        DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者          NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 6. 組課別設定資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='組課別設定' AND xtype='U')
CREATE TABLE 組課別設定 (
    識別碼      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    所屬組別    NVARCHAR(50)  NOT NULL,
    課別名稱    NVARCHAR(50)  NOT NULL,
    排列順序    INT           DEFAULT 0,
    建立時間    DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間    DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者      NVARCHAR(100) DEFAULT ''
);
GO

-- ════════════════════════════════════════════════════
-- 7. 系統設定資料表
-- ════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='系統設定' AND xtype='U')
CREATE TABLE 系統設定 (
    識別碼      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    設定名稱    NVARCHAR(50)  NOT NULL UNIQUE,
    設定值      NVARCHAR(MAX) DEFAULT '',    -- JSON 字串儲存複雜設定
    建立時間    DATETIME2     NOT NULL DEFAULT GETDATE(),
    更新時間    DATETIME2     NOT NULL DEFAULT GETDATE(),
    建立者      NVARCHAR(100) DEFAULT ''
);
GO

-- 預設系統設定資料
IF NOT EXISTS (SELECT 1 FROM 系統設定 WHERE 設定名稱 = '主要設定')
INSERT INTO 系統設定 (設定名稱, 設定值)
VALUES ('主要設定', N'{"時效區天數":30,"檔案名稱長度上限":50,"資料夾名稱長度上限":30,"異常偵測下載次數":20,"異常偵測時間範圍分鐘":10}');
GO

-- ════════════════════════════════════════════════════
-- 完成提示
-- ════════════════════════════════════════════════════
PRINT N'✔ 資料庫結構建立完成';
PRINT N'✔ 預設管理員帳號：admin，密碼：admin（首次登入須變更）';
GO