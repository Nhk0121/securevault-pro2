/**
 * JWT 驗證中介軟體
 */
const jwt = require("jsonwebtoken");

const 密鑰 = process.env.JWT密鑰 || process.env.JWT_SECRET || "請在正式環境中替換此密鑰";

/**
 * 驗證 JWT Token（必須登入）
 */
function 驗證登入(req, res, next) {
  const 授權標頭 = req.headers.authorization;
  if (!授權標頭 || !授權標頭.startsWith("Bearer ")) {
    return res.status(401).json({ 訊息: "未授權，請先登入" });
  }
  const token = 授權標頭.slice(7);
  try {
    req.使用者 = jwt.verify(token, 密鑰);
    next();
  } catch {
    return res.status(401).json({ 訊息: "Token 已過期或無效，請重新登入" });
  }
}

/**
 * 僅管理員可存取
 */
function 僅限管理員(req, res, next) {
  if (req.使用者?.角色 !== "管理員") {
    return res.status(403).json({ 訊息: "權限不足，僅管理員可執行此操作" });
  }
  next();
}

/**
 * 產生 JWT Token
 */
function 產生Token(使用者) {
  return jwt.sign(
    {
      識別碼: 使用者.識別碼,
      帳號: 使用者.帳號,
      電子信箱: 使用者.電子信箱,
      顯示名稱: 使用者.顯示名稱,
      角色: 使用者.角色,
      首次登入須改密碼: 使用者.首次登入須改密碼,
      所屬組別: 使用者.所屬組別,
      所屬課別: 使用者.所屬課別,
    },
    密鑰,
    { expiresIn: "8h" }
  );
}

module.exports = { 驗證登入, 僅限管理員, 產生Token };