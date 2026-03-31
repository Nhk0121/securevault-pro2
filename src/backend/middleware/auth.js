const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

/**
 * 驗證 JWT middleware
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "未授權，請先登入" });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token 已過期或無效" });
  }
}

/**
 * 僅管理員可存取
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "僅管理員可執行此操作" });
  }
  next();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      帳號: user.帳號,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      所屬組別: user.所屬組別,
      所屬課別: user.所屬課別,
    },
    SECRET,
    { expiresIn: "8h" }
  );
}

module.exports = { requireAuth, requireAdmin, signToken };