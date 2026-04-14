/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { users as usersApi } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Search, User, Building2 } from "lucide-react";
import { 組別列表 } from "@/lib/常數";
import { base44 } from "@/api/base44Client";

const 角色標籤 = {
  admin: { label: "管理員", class: "bg-red-100 text-red-800" },
  it_staff: { label: "資訊人員", class: "bg-purple-100 text-purple-800" },
  user: { label: "員工", class: "bg-blue-100 text-blue-800" },
};

function 聯絡卡({ 使用者 }) {
  const 角色 = 角色標籤[使用者.role] || 角色標籤.user;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">
              {(使用者.full_name || 使用者.帳號 || "?").charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{使用者.full_name || 使用者.帳號}</p>
              <Badge className={`${角色.class} text-xs`}>{角色.label}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {使用者.所屬組別 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span>{使用者.所屬組別}{使用者.所屬課別 ? ` / ${使用者.所屬課別}` : ""}</span>
                </div>
              )}
              {(使用者.電話 || 使用者.分機) && (
                <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                  <Phone className="w-3 h-3 flex-shrink-0 text-primary" />
                  <span>
                    {使用者.電話 && <span>{使用者.電話}</span>}
                    {使用者.電話 && 使用者.分機 && <span className="text-muted-foreground"> · </span>}
                    {使用者.分機 && <span>分機 {使用者.分機}</span>}
                  </span>
                </div>
              )}
              {!使用者.電話 && !使用者.分機 && (
                <p className="text-xs text-muted-foreground">— 未填聯絡電話 —</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function 電話簿頁面() {
  const [搜尋, set搜尋] = useState("");
  const [篩選組別, set篩選組別] = useState("all");
  const [篩選課別, set篩選課別] = useState("all");

  const { data: 所有使用者 = [], isLoading } = useQuery({
    queryKey: ["電話簿-使用者"],
    queryFn: () => usersApi.list(),
  });

  const { data: 課別清單 = [] } = useQuery({
    queryKey: ["電話簿-課別", 篩選組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 篩選組別 }, "排序", 100),
    enabled: 篩選組別 !== "all",
  });

  // 排除外包人員及停用帳號
  const 正式人員 = 所有使用者.filter(u => u.role !== "contractor" && !u.停用);

  const 篩選後 = 正式人員.filter(u => {
    const 關鍵字符合 = !搜尋 ||
      u.full_name?.includes(搜尋) ||
      u.帳號?.includes(搜尋) ||
      u.分機?.includes(搜尋) ||
      u.電話?.includes(搜尋) ||
      u.所屬組別?.includes(搜尋) ||
      u.所屬課別?.includes(搜尋);
    const 組別符合 = 篩選組別 === "all" || u.所屬組別 === 篩選組別;
    const 課別符合 = 篩選課別 === "all" || u.所屬課別 === 篩選課別;
    return 關鍵字符合 && 組別符合 && 課別符合;
  });

  // 依組別分群
  const 依組別分群 = 篩選組別 !== "all"
    ? { [篩選組別]: 篩選後 }
    : 組別列表.reduce((acc, g) => {
        const 成員 = 篩選後.filter(u => u.所屬組別 === g);
        if (成員.length > 0) acc[g] = 成員;
        return acc;
      }, {});

  // 未分組成員
  const 未分組 = 篩選後.filter(u => !u.所屬組別);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Phone className="w-6 h-6 text-primary" />電話簿
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          單位內部聯絡資訊（共 {正式人員.length} 人）
        </p>
      </div>

      {/* 篩選 */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋姓名、分機、課別..."
            className="pl-9"
            value={搜尋}
            onChange={e => set搜尋(e.target.value)}
          />
        </div>
        <Select value={篩選組別} onValueChange={v => { set篩選組別(v); set篩選課別("all"); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="全部組別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部組別</SelectItem>
            {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={篩選課別} onValueChange={set篩選課別} disabled={篩選組別 === "all"}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部課別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部課別</SelectItem>
            {課別清單.map(k => <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">載入中...</div>
      ) : 篩選後.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>找不到符合的聯絡人</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(依組別分群).map(([組別, 成員]) => (
            <div key={組別}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-4 h-px bg-border inline-block" />
                {組別}
                <span className="text-xs">（{成員.length} 人）</span>
                <span className="flex-1 h-px bg-border" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {成員.map(u => <聯絡卡 key={u.id} 使用者={u} />)}
              </div>
            </div>
          ))}
          {未分組.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-4 h-px bg-border inline-block" />
                未分組
                <span className="text-xs">（{未分組.length} 人）</span>
                <span className="flex-1 h-px bg-border" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {未分組.map(u => <聯絡卡 key={u.id} 使用者={u} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}