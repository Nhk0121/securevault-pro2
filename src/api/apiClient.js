/**
 * 自建後端 API 客戶端
 * 目標環境：WinServer 2019 + Node.js + MSSQL
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

// ─── 基礎請求函式 ─────────────────────────────────────────────
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
  if (!res.ok) throw { status: res.status, message: data.訊息 || data.message || "請求失敗", data };
  return data;
}

const get  = (path)        => request("GET",    path);
const post = (path, body)  => request("POST",   path, body);
const put  = (path, body)  => request("PUT",    path, body);
const del  = (path)        => request("DELETE", path);

// ─── 認證 API ─────────────────────────────────────────────────
export const auth = {
  /** 登入：回傳 { token, 使用者 } */
  login: (帳號, 密碼) => post("/認證/登入", { 帳號, 密碼 }),

  /** 取得目前登入使用者資料 */
  me: () => get("/認證/目前使用者"),

  /** 更新自己的基本資料 */
  updateMe: (data) => put("/認證/目前使用者", data),

  /** 自行變更密碼 */
  changePassword: ({ currentPassword, newPassword }) =>
    post("/認證/變更密碼", { 目前密碼: currentPassword, 新密碼: newPassword }),

  /** 管理員重置指定使用者密碼 */
  resetPassword: (userId) => post(`/認證/重置密碼/${userId}`),

  /** 登出（清除 token 並跳轉登入頁） */
  logout: () => { removeToken(); window.location.href = "/login"; },

  /** 確認是否已登入 */
  isAuthenticated: () => !!getToken(),

  /** 跳轉至登入頁 */
  redirectToLogin: () => { window.location.href = "/login"; },
};

// ─── 實體 CRUD 工廠函式 ───────────────────────────────────────
function createEntityClient(entityName) {
  const base = `/資料/${encodeURIComponent(entityName)}`;
  return {
    list: (sort = "-建立時間", limit = 100) =>
      get(`${base}?sort=${sort}&limit=${limit}`),

    filter: (query = {}, sort = "-建立時間", limit = 100) => {
      const qs = new URLSearchParams({
        filter: JSON.stringify(query),
        sort,
        limit,
      });
      return get(`${base}?${qs}`);
    },

    get: (id) => get(`${base}/${id}`),

    create: (data) => post(base, data),

    bulkCreate: (items) => post(`${base}/批次新增`, items),

    update: (id, data) => put(`${base}/${id}`, data),

    delete: (id) => del(`${base}/${id}`),

    schema: () => get(`${base}/schema`),

    /** 即時訂閱（SSE） */
    subscribe: (callback) => {
      const token = getToken();
      const url = `${API_BASE}${base}/訂閱?token=${token}`;
      const es = new EventSource(url);
      es.onmessage = (e) => {
        try { callback(JSON.parse(e.data)); } catch (_) {}
      };
      return () => es.close();
    },
  };
}

// ─── 使用者管理 API（管理員） ─────────────────────────────────
export const users = {
  /** 列出所有使用者 */
  list: () => get("/使用者管理"),

  /** 新建使用者 */
  createUser: (data) => post("/使用者管理", data),

  /** 更新使用者資料 */
  update: (id, data) => put(`/使用者管理/${id}`, data),

  /** 停用使用者 */
  delete: (id) => del(`/使用者管理/${id}`),
};

// ─── 整合功能（檔案上傳等） ───────────────────────────────────
export const integrations = {
  Core: {
    /** 上傳檔案：接受 File 物件，回傳 { file_url } */
    UploadFile: async ({ file }) => {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/上傳`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("檔案上傳失敗");
      return res.json(); // { file_url }
    },

    /** 呼叫 LLM（選用，可串接 Azure OpenAI） */
    InvokeLLM: (params) => post("/整合/llm", params),
  },
};

// ─── 主要匯出物件（相容原 base44 介面） ──────────────────────
export const apiClient = {
  auth,
  users,
  integrations,
  analytics: { track: () => {} }, // 預留，暫不實作
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