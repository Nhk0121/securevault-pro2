/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { auth, users as usersApi } from "@/api/apiClient";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Pencil, Users, Shield, KeyRound, UserX, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表, 職稱列表 } from "@/lib/常數";
import { Checkbox } from "@/components/ui/checkbox";

const 角色選項 = [
  { value: "system_admin", label: "系統管理員" },
  { value: "admin", label: "管理員" },
  { value: "it_staff", label: "資訊人員" },
  { value: "user", label: "一般使用者" },
  { value: "contractor", label: "外包人員" },
];

const 角色顏色 = {
  system_admin: "bg-red-200 text-red-900",
  admin: "bg-red-100 text-red-800",
  it_staff: "bg-purple-100 text-purple-800",
  user: "bg-blue-100 text-blue-800",
  contractor: "bg-gray-100 text-gray-800",
};

const 空表單 = {
  帳號: "", full_name: "", role: "user",
  職稱: "", 姓名代號: "", 所屬組別: "", 所屬課別: "", 電話: "", 分機: "",
  手機號碼: "", 資訊人員IP: "", 可上傳執行檔: false,
};

export default function 使用者管理頁面() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [搜尋, set搜尋] = useState("");
  const [篩選角色, set篩選角色] = useState("all");
  const [篩選組別, set篩選組別] = useState("all");
  const [篩選課別, set篩選課別] = useState("all");
  const [新增對話框, set新增對話框] = useState(false);
  const [新增表單, set新增表單] = useState(空表單);
  const [編輯使用者, set編輯使用者] = useState(null);
  const [編輯表單, set編輯表單] = useState({});
  const [重置確認, set重置確認] = useState(null); // { id, 帳號 }
  const [刪除確認, set刪除確認] = useState(null); // { id, 帳號 }

  const { data: 使用者列表 = [] } = useQuery({
    queryKey: ["使用者列表"],
    queryFn: () => usersApi.list(),
  });

  const { data: 課別清單新增 = [] } = useQuery({
    queryKey: ["組課別-新增", 新增表單.所屬組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 新增表單.所屬組別 }, "排序", 100),
    enabled: !!新增表單.所屬組別,
  });

  const { data: 課別清單編輯 = [] } = useQuery({
    queryKey: ["組課別-編輯", 編輯表單.所屬組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 編輯表單.所屬組別 }, "排序", 100),
    enabled: !!編輯表單.所屬組別,
  });

  const { data: 課別清單篩選 = [] } = useQuery({
    queryKey: ["組課別-篩選", 篩選組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 篩選組別 }, "排序", 100),
    enabled: 篩選組別 !== "all",
  });

  // ─── 新建使用者 ──────────────────────────────────────────────
  const { mutate: 建立使用者, isPending: 建立中 } = useMutation({
    mutationFn: () => usersApi.createUser(新增表單),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["使用者列表"] });
      toast({ title: "使用者已建立", description: `${新增表單.帳號} 建立成功，預設密碼為帳號，首次登入須變更` });
      set新增對話框(false);
      set新增表單(空表單);
    },
    onError: (e) => toast({ variant: "destructive", title: "建立失敗", description: e.message }),
  });

  // ─── 編輯使用者 ──────────────────────────────────────────────
  const { mutate: 儲存編輯, isPending } = useMutation({
    mutationFn: () => usersApi.update(編輯使用者.id, 編輯表單),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["使用者列表"] });
      toast({ title: "已更新使用者資料" });
      set編輯使用者(null);
    },
  });

  // ─── 刪除使用者 ──────────────────────────────────────────────
  const { mutate: 執行刪除 } = useMutation({
    mutationFn: () => usersApi.delete(刪除確認.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["使用者列表"] });
      toast({ title: "使用者已刪除", description: `${刪除確認.帳號} 帳號已刪除` });
      set刪除確認(null);
    },
    onError: (e) => toast({ variant: "destructive", title: "刪除失敗", description: e.message }),
  });

  // ─── 重置密碼 ────────────────────────────────────────────────
  const { mutate: 執行重置 } = useMutation({
    mutationFn: () => auth.resetPassword(重置確認.id),
    onSuccess: () => {
      toast({ title: "密碼已重置", description: `${重置確認.帳號} 的密碼已重置為帳號，下次登入須強制變更` });
      set重置確認(null);
    },
    onError: (e) => toast({ variant: "destructive", title: "重置失敗", description: e.message }),
  });

  const 開啟編輯 = (u) => {
    set編輯使用者(u);
    set編輯表單({
      role: u.role || "user",
      full_name: u.full_name || "",
      職稱: u.職稱 || "",
      姓名代號: u.姓名代號 || "",
      所屬組別: u.所屬組別 || "",
      所屬課別: u.所屬課別 || "",
      電話: u.電話 || "",
      分機: u.分機 || "",
      資訊人員IP: u.資訊人員IP || "",
      手機號碼: u.手機號碼 || "",
      停用: u.停用 || false,
      永久區多組別權限: u.永久區多組別權限 || [],
      可上傳執行檔: u.可上傳執行檔 || false,
    });
  };

  const 篩選後使用者 = 使用者列表.filter(u => {
    if (搜尋 && !u.full_name?.includes(搜尋) && !u.帳號?.includes(搜尋) && !u.姓名代號?.includes(搜尋) && !u.所屬課別?.includes(搜尋)) return false;
    if (篩選角色 !== "all" && u.role !== 篩選角色) return false;
    if (篩選組別 !== "all" && u.所屬組別 !== 篩選組別) return false;
    if (篩選課別 !== "all" && u.所屬課別 !== 篩選課別) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">使用者管理</h1>
        <p className="text-muted-foreground text-sm mt-1">管理所有使用者帳號與角色權限</p>
      </div>

      {/* 使用者列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            使用者列表（共 {使用者列表.length} 人）
          </CardTitle>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="搜尋姓名、帳號、課別..."
                className="w-52 pl-8"
                value={搜尋}
                onChange={e => set搜尋(e.target.value)}
              />
            </div>
            <Select value={篩選角色} onValueChange={set篩選角色}>
              <SelectTrigger className="w-32"><SelectValue placeholder="角色" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                {角色選項.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={篩選組別} onValueChange={v => { set篩選組別(v); set篩選課別("all"); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="組別" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部組別</SelectItem>
                {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={篩選課別} onValueChange={set篩選課別} disabled={篩選組別 === "all"}>
              <SelectTrigger className="w-32"><SelectValue placeholder="課別" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部課別</SelectItem>
                {課別清單篩選.map(k => <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => { set新增表單(空表單); set新增對話框(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              新增使用者
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>帳號（員工編號）</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>職稱</TableHead>
                  <TableHead>組別</TableHead>
                  <TableHead>課別</TableHead>
                  <TableHead>分機</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-28">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {篩選後使用者.map(u => (
                  <TableRow key={u.id} className={u.停用 ? "opacity-50" : ""}>
                    <TableCell>
                      <p className="font-medium font-mono">{u.帳號}</p>
                      {u.姓名代號 && <p className="text-xs text-muted-foreground font-mono">{u.姓名代號}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.職稱 || "—"}</TableCell>
                    <TableCell className="text-sm">{u.所屬組別 || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.所屬課別 || "—"}</TableCell>
                    <TableCell>{u.分機 || "—"}</TableCell>
                    <TableCell>
                      <Badge className={角色顏色[u.role] || 角色顏色.user}>
                        {角色選項.find(r => r.value === u.role)?.label || "一般使用者"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.停用
                        ? <Badge variant="outline" className="text-destructive">停用</Badge>
                        : u.mustChangePassword
                        ? <Badge variant="outline" className="text-amber-600">待改密碼</Badge>
                        : <Badge variant="outline" className="text-green-600">正常</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="編輯" onClick={() => 開啟編輯(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="重置密碼"
                          onClick={() => set重置確認({ id: u.id, 帳號: u.帳號 })}
                          >
                           <KeyRound className="w-4 h-4 text-amber-600" />
                          </Button>
                          <Button
                           variant="ghost" size="icon" title="刪除使用者"
                           onClick={() => set刪除確認({ id: u.id, 帳號: u.帳號 })}
                          >
                           <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── 新增使用者對話框 ─── */}
      <Dialog open={新增對話框} onOpenChange={set新增對話框}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              新增使用者
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">
              預設密碼與帳號相同，使用者首次登入後將強制要求變更密碼。
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>帳號 <span className="text-destructive">*</span></Label>
                <Input value={新增表單.帳號} onChange={e => set新增表單(p => ({ ...p, 帳號: e.target.value }))} placeholder="員工帳號" />
              </div>
              <div className="space-y-1.5">
                <Label>姓名</Label>
                <Input value={新增表單.full_name} onChange={e => set新增表單(p => ({ ...p, full_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>角色</Label>
                <Select value={新增表單.role} onValueChange={v => set新增表單(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {角色選項.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>職稱</Label>
                <Select value={新增表單.職稱} onValueChange={v => set新增表單(p => ({ ...p, 職稱: v }))}>
                  <SelectTrigger><SelectValue placeholder="選擇職稱" /></SelectTrigger>
                  <SelectContent>
                    {職稱列表.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>所屬組別</Label>
                <Select value={新增表單.所屬組別} onValueChange={v => set新增表單(p => ({ ...p, 所屬組別: v, 所屬課別: "" }))}>
                  <SelectTrigger><SelectValue placeholder="選擇組別" /></SelectTrigger>
                  <SelectContent>{組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>所屬課別</Label>
                <Select value={新增表單.所屬課別} onValueChange={v => set新增表單(p => ({ ...p, 所屬課別: v }))} disabled={!新增表單.所屬組別}>
                  <SelectTrigger><SelectValue placeholder={新增表單.所屬組別 ? "選擇課別" : "請先選組別"} /></SelectTrigger>
                  <SelectContent>{課別清單新增.map(k => <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>姓名代號</Label>
                <Input value={新增表單.姓名代號} maxLength={6} onChange={e => set新增表單(p => ({ ...p, 姓名代號: e.target.value }))} placeholder="6位數字" />
              </div>
              <div className="space-y-1.5">
                <Label>分機</Label>
                <Input value={新增表單.分機} onChange={e => set新增表單(p => ({ ...p, 分機: e.target.value }))} />
              </div>
            </div>
            {新增表單.role === "it_staff" && (
              <div className="space-y-1.5">
                <Label>資訊人員IP白名單</Label>
                <Input value={新增表單.資訊人員IP} onChange={e => set新增表單(p => ({ ...p, 資訊人員IP: e.target.value }))} placeholder="192.168.1.10, 192.168.1.11" />
              </div>
            )}
            {新增表單.role === "contractor" && (
              <div className="space-y-1.5">
                <Label>手機號碼</Label>
                <Input value={新增表單.手機號碼} maxLength={10} onChange={e => set新增表單(p => ({ ...p, 手機號碼: e.target.value.replace(/\D/g, "") }))} placeholder="10位數字" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => set新增對話框(false)}>取消</Button>
            <Button onClick={() => 建立使用者()} disabled={建立中 || !新增表單.帳號}>
              {建立中 ? "建立中..." : "建立使用者"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 編輯對話框 ─── */}
      <Dialog open={!!編輯使用者} onOpenChange={() => set編輯使用者(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              編輯使用者：{編輯使用者?.full_name || 編輯使用者?.帳號}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>角色</Label>
                <Select value={編輯表單.role} onValueChange={v => set編輯表單(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{角色選項.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>職稱</Label>
                <Select value={編輯表單.職稱} onValueChange={v => set編輯表單(p => ({ ...p, 職稱: v }))}>
                  <SelectTrigger><SelectValue placeholder="選擇職稱" /></SelectTrigger>
                  <SelectContent>{職稱列表.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>員工編號（不可更改）</Label>
                <Input value={編輯表單.姓名代號} readOnly disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>所屬組別</Label>
                <Select value={編輯表單.所屬組別} onValueChange={v => set編輯表單(p => ({ ...p, 所屬組別: v, 所屬課別: "" }))}>
                  <SelectTrigger><SelectValue placeholder="選擇組別" /></SelectTrigger>
                  <SelectContent>{組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>所屬課別</Label>
                <Select value={編輯表單.所屬課別} onValueChange={v => set編輯表單(p => ({ ...p, 所屬課別: v }))} disabled={!編輯表單.所屬組別}>
                  <SelectTrigger><SelectValue placeholder={編輯表單.所屬組別 ? "選擇課別" : "請先選組別"} /></SelectTrigger>
                  <SelectContent>{課別清單編輯.map(k => <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>)}</SelectContent>
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
                <Label>資訊人員IP白名單</Label>
                <Input value={編輯表單.資訊人員IP} onChange={e => set編輯表單(p => ({ ...p, 資訊人員IP: e.target.value }))} placeholder="192.168.1.10, 192.168.1.11" />
              </div>
            )}
            {編輯表單.role === "contractor" && (
              <div className="space-y-1.5">
                <Label>手機號碼</Label>
                <Input value={編輯表單.手機號碼} maxLength={10} onChange={e => set編輯表單(p => ({ ...p, 手機號碼: e.target.value.replace(/\D/g, "") }))} placeholder="10位數字" />
              </div>
            )}

            {/* 永久區多組別權限 */}
            {(編輯表單.role === "user" || 編輯表單.role === "it_staff") && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  永久區多組別操作權限
                </Label>
                <p className="text-xs text-muted-foreground">除所屬組別外，額外授予哪些組別的永久區上傳/刪除權限</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto border rounded p-2">
                  {組別列表.map(g => (
                    <div key={g} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${g}`}
                        checked={(編輯表單.永久區多組別權限 || []).includes(g)}
                        onCheckedChange={(checked) => {
                          set編輯表單(p => {
                            const cur = p.永久區多組別權限 || [];
                            return {
                              ...p,
                              永久區多組別權限: checked ? [...cur, g] : cur.filter(x => x !== g)
                            };
                          });
                        }}
                      />
                      <label htmlFor={`perm-${g}`} className="text-xs cursor-pointer">{g}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 執行檔上傳授權 */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Checkbox
                id="exe-perm"
                checked={!!編輯表單.可上傳執行檔}
                onCheckedChange={v => set編輯表單(p => ({ ...p, 可上傳執行檔: !!v }))}
              />
              <div>
                <label htmlFor="exe-perm" className="text-sm font-medium cursor-pointer">授權上傳執行檔</label>
                <p className="text-xs text-muted-foreground">允許此使用者上傳 .exe, .bat, .cmd 等執行檔</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label>帳號狀態</Label>
              <Button
                variant={編輯表單.停用 ? "default" : "outline"}
                size="sm"
                className={編輯表單.停用 ? "" : "text-destructive border-destructive"}
                onClick={() => set編輯表單(p => ({ ...p, 停用: !p.停用 }))}
              >
                <UserX className="w-4 h-4 mr-1" />
                {編輯表單.停用 ? "啟用帳號" : "停用帳號"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => set編輯使用者(null)}>取消</Button>
            <Button onClick={() => 儲存編輯()} disabled={isPending}>
              {isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 刪除確認 ─── */}
      <AlertDialog open={!!刪除確認} onOpenChange={() => set刪除確認(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              確認刪除使用者
            </AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「<strong>{刪除確認?.帳號}</strong>」帳號嗎？<br />
              此操作無法復原，通常用於員工離職後的帳號清除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => 執行刪除()}>確認刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── 重置密碼確認 ─── */}
      <AlertDialog open={!!重置確認} onOpenChange={() => set重置確認(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              確認重置密碼
            </AlertDialogTitle>
            <AlertDialogDescription>
              確定要重置「<strong>{重置確認?.帳號}</strong>」的密碼嗎？<br />
              重置後密碼將與帳號相同，使用者下次登入時將強制要求變更密碼。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => 執行重置()}>確認重置</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}