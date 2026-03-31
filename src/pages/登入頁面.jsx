import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, setToken } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardDrive, LogIn, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

export default function 登入頁面() {
  const [帳號, set帳號] = useState("");
  const [密碼, set密碼] = useState("");
  const [顯示密碼, set顯示密碼] = useState(false);
  const [載入中, set載入中] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  const 執行登入 = async (e) => {
    e.preventDefault();
    if (!帳號.trim() || !密碼.trim()) return;
    set載入中(true);
    try {
      const res = await auth.login(帳號.trim(), 密碼.trim());
      setToken(res.token);
      await checkAppState();
      // 若須強制改密碼
      if (res.user?.mustChangePassword) {
        navigate("/變更密碼", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "登入失敗", description: e.message || "帳號或密碼錯誤" });
    } finally {
      set載入中(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-primary rounded-2xl">
            <HardDrive className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">雲端檔案管理系統</h1>
            <p className="text-muted-foreground text-sm mt-1">請使用員工帳號登入</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-center">帳號登入</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={執行登入} className="space-y-4">
              <div className="space-y-1.5">
                <Label>帳號</Label>
                <Input
                  placeholder="員工帳號"
                  value={帳號}
                  onChange={e => set帳號(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label>密碼</Label>
                <div className="relative">
                  <Input
                    type={顯示密碼 ? "text" : "password"}
                    placeholder="密碼"
                    value={密碼}
                    onChange={e => set密碼(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => set顯示密碼(v => !v)}
                  >
                    {顯示密碼 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" type="submit" disabled={載入中 || !帳號 || !密碼}>
                <LogIn className="w-4 h-4 mr-2" />
                {載入中 ? "登入中..." : "登入"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              忘記密碼請聯繫管理員重置
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}