/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardDrive, CheckCircle2, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表 } from "@/lib/常數";

export default function 使用者申請頁面() {
  const { toast } = useToast();
  const [已送出, set已送出] = useState(false);
  const [載入中, set載入中] = useState(false);
  const [表單, set表單] = useState({
    姓名: "",
    員工編號: "",
    電話: "",
    分機: "",
    所屬組別: "",
    所屬課別: "",
  });

  const 更新欄位 = (欄位, 值) => set表單(p => ({ ...p, [欄位]: 值 }));

  const 送出申請 = async (e) => {
    e.preventDefault();
    if (!表單.姓名 || !表單.所屬組別) return;
    set載入中(true);
    try {
      await base44.entities.操作日誌.create({
        操作類型: "登入",
        操作者: 表單.姓名,
        目標檔案: "帳號申請",
        詳細內容: `【帳號申請】姓名：${表單.姓名}，員工編號：${表單.員工編號}，組別：${表單.所屬組別}，課別：${表單.所屬課別}，電話：${表單.電話}，分機：${表單.分機}`,
        所屬組別: 表單.所屬組別,
        是否異常: false,
      });
      set已送出(true);
    } catch {
      toast({ variant: "destructive", title: "送出失敗", description: "請稍後再試或聯繫管理員" });
    } finally {
      set載入中(false);
    }
  };

  if (已送出) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">申請已送出</h2>
            <p className="text-muted-foreground text-sm">
              管理員將審核您的申請後建立帳號，並通知您。<br />
              若有疑問請聯繫資訊部門。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* 標題 */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 bg-primary rounded-2xl">
            <HardDrive className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">雲端檔案管理系統</h1>
            <p className="text-muted-foreground text-sm mt-1">員工帳號申請</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />申請使用帳號
            </CardTitle>
            <CardDescription>
              請填寫以下資料，管理員審核後將通知您帳號資訊
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={送出申請} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>姓名 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="真實姓名"
                    value={表單.姓名}
                    onChange={e => 更新欄位("姓名", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>員工編號</Label>
                  <Input
                    placeholder="6位數字"
                    maxLength={6}
                    value={表單.員工編號}
                    onChange={e => 更新欄位("員工編號", e.target.value)}
                  />
                </div>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>聯絡電話</Label>
                  <Input
                    placeholder="例如 3392121"
                    value={表單.電話}
                    onChange={e => 更新欄位("電話", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>分機</Label>
                  <Input
                    placeholder="例如 2339"
                    value={表單.分機}
                    onChange={e => 更新欄位("分機", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>所屬組別 <span className="text-destructive">*</span></Label>
                  <Select value={表單.所屬組別} onValueChange={v => 更新欄位("所屬組別", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇組別" />
                    </SelectTrigger>
                    <SelectContent>
                      {組別列表.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>所屬課別</Label>
                  <Input
                    placeholder="課別名稱（選填）"
                    value={表單.所屬課別}
                    onChange={e => 更新欄位("所屬課別", e.target.value)}
                  />
                </div>
              </div>


              <Button
                className="w-full"
                type="submit"
                disabled={載入中 || !表單.姓名 || !表單.所屬組別}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {載入中 ? "送出中..." : "送出申請"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                已有帳號？請至{" "}
                <a href="/login" className="text-primary underline">登入頁面</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}