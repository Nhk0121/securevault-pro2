import React, { useState } from "react";
import { CheckCircle, XCircle, Loader2, RefreshCw, Wifi, Database, Shield, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/api/apiClient";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const 狀態 = { 等待: "idle", 測試中: "loading", 成功: "success", 失敗: "error" };

function 結果卡({ icon: Icon, title, status, detail, ms }) {
  const 顏色 = {
    [狀態.等待]:  "bg-slate-50 border-slate-200 text-slate-400",
    [狀態.測試中]:"bg-blue-50 border-blue-200 text-blue-500",
    [狀態.成功]:  "bg-green-50 border-green-200 text-green-600",
    [狀態.失敗]:  "bg-red-50 border-red-200 text-red-600",
  }[status];

  const StatusIcon = status === 狀態.測試中
    ? Loader2
    : status === 狀態.成功
    ? CheckCircle
    : status === 狀態.失敗
    ? XCircle
    : null;

  return (
    <div className={`border rounded-xl p-5 ${顏色} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <div className="flex items-center gap-2">
          {ms && <span className="text-xs opacity-70">{ms} ms</span>}
          {StatusIcon && (
            <StatusIcon className={`w-5 h-5 ${status === 狀態.測試中 ? "animate-spin" : ""}`} />
          )}
        </div>
      </div>
      {detail && (
        <pre className="text-xs mt-2 whitespace-pre-wrap break-all opacity-80 bg-white/60 rounded p-2">
          {detail}
        </pre>
      )}
    </div>
  );
}

export default function ConnectionTestPage() {
  const [items, setItems] = useState({
    api:   { status: 狀態.等待, detail: null, ms: null },
    db:    { status: 狀態.等待, detail: null, ms: null },
    auth:  { status: 狀態.等待, detail: null, ms: null },
  });
  const [正在測試, set正在測試] = useState(false);

  const update = (key, patch) =>
    setItems(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  async function 執行測試() {
    set正在測試(true);

    // 重置
    ["api", "db", "auth"].forEach(k =>
      update(k, { status: 狀態.等待, detail: null, ms: null })
    );

    // ── 測試 1：API 可達性（health） ──────────────────────────
    update("api", { status: 狀態.測試中 });
    const t0 = Date.now();
    try {
      const res = await fetch(`${API_BASE}/health`, { method: "GET" });
      const ms = Date.now() - t0;
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      update("api", {
        status: 狀態.成功,
        ms,
        detail: JSON.stringify(json, null, 2),
      });

      // ── 測試 2：資料庫（health 回傳中含 db_time） ─────────
      update("db", { status: 狀態.測試中 });
      if (json.db_time) {
        update("db", {
          status: 狀態.成功,
          ms,
          detail: `db_time: ${json.db_time}`,
        });
      } else {
        update("db", {
          status: 狀態.失敗,
          detail: "health 回應中未包含 db_time，請確認後端 /api/health 實作",
        });
      }
    } catch (err) {
      const ms = Date.now() - t0;
      update("api", {
        status: 狀態.失敗,
        ms,
        detail: diagnose(err.message),
      });
      update("db", { status: 狀態.失敗, detail: "API 無法連線，無法測試資料庫" });
    }

    // ── 測試 3：JWT Token 驗證（打需授權的端點） ─────────────
    update("auth", { status: 狀態.測試中 });
    const t2 = Date.now();
    const token = getToken();
    if (!token) {
      update("auth", {
        status: 狀態.失敗,
        ms: 0,
        detail: "本機無 JWT Token（尚未登入）\n請先登入後再測試此項目",
      });
    } else {
      try {
        const res = await fetch(`${API_BASE}/認證/目前使用者`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ms = Date.now() - t2;
        const json = await res.json();
        if (res.ok) {
          update("auth", {
            status: 狀態.成功,
            ms,
            detail: `已登入：${json.full_name || json.email || "（已取得使用者資料）"}`,
          });
        } else {
          update("auth", {
            status: 狀態.失敗,
            ms,
            detail: `HTTP ${res.status}：${json.message || JSON.stringify(json)}`,
          });
        }
      } catch (err) {
        update("auth", {
          status: 狀態.失敗,
          ms: Date.now() - t2,
          detail: diagnose(err.message),
        });
      }
    }

    set正在測試(false);
  }

  function diagnose(msg = "") {
    if (msg.includes("fetch") || msg.includes("Failed to fetch") || msg.includes("NetworkError"))
      return `無法連線至 API\n目標：${API_BASE}\n\n可能原因：\n• 後端 Node.js 尚未啟動（pm2 list）\n• IIS ARR 反向代理未設定\n• 防火牆封鎖\n• VITE_API_BASE 設定錯誤\n\n原始錯誤：${msg}`;
    if (msg.includes("CORS"))
      return `CORS 錯誤\n後端未允許此來源，請確認 server.js 的 CORS 設定\n\n原始錯誤：${msg}`;
    if (msg.includes("SSL") || msg.includes("certificate"))
      return `SSL 憑證錯誤\n請確認 IIS 已正確設定 HTTPS 憑證\n\n原始錯誤：${msg}`;
    return msg;
  }

  const allDone = !正在測試 && Object.values(items).some(i => i.status !== 狀態.等待);
  const allOk   = Object.values(items).every(i => i.status === 狀態.成功);
  const hasFail = Object.values(items).some(i => i.status === 狀態.失敗);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-4">
            <Wifi className="w-4 h-4" />
            系統連線診斷
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">前後端連線測試</h1>
          <p className="text-slate-400 text-sm">
            API：<code className="text-slate-300 bg-white/10 px-2 py-0.5 rounded">{API_BASE}</code>
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <結果卡
            icon={Server}
            title="API 伺服器可達性（/api/health）"
            status={items.api.status}
            detail={items.api.detail}
            ms={items.api.ms}
          />
          <結果卡
            icon={Database}
            title="資料庫連線（MSSQL）"
            status={items.db.status}
            detail={items.db.detail}
            ms={items.db.ms}
          />
          <結果卡
            icon={Shield}
            title="JWT 身份驗證"
            status={items.auth.status}
            detail={items.auth.detail}
            ms={items.auth.ms}
          />
        </div>

        {allDone && (
          <div className={`rounded-xl p-4 mb-4 text-sm text-center font-medium ${
            allOk
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : hasFail
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
          }`}>
            {allOk
              ? "✅ 所有項目連線正常"
              : hasFail
              ? "❌ 部分項目連線失敗，請參考上方錯誤說明"
              : "⚠️ 部分項目待確認"}
          </div>
        )}

        <Button
          onClick={執行測試}
          disabled={正在測試}
          className="w-full gap-2 bg-primary hover:bg-primary/90"
          size="lg"
        >
          {正在測試
            ? <><Loader2 className="w-4 h-4 animate-spin" />測試中...</>
            : <><RefreshCw className="w-4 h-4" />{allDone ? "重新測試" : "開始測試"}</>
          }
        </Button>

        <p className="text-center text-xs text-slate-600 mt-4">
          此頁面僅供部署確認使用，不需登入即可存取
        </p>
      </div>
    </div>
  );
}