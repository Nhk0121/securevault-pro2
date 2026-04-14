/**
 * 權限判斷工具
 * 角色層級：system_admin > admin > it_staff > user > contractor
 */

export function 是否為系統管理員(user) {
  return user?.role === "system_admin";
}

export function 是否為管理員(user) {
  return user?.role === "admin" || user?.role === "system_admin";
}

export function 是否為資訊人員(user, 目前IP) {
  if (user?.role !== "it_staff") return false;
  if (!user?.資訊人員IP) return false;
  const IPs = user.資訊人員IP.split(",").map(ip => ip.trim());
  return IPs.includes(目前IP);
}

export function 是否為外包(user) {
  return user?.role === "contractor";
}

/**
 * 是否有某組別的永久區操作權限（上傳/刪除/編輯）
 * - system_admin：全部組別
 * - admin：全部組別
 * - it_staff + IP：全部組別
 * - user：所屬組別 + 多組別權限清單
 * - contractor：不可
 */
export function 可操作永久區(user, 目標組別, 目前IP = "") {
  if (!user) return false;
  if (user.role === "system_admin") return true;
  if (user.role === "admin") return true;
  if (user.role === "it_staff" && 是否為資訊人員(user, 目前IP)) return true;
  if (user.role === "user") {
    if (user.所屬組別 === 目標組別) return true;
    const 多組別 = user.永久區多組別權限 || [];
    if (多組別.includes(目標組別)) return true;
  }
  return false;
}

/**
 * 永久區讀取（預覽/下載）權限
 * - 全員皆可讀取（外包除外）
 */
export function 可讀取永久區(user) {
  if (!user) return false;
  return user.role !== "contractor";
}

/**
 * 時效區所有人皆可操作（除外包只能下載）
 */
export function 可操作時效區寫入(user) {
  if (!user) return false;
  return user.role !== "contractor";
}

/**
 * 是否可上傳執行檔
 * - system_admin：永遠可以
 * - it_staff + IP 驗證通過：可以
 * - 其他使用者：需有 可上傳執行檔 = true 且經管理員授權
 */
export function 可上傳執行檔(user, 目前IP = "") {
  if (!user) return false;
  if (user.role === "system_admin") return true;
  if (user.role === "it_staff" && 是否為資訊人員(user, 目前IP)) return true;
  if (user.可上傳執行檔 === true) return true;
  return false;
}