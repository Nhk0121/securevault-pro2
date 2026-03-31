/**
 * 自建後端 API 客戶端
 * 目標：WinServer 2019 + Node.js + MSSQL
 * 所有請求皆帶 JWT Token，Token 存於 localStorage
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

// ─── Token 管理 ───────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem("auth_token");
}
export function setToken(token) {
  localStorage.setItem("auth_token", token);
}
export function removeToken() {
  localStorage.removeItem("auth_token");
}

// ─── 基礎請求 ─────────────────────────────────────────────────
async function request(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
    return;
  }

  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.message || "請求失敗", data };
  return data;
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);
const put = (path, body) => request("PUT", path, body);
const del = (path) => request("DELETE", path);

// ─── Auth API ─────────────────────────────────────────────────
export const auth = {
  /** 登入：回傳 { token, user } */
  login: (帳號, 密碼) => post("/auth/login", { 帳號, 密碼 }),

  /** 取得目前使用者 */
  me: () => get("/auth/me"),

  /** 登出（清除 token） */
  logout: () => { removeToken(); window.location.href = "/login"; },

  /** 管理員重置使用者密碼（重置為帳號） */
  resetPassword: (userId) => post(`/auth/reset-password/${userId}`),

  /** 使用者自行修改密碼 */
  changePassword: ({ currentPassword, newPassword }) =>
    post("/auth/change-password", { currentPassword, newPassword }),

  /** 確認是否已登入 */
  isAuthenticated: () => !!getToken(),

  /** 跳轉至登入頁 */
  redirectToLogin: () => { window.location.href = "/login"; },

  /** 更新自己的資料 */
  updateMe: (data) => put("/auth/me", data),
};

// ─── Entity CRUD 工廠 ─────────────────────────────────────────
function createEntityClient(entityName) {
  const base = `/entities/${encodeURIComponent(entityName)}`;
  return {
    list: (sort = "-created_date", limit = 100) =>
      get(`${base}?sort=${sort}&limit=${limit}`),

    filter: (query = {}, sort = "-created_date", limit = 100) => {
      const qs = new URLSearchParams({
        filter: JSON.stringify(query),
        sort,
        limit,
      });
      return get(`${base}?${qs}`);
    },

    get: (id) => get(`${base}/${id}`),

    create: (data) => post(base, data),

    bulkCreate: (items) => post(`${base}/bulk`, items),

    update: (id, data) => put(`${base}/${id}`, data),

    delete: (id) => del(`${base}/${id}`),

    schema: () => get(`${base}/schema`),

    /** 即時訂閱（SSE） */
    subscribe: (callback) => {
      const token = getToken();
      const url = `${API_BASE}${base}/subscribe?token=${token}`;
      const es = new EventSource(url);
      es.onmessage = (e) => {
        try { callback(JSON.parse(e.data)); } catch (_) {}
      };
      return () => es.close();
    },
  };
}

// ─── 使用者管理 ───────────────────────────────────────────────
export const users = {
  /** 建立新使用者（管理員用） */
  createUser: (data) => post("/users", data),

  /** 列出所有使用者 */
  list: () => get("/users"),

  /** 更新使用者 */
  update: (id, data) => put(`/users/${id}`, data),

  /** 刪除使用者 */
  delete: (id) => del(`/users/${id}`),
};

// ─── 整合 Integrations（檔案上傳） ────────────────────────────
export const integrations = {
  Core: {
    /** 上傳檔案：接受 File 物件，回傳 { file_url } */
    UploadFile: async ({ file }) => {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("上傳失敗");
      return res.json(); // { file_url }
    },

    /** 呼叫 LLM（選用，移機後可串 Azure OpenAI） */
    InvokeLLM: (params) => post("/integrations/llm", params),
  },
};

// ─── 主要匯出物件（相容原 base44 介面） ──────────────────────
export const apiClient = {
  auth,
  users,
  integrations,
  analytics: { track: () => {} }, // stub
  entities: new Proxy(
    {},
    {
      get(_, entityName) {
        return createEntityClient(entityName);
      },
    }
  ),
};

export default apiClient;