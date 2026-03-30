import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Pencil, Users, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表 } from "@/lib/常數";

const 角色選項 = [
  { value: "admin", label: "管理員" },
  { value: "it_staff", label: "資訊人員" },
  { value: "user", label: "一般使用者" },
  { value: "contractor", label: "外包人員" },
];

const 角色顏色 = {
  admin: "bg-red-100 text-red-800",
  it_staff: "bg-purple-100 text-purple-800",
  user: "bg-blue-100 text-blue-800",
  contractor: "bg-gray-100 text-gray-800",
};

export default function 使用者管理頁面() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [邀請郵件, set邀請郵件] = useState("");
  const [邀請角色, set邀請角色] = useState("user");
  const [搜尋, set搜尋] = useState("");
  const [編輯使用者, set編輯使用者] = useState(null);
  const [編輯表單, set編輯表單] = useState({});

  const { data: 使用者列表 = [] } = useQuery({
    queryKey: ["使用者列表"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
  });

  const { data: 課別清單 = [] } = useQuery({
    queryKey: ["組課別", 編輯表單.所屬組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 編輯表單.所屬組別 }, "排序", 100),
    enabled: !!編輯表單.所屬組別,
  });

  const 邀請使用者 = async () => {
    if (!邀請郵件.trim()) return;
    await base44.users.inviteUser(邀請郵件.trim(), 邀請角色 === "admin" ? "admin" : "user");
    toast({ title: "邀請已送出", description: `已邀請 ${邀請郵件}` });
    set邀請郵件("");
  };

  const { mutate: 儲存編輯, isPending } = useMutation({
    mutationFn: () => base44.entities.User.update(編輯使用者.id, 編輯表單),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["使用者列表"] });
      toast({ title: "已更新使用者資料" });
      set編輯使用者(null);
    },
  });

  const 開啟編輯 = (u) => {
    set編輯使用者(u);
    set編輯表單({
      role: u.role || "user",
      姓名代號: u.姓名代號 || "",
      所屬組別: u.所屬組別 || "",
      所屬課別: u.所屬課別 || "",
      電話: u.電話 || "",
      分機: u.分機 || "",
      資訊人員IP: u.資訊人員IP || "",
    });
  };

  const 更換編輯組別 = (v) => {
    set編輯表單(prev => ({ ...prev, 所屬組別: v, 所屬課別: "" }));
  };

  const 篩選後使用者 = 使用者列表.filter(u =>
    !搜尋 ||
    u.email?.includes(搜尋) ||
    u.full_name?.includes(搜尋) ||
    u.姓名代號?.includes(搜尋)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">使用者管理</h1>
        <p className="text-muted-foreground text-sm mt-1">管理所有使用者帳號與角色權限</p>
      </div>

      {/* 邀請新使用者 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            邀請新使用者
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5 flex-1 min-w-48">
              <Label>電子信箱</Label>
              <Input
                placeholder="user@example.com"
                value={邀請郵件}
                onChange={e => set邀請郵件(e.target.value)}
                onKeyDown={e => e.key === "Enter" && 邀請使用者()}
              />
            </div>
            <div className="space-y-1.5 w-44">
              <Label>初始角色</Label>
              <Select value={邀請角色} onValueChange={set邀請角色}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {角色選項.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={邀請使用者} disabled={!邀請郵件.trim()}>
              <UserPlus className="w-4 h-4 mr-2" />
              送出邀請
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            受邀者將收到 Email 邀請，首次登入後可至個人資料頁完成資料填寫。
          </p>
        </CardContent>
      </Card>

      {/* 使用者列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            使用者列表（共 {使用者列表.length} 人）
          </CardTitle>
          <Input
            placeholder="搜尋姓名、信箱、代號..."
            className="w-64"
            value={搜尋}
            onChange={e => set搜尋(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名 / 信箱</TableHead>
                  <TableHead>代號</TableHead>
                  <TableHead>組別 / 課別</TableHead>
                  <TableHead>分機</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {篩選後使用者.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{u.姓名代號 || "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{u.所屬組別 || "—"}</p>
                        {u.所屬課別 && <p className="text-muted-foreground text-xs">{u.所屬課別}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{u.分機 || "—"}</TableCell>
                    <TableCell>
                      <Badge className={角色顏色[u.role] || 角色顏色.user}>
                        {角色選項.find(r => r.value === u.role)?.label || "一般使用者"}
                      </Badge>
                      {u.role === "it_staff" && u.資訊人員IP && (
                        <p className="text-xs text-muted-foreground mt-0.5">IP: {u.資訊人員IP}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => 開啟編輯(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 編輯對話框 */}
      <Dialog open={!!編輯使用者} onOpenChange={() => set編輯使用者(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              編輯使用者：{編輯使用者?.full_name || 編輯使用者?.email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>角色</Label>
                <Select value={編輯表單.role} onValueChange={v => set編輯表單(p => ({ ...p, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {角色選項.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>姓名代號（6位數字）</Label>
                <Input
                  value={編輯表單.姓名代號}
                  maxLength={6}
                  onChange={e => set編輯表單(p => ({ ...p, 姓名代號: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>所屬組別</Label>
                <Select value={編輯表單.所屬組別} onValueChange={更換編輯組別}>
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
                  value={編輯表單.所屬課別}
                  onValueChange={v => set編輯表單(p => ({ ...p, 所屬課別: v }))}
                  disabled={!編輯表單.所屬組別}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={編輯表單.所屬組別 ? "選擇課別" : "請先選組別"} />
                  </SelectTrigger>
                  <SelectContent>
                    {課別清單.map(k => (
                      <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>電話</Label>
                <Input value={編輯表單.電話} onChange={e => set編輯表單(p => ({ ...p, 電話: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>分機</Label>
                <Input value={編輯表單.分機} onChange={e => set編輯表單(p => ({ ...p, 分機: e.target.value }))} />
              </div>
            </div>

            {編輯表單.role === "it_staff" && (
              <div className="space-y-1.5">
                <Label>資訊人員IP白名單 <span className="text-muted-foreground text-xs">（多個IP用逗號分隔）</span></Label>
                <Input
                  placeholder="例：192.168.1.10, 192.168.1.11"
                  value={編輯表單.資訊人員IP}
                  onChange={e => set編輯表單(p => ({ ...p, 資訊人員IP: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => set編輯使用者(null)}>取消</Button>
            <Button onClick={() => 儲存編輯()} disabled={isPending}>
              {isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}