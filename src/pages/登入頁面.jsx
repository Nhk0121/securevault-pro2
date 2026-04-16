/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { HardDrive, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import apiClient, { setToken } from "@/api/apiClient";

export default function 登入頁面() {
  const [帳號, set帳號] = useState("");
  const [密碼, set密碼] = useState("");
  const [顯示密碼, set顯示密碼] = useState(false);
  const [載入中, set載入中] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!帳號 || !密碼) {
      toast({ title: "請輸入帳號與密碼", variant: "destructive" });
      return;
    }
    set載入中(true);
    try {
      const res = await apiClient.auth.login(帳號, 密碼);
      if (res?.token) {
        setToken(res.token);
        // 若需要變更密碼，導向變更密碼頁
        if (res.使用者?.NeedChangePassword) {
          window.location.href = "/變更密碼";
        } else {
          window.location.href = "/";
        }
      }
    } catch (err) {
      toast({
        title: "登入失敗",
        description: err?.message || "帳號或密碼錯誤",
        variant: "destructive",
      });
    } finally {
      set載入中(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="p-3 bg-primary rounded-2xl shadow-lg">
            <HardDrive className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white">雲端檔案管理系統</h1>
          <p className="text-slate-400 text-sm">請輸入您的帳號與密碼</p>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5 shadow-xl backdrop-blur">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">帳號</label>
            <Input
              type="text"
              placeholder="員工編號（6碼）或手機號碼（外包）"
              value={帳號}
              onChange={(e) => set帳號(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus-visible:ring-primary"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">密碼</label>
            <div className="relative">
              <Input
                type={顯示密碼 ? "text" : "password"}
                placeholder="請輸入密碼"
                value={密碼}
                onChange={(e) => set密碼(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus-visible:ring-primary pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => set顯示密碼(!顯示密碼)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {顯示密碼 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            disabled={載入中}
          >
            {載入中 ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {載入中 ? "登入中..." : "登入"}
          </Button>
        </form>

        <div className="flex justify-center mt-4">
          <a href="/申請帳號" className="text-sm text-slate-400 hover:text-white underline underline-offset-4">
            申請帳號
          </a>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">
          © {new Date().getFullYear()} 雲端檔案管理系統 · 僅供內部人員使用
        </p>
      </div>
    </div>
  );
}