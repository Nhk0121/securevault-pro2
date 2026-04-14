/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, Bell, Shield, Clock } from "lucide-react";
import moment from "moment";
import { 取得當月主題 } from "@/lib/月份主題";

export default function 歡迎橫幅({ 待審核數 = 0, 即將過期數 = 0 }) {
  const [用戶, set用戶] = useState(null);
  const [現在時間, set現在時間] = useState(new Date());
  const 當月主題 = 取得當月主題();

  useEffect(() => {
    base44.auth.me().then(set用戶).catch(() => {});
    const timer = setInterval(() => set現在時間(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: 設定列表 = [] } = useQuery({
    queryKey: ["系統設定"],
    queryFn: () => base44.entities.系統設定.list(),
  });

  const 設定 = 設定列表[0] || {};
  const 系統名稱 = 設定.系統名稱 || "雲端檔案管理系統";
  const 系統副標題 = 設定.系統副標題 || "";

  const 現在時段 = () => {
    const h = 現在時間.getHours();
    if (h < 6) return "深夜好";
    if (h < 12) return "早安";
    if (h < 14) return "午安";
    if (h < 18) return "下午好";
    return "晚安";
  };

  const 月份色彩 = 當月主題.label;

  return (
    <div className="relative overflow-hidden rounded-2xl text-white shadow-xl" style={{ background: `linear-gradient(135deg, hsl(${當月主題.primary}) 0%, hsl(${當月主題.accent}) 100%)` }}>
      {/* 裝飾格線背景 */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      />
      {/* 大圖示裝飾 */}
      <div className="absolute right-[-20px] top-[-20px] w-48 h-48 opacity-10 rotate-12">
        <HardDrive className="w-full h-full" />
      </div>
      {/* 光暈 */}
      <div className="absolute bottom-[-30px] left-[-30px] w-40 h-40 rounded-full opacity-10 bg-white blur-2xl" />

      <div className="relative z-10 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* 月份標籤 */}
            <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {月份色彩} 主題
            </div>

            <p className="text-white/75 text-sm flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {moment().format("YYYY年MM月DD日 dddd")}
              <span className="opacity-60">・民國{new Date().getFullYear() - 1911}年</span>
            </p>
            <h1 className="text-2xl font-bold mt-1 tracking-wide">
              {現在時段()}，{用戶?.full_name || 用戶?.email?.split("@")[0] || "使用者"} 👋
            </h1>
            <p className="text-white/70 text-sm mt-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              歡迎使用 <span className="text-white font-semibold">{系統名稱}</span>
              {系統副標題 && <span className="opacity-70">・{系統副標題}</span>}
            </p>
          </div>

          {(待審核數 > 0 || 即將過期數 > 0) && (
            <div className="flex gap-3">
              {待審核數 > 0 && (
                <div className="bg-white/15 border border-white/25 rounded-xl px-4 py-3 text-center backdrop-blur-sm min-w-[80px]">
                  <Shield className="w-4 h-4 mx-auto mb-1 opacity-80" />
                  <p className="text-2xl font-bold leading-none">{待審核數}</p>
                  <p className="text-xs text-white/75 mt-1">待審核</p>
                </div>
              )}
              {即將過期數 > 0 && (
                <div className="bg-white/15 border border-white/25 rounded-xl px-4 py-3 text-center backdrop-blur-sm min-w-[80px]">
                  <Bell className="w-4 h-4 mx-auto mb-1 opacity-80" />
                  <p className="text-2xl font-bold leading-none">{即將過期數}</p>
                  <p className="text-xs text-white/75 mt-1">即將過期</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}