/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldOff } from "lucide-react";

export default function 管理員守衛({ children }) {
  const [載入中, set載入中] = useState(true);
  const [是管理員, set是管理員] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(user => {
        set是管理員(user?.role === "admin");
      })
      .catch(() => set是管理員(false))
      .finally(() => set載入中(false));
  }, []);

  if (載入中) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!是管理員) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <ShieldOff className="w-12 h-12 text-destructive/50" />
        <p className="text-lg font-medium">權限不足</p>
        <p className="text-sm">此頁面僅限系統管理員存取。</p>
      </div>
    );
  }

  return children;
}