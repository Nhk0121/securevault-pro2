import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  HardDrive, FolderLock, Clock, Trash2, Shield, Settings,
  FileSearch, ChevronLeft, ChevronRight, Home, ClipboardCheck,
  UserCog, Users, BookOpen, Building2, UserPlus, Phone
} from "lucide-react";
import { cn } from "@/lib/utils";

const 選單項目 = [
  { 路徑: "/", 標題: "首頁總覽", 圖示: Home },
  { 路徑: "/永久區", 標題: "永久區", 圖示: FolderLock },
  { 路徑: "/時效區", 標題: "時效區", 圖示: Clock },
  { 路徑: "/資源回收桶", 標題: "資源回收桶", 圖示: Trash2 },
  { 路徑: "/審核管理", 標題: "審核管理", 圖示: ClipboardCheck },
  { 路徑: "/稽核日誌", 標題: "稽核日誌", 圖示: FileSearch },
  { 路徑: "/系統設定", 標題: "系統設定", 圖示: Settings },
  { 路徑: "/個人資料", 標題: "個人資料", 圖示: UserCog },
  { 路徑: "/使用者管理", 標題: "使用者管理", 圖示: Users, 僅管理員: true },
  { 路徑: "/組課別管理", 標題: "組課別管理", 圖示: BookOpen, 僅管理員: true },
  { 路徑: "/外包人員管理", 標題: "外包人員管理", 圖示: Building2, 僅管理員: true },
  { 路徑: "/電話簿", 標題: "電話簿", 圖示: Phone },
  { 路徑: "/申請帳號", 標題: "帳號申請表單", 圖示: UserPlus },
];

export default function 側邊欄({ 已收合, 切換收合 }) {
  const location = useLocation();
  const [我, set我] = useState(null);

  useEffect(() => {
    base44.auth.me().then(set我).catch(() => {});
  }, []);

  const 是管理員 = 我?.role === "admin";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex flex-col",
        已收合 ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <HardDrive className="w-7 h-7 text-sidebar-primary flex-shrink-0" />
        {!已收合 && (
          <span className="ml-3 font-bold text-lg tracking-wide whitespace-nowrap">
            雲端檔案管理
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {選單項目.filter(item => !item.僅管理員 || 是管理員).map((item) => {
            const 是否啟用 = location.pathname === item.路徑 || 
              (item.路徑 !== "/" && location.pathname.startsWith(item.路徑));
            const Icon = item.圖示;
            return (
              <li key={item.路徑}>
                <Link
                  to={item.路徑}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    是否啟用
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!已收合 && <span className="truncate">{item.標題}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={切換收合}
        className="flex items-center justify-center h-12 border-t border-sidebar-border hover:bg-sidebar-accent transition-colors"
      >
        {已收合 ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}