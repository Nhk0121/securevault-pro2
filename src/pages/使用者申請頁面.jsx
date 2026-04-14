/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardDrive, CheckCircle2, UserPlus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表, 職稱列表 } from "@/lib/常數";

const 表單類型 = ["employee", "contractor"];

const 空員工表單 = {
  姓名: "", 職稱: "", 員工編號: "", 電話: "", 分機: "", 所屬組別: "", 所屬課別: "",
};

const 空外包表單 = {
  姓名: "", 手機號碼: "", 所屬組別: "", 所屬課別: "",
};

export default function 使用者申請頁面() {
  const { toast } = useToast();
  const [已送出, set已送出] = useState(false);
  const [載入中, set載入中] = useState(false);
  const [申請類型, set申請類型] = useState("employee");
  const [員工表單, set員工表單] = useState(空員工表單);
  const [外包表單, set外包表單] = useState(空外包表單);

  const 更新員工欄位 = (欄位, 值) => set員工表單(p => ({ ...p, [欄位]: 值 }));
  const 更新外包欄位 = (欄位, 值) => set外包表單(p => ({ ...p, [欄位]: 值 }));

  const 送出申請 = async (e) => {
    e.preventDefault();
    const 是外包 = 申請類型 === "contractor";

    if (是外包) {
      if (!外包表單.姓名 || !外包表單.手機號碼 || !外包表單.所屬組別) return;
      if (!/^\d{10}$/.test(外包表單.手機號碼)) {
        toast({ variant: "destructive", title: "格式錯誤", description: "手機號碼必須為10位數字" });
        return;
      }
    } else {
      if (!員工表單.姓名 || !員工表單.所屬組別) return;
    }

    set載入中(true);
    try {
      if (是外包) {
        await base44.entities.操作日誌.create({
          操作類型: "登入",
          操作者: 外包表單.姓名,
          目標檔案: "外包人員帳號申請",
          詳細內容: `【外包人員申請】姓名：${外包表單.姓名}，手機：${外包表單.手機號碼}，組別：${外包表單.所屬組別}，課別：${外包表單.所屬課別}`,
          所屬組別: 外包表單.所屬組別,
          是否異常: false,
        });
      } else {
        await base44.entities.操作日誌.create({
          操作類型: "登入",
          操作者: 員工表單.姓名,
          目標檔案: "帳號申請",
          詳細內容: `【帳號申請】姓名：${員工表單.姓名}，員工編號：${員工表單.員工編號}，組別：${員工表單.所屬組別}，課別：${員工表單.所屬課別}，電話：${員工表單.電話}，分機：${員工表單.分機}`,
          所屬組別: 員工表單.所屬組別,
          是否異常: false,
        });
      }
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
            <p className="text-muted-foreground text-sm mt-1">帳號申請</p>
          </div>
        </div>

        {/* 申請類型切換 */}
        <div className="flex rounded-lg border overflow-hidden">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${申請類型 === "employee" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            onClick={() => set申請類型("employee")}
          >
            <UserPlus className="w-4 h-4 inline mr-1.5" />
            員工帳號申請
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium transition-colors ${申請類型 === "contractor" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            onClick={() => set申請類型("contractor")}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            外包人員申請
          </button>
        </div>

        {/* 員工申請表單 */}
        {申請類型 === "employee" && (
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
                      value={員工表單.姓名}
                      onChange={e => 更新員工欄位("姓名", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>員工編號</Label>
                    <Input
                      placeholder="6位數字"
                      maxLength={6}
                      value={員工表單.員工編號}
                      onChange={e => 更新員工欄位("員工編號", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>職稱</Label>
                  <Select value={員工表單.職稱} onValueChange={v => 更新員工欄位("職稱", v)}>
                    <SelectTrigger><SelectValue placeholder="選擇職稱（選填）" /></SelectTrigger>
                    <SelectContent>
                      {職稱列表.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>聯絡電話</Label>
                    <Input
                      placeholder="例如 3392121"
                      value={員工表單.電話}
                      onChange={e => 更新員工欄位("電話", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>分機</Label>
                    <Input
                      placeholder="例如 2339"
                      value={員工表單.分機}
                      onChange={e => 更新員工欄位("分機", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>所屬組別 <span className="text-destructive">*</span></Label>
                    <Select value={員工表單.所屬組別} onValueChange={v => 更新員工欄位("所屬組別", v)}>
                      <SelectTrigger><SelectValue placeholder="選擇組別" /></SelectTrigger>
                      <SelectContent>
                        {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>所屬課別</Label>
                    <Input
                      placeholder="課別名稱（選填）"
                      value={員工表單.所屬課別}
                      onChange={e => 更新員工欄位("所屬課別", e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  type="submit"
                  disabled={載入中 || !員工表單.姓名 || !員工表單.所屬組別}
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
        )}

        {/* 外包人員申請表單 */}
        {申請類型 === "contractor" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />外包人員申請
              </CardTitle>
              <CardDescription>
                請填寫基本資料，管理員審核後將通知您帳號資訊
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={送出申請} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>姓名 <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="真實姓名"
                      value={外包表單.姓名}
                      onChange={e => 更新外包欄位("姓名", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>手機號碼 <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="10位數字"
                      maxLength={10}
                      value={外包表單.手機號碼}
                      onChange={e => 更新外包欄位("手機號碼", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>所屬組別 <span className="text-destructive">*</span></Label>
                    <Select value={外包表單.所屬組別} onValueChange={v => 更新外包欄位("所屬組別", v)}>
                      <SelectTrigger><SelectValue placeholder="選擇組別" /></SelectTrigger>
                      <SelectContent>
                        {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>所屬課別</Label>
                    <Input
                      placeholder="課別名稱（選填）"
                      value={外包表單.所屬課別}
                      onChange={e => 更新外包欄位("所屬課別", e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  type="submit"
                  disabled={載入中 || !外包表單.姓名 || !外包表單.手機號碼 || !外包表單.所屬組別}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {載入中 ? "送出中..." : "送出申請"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  已有帳號？請至{" "}
                  <a href="/login" className="text-primary underline">登入頁面</a>
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}