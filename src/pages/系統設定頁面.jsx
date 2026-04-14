/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Save, Shield, Wifi, Users, Settings, Type, HardDrive } from "lucide-react";
import { 組別列表 } from "@/lib/常數";
import { useToast } from "@/components/ui/use-toast";

export default function 系統設定頁面() {
  const [使用者, set使用者] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(set使用者).catch(() => {});
  }, []);

  const { data: 設定列表 = [] } = useQuery({
    queryKey: ["系統設定"],
    queryFn: () => base44.entities.系統設定.list(),
  });

  const 設定 = 設定列表[0] || {};
  const [系統名稱, set系統名稱] = useState("雲端檔案管理系統");
  const [系統副標題, set系統副標題] = useState("");
  const [允許IP, set允許IP] = useState([]);
  const [新IP, set新IP] = useState("");
  const [審核人清單, set審核人清單] = useState([]);
  const [時效天數, set時效天數] = useState(30);
  const [檔名上限, set檔名上限] = useState(50);
  const [資料夾名上限, set資料夾名上限] = useState(30);
  const [異常次數, set異常次數] = useState(20);
  const [異常分鐘, set異常分鐘] = useState(10);
  const [各組空間, set各組空間] = useState([]);

  // new reviewer
  const [新審核組別, set新審核組別] = useState("");
  const [新審核信箱, set新審核信箱] = useState("");
  const [新審核IP, set新審核IP] = useState("");

  // new group space
  const [新空間組別, set新空間組別] = useState("");
  const [新空間MB, set新空間MB] = useState("");

  useEffect(() => {
    if (設定.id) {
      set系統名稱(設定.系統名稱 || "雲端檔案管理系統");
      set系統副標題(設定.系統副標題 || "");
      set允許IP(設定.允許上傳執行檔IP || []);
      set審核人清單(設定.組別審核人 || []);
      set時效天數(設定.時效區天數 || 30);
      set檔名上限(設定.檔案名稱長度上限 || 50);
      set資料夾名上限(設定.資料夾名稱長度上限 || 30);
      set異常次數(設定.異常偵測下載次數 || 20);
      set異常分鐘(設定.異常偵測時間範圍分鐘 || 10);
      set各組空間(設定.各組空間限制MB || []);
    }
  }, [設定.id]);

  const 是否為管理員 = 使用者?.role === "admin" || 使用者?.role === "system_admin";

  const 新增IP = () => {
    if (!新IP.trim()) return;
    set允許IP(prev => [...prev, 新IP.trim()]);
    set新IP("");
  };

  const 移除IP = (idx) => {
    set允許IP(prev => prev.filter((_, i) => i !== idx));
  };

  const 新增審核人 = () => {
    if (!新審核組別 || !新審核信箱.trim()) return;
    set審核人清單(prev => [...prev, { 組別: 新審核組別, 審核人信箱: 新審核信箱.trim(), 審核人IP: 新審核IP.trim() }]);
    set新審核組別("");
    set新審核信箱("");
    set新審核IP("");
  };

  const 移除審核人 = (idx) => {
    set審核人清單(prev => prev.filter((_, i) => i !== idx));
  };

  const 新增組空間 = () => {
    if (!新空間組別 || !新空間MB) return;
    const mb = Number(新空間MB);
    if (isNaN(mb) || mb <= 0) return;
    set各組空間(prev => {
      const filtered = prev.filter(x => x.組別 !== 新空間組別);
      return [...filtered, { 組別: 新空間組別, 上限MB: mb }];
    });
    set新空間組別("");
    set新空間MB("");
  };

  const 移除組空間 = (組別) => {
    set各組空間(prev => prev.filter(x => x.組別 !== 組別));
  };

  const 儲存設定 = async () => {
    const data = {
      設定名稱: "主要設定",
      系統名稱: 系統名稱.trim() || "雲端檔案管理系統",
      系統副標題: 系統副標題.trim(),
      允許上傳執行檔IP: 允許IP,
      組別審核人: 審核人清單,
      各組空間限制MB: 各組空間,
      時效區天數: 時效天數,
      檔案名稱長度上限: 檔名上限,
      資料夾名稱長度上限: 資料夾名上限,
      異常偵測下載次數: 異常次數,
      異常偵測時間範圍分鐘: 異常分鐘,
    };

    if (設定.id) {
      await base44.entities.系統設定.update(設定.id, data);
    } else {
      await base44.entities.系統設定.create(data);
    }

    toast({ title: "儲存成功", description: "系統設定已更新" });
    queryClient.invalidateQueries({ queryKey: ["系統設定"] });
  };

  if (!是否為管理員) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">權限不足</h2>
        <p className="text-muted-foreground">只有管理員可以存取系統設定</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">系統設定</h1>
        <p className="text-sm text-muted-foreground mt-1">管理檔案系統的全域設定</p>
      </div>

      {/* 系統名稱 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-5 h-5" />系統名稱設定
          </CardTitle>
          <CardDescription>自訂顯示在歡迎橫幅與頁首的系統名稱</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>系統名稱</Label>
              <Input
                value={系統名稱}
                onChange={e => set系統名稱(e.target.value)}
                placeholder="雲端檔案管理系統"
              />
            </div>
            <div>
              <Label>系統副標題（選填）</Label>
              <Input
                value={系統副標題}
                onChange={e => set系統副標題(e.target.value)}
                placeholder="企業文件管理平台"
              />
            </div>
          </div>
          <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground">
            目前名稱：<span className="font-semibold text-foreground">{系統名稱 || "雲端檔案管理系統"}</span>
            {系統副標題 && <span className="ml-2 opacity-70">・{系統副標題}</span>}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-5 h-5" />一般設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>時效區保留天數</Label>
              <Input type="number" value={時效天數} onChange={e => set時效天數(Number(e.target.value))} />
            </div>
            <div>
              <Label>檔案名稱長度上限</Label>
              <Input type="number" value={檔名上限} onChange={e => set檔名上限(Number(e.target.value))} />
            </div>
            <div>
              <Label>資料夾名稱長度上限</Label>
              <Input type="number" value={資料夾名上限} onChange={e => set資料夾名上限(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 各組空間限制 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="w-5 h-5" />各組別儲存空間限制
          </CardTitle>
          <CardDescription>設定各組別的最大儲存空間上限（MB），未設定則不限制</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {各組空間.length === 0 && (
              <p className="text-sm text-muted-foreground">尚未設定任何組別空間限制</p>
            )}
            {各組空間.sort((a, b) => a.組別.localeCompare(b.組別)).map((item) => (
              <div key={item.組別} className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
                <Badge variant="outline" className="shrink-0">{item.組別}</Badge>
                <span className="text-sm font-medium flex-1">
                  {item.上限MB >= 1024
                    ? `${(item.上限MB / 1024).toFixed(1)} GB`
                    : `${item.上限MB} MB`}
                </span>
                <button onClick={() => 移除組空間(item.組別)} className="ml-auto">
                  <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
          <Separator />
          <div className="grid sm:grid-cols-4 gap-2 items-end">
            <div>
              <Label className="text-xs mb-1 block">組別</Label>
              <Select value={新空間組別} onValueChange={set新空間組別}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇組別" />
                </SelectTrigger>
                <SelectContent>
                  {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">上限（MB）</Label>
              <Input
                type="number"
                placeholder="例：1024"
                value={新空間MB}
                onChange={e => set新空間MB(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground pt-4">
              {新空間MB && Number(新空間MB) >= 1024
                ? `≈ ${(Number(新空間MB) / 1024).toFixed(1)} GB`
                : ""}
            </div>
            <Button variant="outline" onClick={新增組空間}>
              <Plus className="w-4 h-4 mr-1" />新增
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5" />異常偵測設定
          </CardTitle>
          <CardDescription>短時間內大量下載偵測門檻</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>觸發次數（下載次數）</Label>
              <Input type="number" value={異常次數} onChange={e => set異常次數(Number(e.target.value))} />
            </div>
            <div>
              <Label>時間範圍（分鐘）</Label>
              <Input type="number" value={異常分鐘} onChange={e => set異常分鐘(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowed IPs for exe upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-5 h-5" />允許上傳執行檔的 IP
          </CardTitle>
          <CardDescription>只有在此清單中的 IP 位址可以上傳 .exe 等執行檔</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {允許IP.map((ip, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1 px-3 py-1">
                {ip}
                <button onClick={() => 移除IP(idx)}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
            {允許IP.length === 0 && <p className="text-sm text-muted-foreground">尚未設定</p>}
          </div>
          <div className="flex gap-2">
            <Input placeholder="輸入 IP 位址" value={新IP} onChange={e => set新IP(e.target.value)} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={新增IP}><Plus className="w-4 h-4 mr-1" />新增</Button>
          </div>
        </CardContent>
      </Card>

      {/* Group Reviewers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5" />組別審核人設定
          </CardTitle>
          <CardDescription>設定各組別永久區的審核人及其對應 IP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {審核人清單.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
                <Badge variant="outline">{item.組別}</Badge>
                <span className="text-sm">{item.審核人信箱}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.審核人IP || "無IP限制"}</span>
                <button onClick={() => 移除審核人(idx)} className="ml-auto"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
          <Separator />
          <div className="grid sm:grid-cols-4 gap-2">
            <Select value={新審核組別} onValueChange={set新審核組別}>
              <SelectTrigger>
                <SelectValue placeholder="選擇組別" />
              </SelectTrigger>
              <SelectContent>
                {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="審核人信箱" value={新審核信箱} onChange={e => set新審核信箱(e.target.value)} />
            <Input placeholder="審核人IP（選填）" value={新審核IP} onChange={e => set新審核IP(e.target.value)} />
            <Button variant="outline" onClick={新增審核人}><Plus className="w-4 h-4 mr-1" />新增</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-8">
        <Button onClick={儲存設定} size="lg">
          <Save className="w-4 h-4 mr-2" />儲存所有設定
        </Button>
      </div>
    </div>
  );
}