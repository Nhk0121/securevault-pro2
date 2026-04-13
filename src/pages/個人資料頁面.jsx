/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表 } from "@/lib/常數";

const 角色標籤 = {
  admin: { label: "管理員", color: "bg-red-100 text-red-800" },
  it_staff: { label: "資訊人員", color: "bg-purple-100 text-purple-800" },
  user: { label: "一般使用者", color: "bg-blue-100 text-blue-800" },
  contractor: { label: "外包人員", color: "bg-gray-100 text-gray-800" },
};

export default function 個人資料頁面() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [表單, set表單] = useState({
    姓名代號: "",
    所屬組別: "",
    所屬課別: "",
    電話: "",
    分機: "",
  });

  const { data: 我 } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: 課別清單 = [] } = useQuery({
    queryKey: ["組課別", 表單.所屬組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 表單.所屬組別 }, "排序", 100),
    enabled: !!表單.所屬組別,
  });

  useEffect(() => {
    if (我) {
      set表單({
        姓名代號: 我.姓名代號 || "",
        所屬組別: 我.所屬組別 || "",
        所屬課別: 我.所屬課別 || "",
        電話: 我.電話 || "",
        分機: 我.分機 || "",
      });
    }
  }, [我]);

  const 更換組別 = (v) => {
    set表單(prev => ({ ...prev, 所屬組別: v, 所屬課別: "" }));
  };

  const { mutate: 儲存, isPending } = useMutation({
    mutationFn: async () => {
      // 驗證姓名代號為6位數字
      if (表單.姓名代號 && !/^\d{6}$/.test(表單.姓名代號)) {
        throw new Error("姓名代號必須為6位數字");
      }
      await base44.auth.updateMe({
        ...表單,
        資料填寫完成: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "儲存成功", description: "個人資料已更新" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "儲存失敗", description: err.message });
    },
  });

  const 角色資訊 = 角色標籤[我?.role] || 角色標籤.user;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">個人資料</h1>
        <p className="text-muted-foreground text-sm mt-1">維護您的個人基本資訊</p>
      </div>

      {/* 帳號資訊（唯讀） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            帳號資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">電子信箱</span>
            <span className="font-medium">{我?.email || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">顯示名稱</span>
            <span className="font-medium">{我?.full_name || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">角色</span>
            <Badge className={角色資訊.color}>{角色資訊.label}</Badge>
          </div>
          {我?.資料填寫完成 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 pt-1">
              <CheckCircle className="w-4 h-4" />
              資料已完成填寫
            </div>
          )}
        </CardContent>
      </Card>

      {/* 可編輯欄位 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">個人資料設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>姓名代號 <span className="text-muted-foreground text-xs">（6位數字）</span></Label>
              <Input
                placeholder="例：123456"
                value={表單.姓名代號}
                maxLength={6}
                onChange={e => set表單(p => ({ ...p, 姓名代號: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>電話</Label>
              <Input
                placeholder="聯絡電話"
                value={表單.電話}
                onChange={e => set表單(p => ({ ...p, 電話: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>所屬組別</Label>
              <Select value={表單.所屬組別} onValueChange={更換組別}>
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
              <Select
                value={表單.所屬課別}
                onValueChange={v => set表單(p => ({ ...p, 所屬課別: v }))}
                disabled={!表單.所屬組別}
              >
                <SelectTrigger>
                  <SelectValue placeholder={表單.所屬組別 ? (課別清單.length === 0 ? "此組別尚無課別" : "選擇課別") : "請先選組別"} />
                </SelectTrigger>
                <SelectContent>
                  {課別清單.map(k => (
                    <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>分機</Label>
            <Input
              placeholder="辦公室分機"
              value={表單.分機}
              onChange={e => set表單(p => ({ ...p, 分機: e.target.value }))}
            />
          </div>

          <div className="pt-2">
            <Button onClick={() => 儲存()} disabled={isPending} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "儲存中..." : "儲存資料"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}