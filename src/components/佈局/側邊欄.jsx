import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HardDrive, FolderLock, Clock, Trash2, Shield, Settings,
  FileSearch, ChevronLeft, ChevronRight, Home, ClipboardCheck
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
];

export default function 側邊欄({ 已收合, 切換收合 }) {
  const location = useLocation();

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
          {選單項目.map((item) => {
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