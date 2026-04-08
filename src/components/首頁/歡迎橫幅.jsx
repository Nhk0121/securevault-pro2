import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { HardDrive, Bell } from "lucide-react";
import moment from "moment";

export default function 歡迎橫幅({ 待審核數 = 0, 即將過期數 = 0 }) {
  const [用戶, set用戶] = useState(null);

  useEffect(() => {
    base44.auth.me().then(set用戶).catch(() => {});
  }, []);

  const 現在時段 = () => {
    const h = new Date().getHours();
    if (h < 12) return "早安";
    if (h < 18) return "午安";
    return "晚安";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-white p-6 shadow-lg">
      {/* 背景裝飾 */}
      <div className="absolute right-0 top-0 w-64 h-64 opacity-10">
        <HardDrive className="w-full h-full" />
      </div>
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-white/80 text-sm">{moment().format("YYYY年MM月DD日 dddd")}</p>
          <h1 className="text-2xl font-bold mt-1">
            {現在時段()}，{用戶?.full_name || 用戶?.email?.split("@")[0] || "使用者"} 👋
          </h1>
          <p className="text-white/80 text-sm mt-1">歡迎使用 雲端檔案管理系統</p>
        </div>
        {(待審核數 > 0 || 即將過期數 > 0) && (
          <div className="flex gap-3">
            {待審核數 > 0 && (
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold">{待審核數}</p>
                <p className="text-xs text-white/80 mt-0.5">待審核</p>
              </div>
            )}
            {即將過期數 > 0 && (
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
                <Bell className="w-4 h-4 mx-auto mb-0.5" />
                <p className="text-2xl font-bold">{即將過期數}</p>
                <p className="text-xs text-white/80 mt-0.5">即將過期</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}