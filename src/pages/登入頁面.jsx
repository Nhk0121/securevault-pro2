/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { HardDrive } from "lucide-react";

export default function 登入頁面() {
  useEffect(() => {
    // 使用 Base44 原生登入流程
    base44.auth.redirectToLogin(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="p-3 bg-primary rounded-2xl">
          <HardDrive className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">雲端檔案管理系統</h1>
        <p className="text-muted-foreground text-sm">正在跳轉至登入頁面...</p>
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );
}