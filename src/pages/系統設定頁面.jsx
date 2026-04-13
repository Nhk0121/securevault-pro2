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
import { Plus, X, Save, Shield, Wifi, Users, Settings } from "lucide-react";
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
  const [允許IP, set允許IP] = useState([]);
  const [新IP, set新IP] = useState("");
  const [審核人清單, set審核人清單] = useState([]);
  const [時效天數, set時效天數] = useState(30);
  const [檔名上限, set檔名上限] = useState(50);
  const [資料夾名上限, set資料夾名上限] = useState(30);
  const [異常次數, set異常次數] = useState(20);
  const [異常分鐘, set異常分鐘] = useState(10);

  // new reviewer
  const [新審核組別, set新審核組別] = useState("");
  const [新審核信箱, set新審核信箱] = useState("");
  const [新審核IP, set新審核IP] = useState("");

  useEffect(() => {
    if (設定.id) {
      set允許IP(設定.允許上傳執行檔IP || []);
      set審核人清單(設定.組別審核人 || []);
      set時效天數(設定.時效區天數 || 30);
      set檔名上限(設定.檔案名稱長度上限 || 50);
      set資料夾名上限(設定.資料夾名稱長度上限 || 30);
      set異常次數(設定.異常偵測下載次數 || 20);
      set異常分鐘(設定.異常偵測時間範圍分鐘 || 10);
    }
  }, [設定.id]);

  const 是否為管理員 = 使用者?.role === "admin";

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

  const 儲存設定 = async () => {
    const data = {
      設定名稱: "主要設定",
      允許上傳執行檔IP: 允許IP,
      組別審核人: 審核人清單,
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