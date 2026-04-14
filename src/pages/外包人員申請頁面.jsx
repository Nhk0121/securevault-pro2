/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { UserPlus, Building2, Clock, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表 } from "@/lib/常數";

export default function 外包人員申請頁面() {
  const { toast } = useToast();
  const [我, set我] = useState(null);
  const [邀請郵件, set邀請郵件] = useState("");
  const [邀請公司, set邀請公司] = useState("");
  const [負責組別, set負責組別] = useState("");

  useEffect(() => {
    base44.auth.me().then(set我).catch(() => {});
  }, []);

  const { data: 所有使用者 = [] } = useQuery({
    queryKey: ["使用者列表-外包"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
  });

  const 外包人員列表 = 所有使用者.filter(u => u.role === "contractor");

  const 邀請外包 = async () => {
    if (!邀請郵件.trim() || !負責組別) return;
    await base44.users.inviteUser(邀請郵件.trim(), "user");
    toast({
      title: "邀請已送出",
      description: `已邀請外包人員 ${邀請郵件}，請在使用者管理頁面將角色改為「外包人員」`,
    });
    set邀請郵件("");
    set邀請公司("");
    set負責組別("");
  };

  const 是管理員 = 我?.role === "admin";

  if (!是管理員) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">僅管理員可存取此頁面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">外包人員管理</h1>
        <p className="text-muted-foreground text-sm mt-1">管理外包廠商人員帳號</p>
      </div>

      {/* 外包人員權限說明 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-medium">外包人員限制說明</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>僅能存取<strong>時效區</strong>（永久區不開放）</li>
                <li>可上傳、下載、預覽時效區檔案</li>
                <li>不可刪除任何檔案</li>
                <li>不可存取稽核日誌、審核管理、系統設定等管理功能</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邀請外包人員 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            邀請外包人員
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>電子信箱</Label>
              <Input
                placeholder="contractor@company.com"
                value={邀請郵件}
                onChange={e => set邀請郵件(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>廠商公司名稱</Label>
              <Input
                placeholder="公司名稱（備註用）"
                value={邀請公司}
                onChange={e => set邀請公司(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>負責組別</Label>
              <Select value={負責組別} onValueChange={set負責組別}>
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
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={邀請外包} disabled={!邀請郵件.trim() || !負責組別}>
              <UserPlus className="w-4 h-4 mr-2" />
              送出邀請
            </Button>
            <p className="text-xs text-muted-foreground">
              送出後請至「使用者管理」將該帳號角色設為「外包人員」
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 目前外包人員列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            目前外包人員（共 {外包人員列表.length} 人）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {外包人員列表.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">尚無外包人員帳號</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>手機號碼</TableHead>
                  <TableHead>所屬組別</TableHead>
                  <TableHead>所屬課別</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {外包人員列表.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{u.手機號碼 || "—"}</TableCell>
                    <TableCell>{u.所屬組別 || "—"}</TableCell>
                    <TableCell>{u.所屬課別 || "—"}</TableCell>
                    <TableCell>
                      <Badge className="bg-gray-100 text-gray-800">外包人員</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}