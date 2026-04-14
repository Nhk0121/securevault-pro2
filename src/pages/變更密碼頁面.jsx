/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function 變更密碼頁面() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [目前密碼, set目前密碼] = useState("");
  const [新密碼, set新密碼] = useState("");
  const [確認新密碼, set確認新密碼] = useState("");
  const [顯示, set顯示] = useState({ 目前: false, 新: false, 確認: false });
  const [載入中, set載入中] = useState(false);

  const 是強制變更 = user?.mustChangePassword;

  const 驗證密碼強度 = (pwd) => {
    if (pwd.length < 8) return "密碼至少需要 8 個字元";
    return null;
  };

  const 執行變更 = async (e) => {
    e.preventDefault();
    if (新密碼 !== 確認新密碼) {
      toast({ variant: "destructive", title: "密碼不一致", description: "新密碼與確認密碼不符" });
      return;
    }
    const 錯誤 = 驗證密碼強度(新密碼);
    if (錯誤) {
      toast({ variant: "destructive", title: "密碼強度不足", description: 錯誤 });
      return;
    }
    set載入中(true);
    try {
      await base44.auth.updateMe({ password: 新密碼 });
      await refreshUser();
      toast({ title: "密碼已更新", description: "密碼變更成功，請重新登入" });
      navigate("/", { replace: true });
    } catch (e) {
      toast({ variant: "destructive", title: "變更失敗", description: e.message || "目前密碼錯誤" });
    } finally {
      set載入中(false);
    }
  };

  const EyeToggle = ({ field }) => (
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      onClick={() => set顯示(v => ({ ...v, [field]: !v[field] }))}
    >
      {顯示[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-5 h-5" />
              {是強制變更 ? "首次登入，請變更密碼" : "變更密碼"}
            </CardTitle>
            {是強制變更 && (
              <p className="text-sm text-muted-foreground">
                系統已重置您的密碼，請設定新密碼後才能繼續使用。
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={執行變更} className="space-y-4">
              <div className="space-y-1.5">
                <Label>目前密碼</Label>
                <div className="relative">
                  <Input
                    type={顯示.目前 ? "text" : "password"}
                    value={目前密碼}
                    onChange={e => set目前密碼(e.target.value)}
                    placeholder={是強制變更 ? "重置後的臨時密碼（與帳號相同）" : "目前密碼"}
                  />
                  <EyeToggle field="目前" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>新密碼</Label>
                <div className="relative">
                  <Input
                    type={顯示.新 ? "text" : "password"}
                    value={新密碼}
                    onChange={e => set新密碼(e.target.value)}
                    placeholder="至少 8 個字元"
                  />
                  <EyeToggle field="新" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>確認新密碼</Label>
                <div className="relative">
                  <Input
                    type={顯示.確認 ? "text" : "password"}
                    value={確認新密碼}
                    onChange={e => set確認新密碼(e.target.value)}
                    placeholder="再次輸入新密碼"
                  />
                  <EyeToggle field="確認" />
                </div>
                {確認新密碼 && 新密碼 !== 確認新密碼 && (
                  <p className="text-xs text-destructive">密碼不一致</p>
                )}
                {確認新密碼 && 新密碼 === 確認新密碼 && 新密碼.length >= 8 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 密碼一致
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={載入中 || !目前密碼 || !新密碼 || 新密碼 !== 確認新密碼}
              >
                {載入中 ? "變更中..." : "確認變更密碼"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}