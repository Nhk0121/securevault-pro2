/**
 * 權限判斷工具
 * 角色：admin > it_staff > user > contractor
 */

export function 是否為管理員(user) {
  return user?.role === "admin";
}

export function 是否為資訊人員(user, 目前IP) {
  if (user?.role !== "it_staff") return false;
  if (!user?.資訊人員IP) return false;
  // IP白名單：可填多個，逗號分隔
  const IPs = user.資訊人員IP.split(",").map(ip => ip.trim());
  return IPs.includes(目前IP);
}

export function 是否為外包(user) {
  return user?.role === "contractor";
}

/**
 * 永久區上傳/刪除權限判斷
 * - admin：可以
 * - it_staff + IP驗證通過：可以
 * - user：必須是該組別成員
 * - contractor：不可以
 */
export function 可操作永久區(user, 目標組別, 目前IP) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "it_staff" && 是否為資訊人員(user, 目前IP)) return true;
  if (user.role === "user" && user.所屬組別 === 目標組別) return true;
  return false;
}

/**
 * 時效區所有人皆可操作（除外包只能下載）
 */
export function 可操作時效區寫入(user) {
  if (!user) return false;
  return user.role !== "contractor";
}