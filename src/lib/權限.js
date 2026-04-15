/**
 * 前端權限判斷工具
 * 角色對應職稱：
 *   admin      = TitleLevel 00,01,02 → 最高權限，可看全區、刪除日誌、系統設定
 *   manager    = TitleLevel 03       → 審核同組永久區，管理該課資料夾
 *   user       = TitleLevel 04,05    → 同組上傳/刪除；跨組僅能下載
 *   contractor = TitleLevel 06       → 僅看所屬課別時效區，不可刪除
 */

/** 是否為管理員（admin） */
export function 是否為管理員(user) {
    return user?.role === 'admin';
}

/** 是否為 admin 或 manager（有審核權） */
export function 是否為管理或以上(user) {
    return user?.role === 'admin' || user?.role === 'manager';
}

/** 是否為外包人員 */
export function 是否為外包(user) {
    return user?.role === 'contractor';
}

/** 是否為一般員工（user） */
export function 是否為一般員工(user) {
    return user?.role === 'user';
}

/**
 * 是否可讀取（預覽/下載）指定組別的永久區
 *   admin   → 全組別
 *   manager / user → 同組別
 *   contractor → 不可
 */
export function 可讀取永久區(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'contractor') return false;
    if (user.role === 'admin') return true;
    return user.所屬組別 === 目標組別;
}

/**
 * 是否可對指定組別的永久區進行寫入（上傳/刪除）
 *   admin   → 全組別
 *   manager → 同組別
 *   user    → 同組別（需送審）
 *   contractor → 不可
 */
export function 可寫入永久區(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'contractor') return false;
    if (user.role === 'admin') return true;
    return user.所屬組別 === 目標組別;
}

/**
 * 是否可審核（通過/退回）永久區檔案
 *   admin   → 全組別
 *   manager → 同組別
 */
export function 可審核(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager') return user.所屬組別 === 目標組別;
    return false;
}

/**
 * 是否可操作時效區（上傳/刪除）
 *   contractor → 不可寫入，只能下載
 */
export function 可寫入時效區(user) {
    if (!user) return false;
    return user.role !== 'contractor';
}

/**
 * 是否可刪除檔案
 *   contractor → 絕對不可
 *   user → 只能刪除同組別
 *   manager/admin → 同組別以上
 */
export function 可刪除檔案(user, 目標組別) {
    if (!user) return false;
    if (user.role === 'contractor') return false;
    if (user.role === 'admin') return true;
    return user.所屬組別 === 目標組別;
}

/**
 * 是否需要在首次登入後強制變更密碼
 */
export function 需要變更密碼(user) {
    return user?.NeedChangePassword === true || user?.NeedChangePassword === 1;
}

/**
 * 是否可上傳執行檔（.exe/.bat 等）
 * 只有 admin 且 IP 在白名單內才允許（IP 白名單由後端控制，前端僅檢查角色）
 */
export function 可上傳執行檔(user) {
    return user?.role === 'admin';
}

// ── 向下相容別名（舊版命名） ──────────────────────────────
export const 可操作永久區     = 可寫入永久區;
export const 可讀取永久區舊   = 可讀取永久區;
export const 可操作時效區寫入 = 可寫入時效區;