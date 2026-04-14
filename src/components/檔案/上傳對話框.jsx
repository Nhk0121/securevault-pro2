/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, X, AlertTriangle, FolderOpen, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { 組別列表, 是否為執行檔, 取得副檔名, 檔案名稱最大長度, 格式化檔案大小 } from "@/lib/常數";
import { 可上傳執行檔 } from "@/lib/權限";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function 上傳對話框({ 開啟, 關閉, 儲存區域, 預設組別, 預設課別, 預設資料夾ID, 重新整理, 目前使用者 }) {
  const [選擇檔案, set選擇檔案] = useState([]);
  const [組別, set組別] = useState(預設組別 || "");
  const [課別, set課別] = useState(預設課別 || "");
  const [目標資料夾ID, set目標資料夾ID] = useState(預設資料夾ID || "");
  const [上傳中, set上傳中] = useState(false);
  const [進度, set進度] = useState(0);
  const [個資掃描結果, set個資掃描結果] = useState([]); // [{fileName, 風險等級, 說明}]
  const [個資警示確認, set個資警示確認] = useState(false);
  const [掃描中, set掃描中] = useState(false);
  const fileRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (開啟) {
      set組別(預設組別 || "");
      set課別(預設課別 || "");
      set目標資料夾ID(預設資料夾ID || "");
      set選擇檔案([]);
      set個資掃描結果([]);
    }
  }, [開啟, 預設組別, 預設課別, 預設資料夾ID]);

  const 更換組別 = (v) => {
    set組別(v);
    set目標資料夾ID("");
  };

  const { data: 組別資料夾 = [] } = useQuery({
    queryKey: ["資料夾", 儲存區域, 組別],
    queryFn: () => base44.entities.資料夾.filter({ 儲存區域: 儲存區域, 所屬組別: 組別 }, "created_date", 200),
    enabled: !!組別,
  });

  const 建構資料夾選項 = () => {
    const 根層 = 組別資料夾.filter(f => !f.上層資料夾);
    const 結果 = [{ id: "__root__", label: "（根目錄）", 層級: 0 }];
    const 加入子資料夾 = (parentId, depth) => {
      組別資料夾.filter(f => f.上層資料夾 === parentId).forEach(f => {
        結果.push({ id: f.id, label: "　".repeat(depth) + "📁 " + f.資料夾名稱, 層級: depth });
        加入子資料夾(f.id, depth + 1);
      });
    };
    根層.forEach(f => {
      結果.push({ id: f.id, label: "📁 " + f.資料夾名稱, 層級: 1 });
      加入子資料夾(f.id, 2);
    });
    return 結果;
  };

  const 處理選擇檔案 = (e) => {
    const files = Array.from(e.target.files);
    const 過長檔案 = files.filter(f => f.name.length > 檔案名稱最大長度);
    if (過長檔案.length > 0) {
      toast({ variant: "destructive", title: "檔案名稱過長", description: `以下檔案名稱超過${檔案名稱最大長度}字元：${過長檔案.map(f => f.name).join(", ")}` });
      return;
    }
    // 檢查執行檔上傳權限
    const 執行檔清單 = files.filter(f => 是否為執行檔(f.name));
    if (執行檔清單.length > 0 && !可上傳執行檔(目前使用者)) {
      toast({
        variant: "destructive",
        title: "無執行檔上傳權限",
        description: `以下檔案為執行檔，您沒有上傳權限：${執行檔清單.map(f => f.name).join(", ")}`,
      });
      // 只移除執行檔，保留其他
      set選擇檔案(files.filter(f => !是否為執行檔(f.name)));
      return;
    }
    set選擇檔案(files);
    set個資掃描結果([]);
  };

  const 移除檔案 = (idx) => {
    set選擇檔案(prev => prev.filter((_, i) => i !== idx));
    set個資掃描結果([]);
  };

  // 個資掃描 - 呼叫 LLM 掃描檔名清單是否含個資風險
  const 執行個資掃描 = async (files) => {
    set掃描中(true);
    const 檔名清單 = files.map(f => f.name).join("\n");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `你是一個資訊安全審查員。請分析以下檔案名稱清單，判斷哪些檔案名稱可能包含個人資料（如姓名、身分證號、電話、生日、地址、病歷號、帳號等敏感詞）。
請以 JSON 陣列回傳，每筆包含：fileName（原始檔名）、風險等級（高/中/低/無）、說明（簡短原因，無風險則填「無」）。
只回傳「高」或「中」風險的項目，沒有風險就回傳空陣列。

檔案清單：
${檔名清單}`,
      response_json_schema: {
        type: "object",
        properties: {
          結果: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fileName: { type: "string" },
                風險等級: { type: "string" },
                說明: { type: "string" }
              }
            }
          }
        }
      }
    });
    set掃描中(false);
    return result?.結果 || [];
  };

  const 確認上傳流程 = async () => {
    if (選擇檔案.length === 0 || !組別) return;
    // 執行個資掃描
    const 掃描結果 = await 執行個資掃描(選擇檔案);
    if (掃描結果.length > 0) {
      set個資掃描結果(掃描結果);
      set個資警示確認(true);
      return;
    }
    await 執行上傳();
  };

  const 執行上傳 = async () => {
    set個資警示確認(false);
    set上傳中(true);
    set進度(0);
    const 每檔進度 = 100 / 選擇檔案.length;

    for (let i = 0; i < 選擇檔案.length; i++) {
      const file = 選擇檔案[i];
      const ext = 取得副檔名(file.name);
      const isExe = 是否為執行檔(file.name);
      const 個資風險 = 個資掃描結果.find(r => r.fileName === file.name);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const 到期日 = new Date();
      到期日.setDate(到期日.getDate() + 30);
      const 虛擬路徑 = [儲存區域 || "時效區", 組別, 課別, 目標資料夾ID ? "資料夾" : ""].filter(Boolean).join("/");

      await base44.entities.檔案.create({
        檔案名稱: file.name,
        檔案網址: file_url,
        檔案類型: file.type,
        檔案大小: file.size,
        副檔名: ext,
        所屬資料夾: 目標資料夾ID || "",
        儲存區域: 儲存區域 || "時效區",
        所屬組別: 組別,
        所屬課別: 課別 || "",
        審核狀態: 儲存區域 === "永久區" ? "待審核" : "免審核",
        是否為執行檔: isExe,
        到期日期: 儲存區域 === "時效區" ? 到期日.toISOString() : null,
        上傳者IP: "本機測試",
        已刪除: false,
        虛擬路徑,
      });

      const 目標資料夾名稱 = 目標資料夾ID
        ? 組別資料夾.find(f => f.id === 目標資料夾ID)?.資料夾名稱 || "資料夾"
        : "根目錄";

      await base44.entities.操作日誌.create({
        操作類型: "上傳",
        操作者IP: "本機測試",
        目標檔案: file.name,
        詳細內容: `上傳檔案「${file.name}」至${儲存區域 || "時效區"} / ${組別} / ${目標資料夾名稱}${個資風險 ? `（⚠️個資風險：${個資風險.說明}）` : ""}`,
        所屬組別: 組別,
        儲存區域: 儲存區域 || "時效區",
        是否異常: isExe || !!個資風險,
        異常原因: [isExe ? "上傳執行檔" : "", 個資風險 ? `個資風險：${個資風險.說明}` : ""].filter(Boolean).join("；"),
      });

      set進度((i + 1) * 每檔進度);
    }

    toast({ title: "上傳成功", description: `已成功上傳 ${選擇檔案.length} 個檔案` });
    set上傳中(false);
    set選擇檔案([]);
    set個資掃描結果([]);
    重新整理?.();
    關閉();
  };

  const 資料夾選項 = 建構資料夾選項();

  return (
    <>
      <Dialog open={開啟} onOpenChange={關閉}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">上傳檔案至{儲存區域 || "時效區"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">所屬組別</label>
              <Select value={組別} onValueChange={更換組別}>
                <SelectTrigger><SelectValue placeholder="選擇組別" /></SelectTrigger>
                <SelectContent>
                  {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {組別 && (
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  存放至資料夾
                </label>
                <Select value={目標資料夾ID || "__root__"} onValueChange={(v) => set目標資料夾ID(v === "__root__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="選擇目標資料夾（選填）" /></SelectTrigger>
                  <SelectContent>
                    {資料夾選項.map(opt => (
                      <SelectItem key={opt.id} value={opt.id === "" ? "__root__" : opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">不選擇則存放至組別根目錄</p>
              </div>
            )}

            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">點擊或拖拽檔案至此上傳</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                檔案名稱不得超過{檔案名稱最大長度}字元
                {!可上傳執行檔(目前使用者) && "・不可上傳執行檔"}
              </p>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={處理選擇檔案} />
            </div>

            {選擇檔案.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {選擇檔案.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{格式化檔案大小(file.size)}</span>
                        {是否為執行檔(file.name) && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />執行檔
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => 移除檔案(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {上傳中 && <Progress value={進度} className="h-2" />}

            {掃描中 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在進行個資安全掃描...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={關閉} disabled={上傳中 || 掃描中}>取消</Button>
            <Button onClick={確認上傳流程} disabled={上傳中 || 掃描中 || 選擇檔案.length === 0 || !組別}>
              {掃描中 ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />掃描中...</> :
               上傳中 ? "上傳中..." : `上傳 ${選擇檔案.length} 個檔案`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 個資警示確認對話框 */}
      <AlertDialog open={個資警示確認} onOpenChange={set個資警示確認}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="w-5 h-5" />
              個資安全警示
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>系統偵測到以下檔案名稱可能含有個人資料，請確認是否符合個資保護規範後再繼續上傳：</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {個資掃描結果.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <Badge className={r.風險等級 === "高" ? "bg-red-100 text-red-800 shrink-0" : "bg-amber-100 text-amber-800 shrink-0"}>
                        {r.風險等級}風險
                      </Badge>
                      <div className="text-sm">
                        <p className="font-medium">{r.fileName}</p>
                        <p className="text-muted-foreground text-xs">{r.說明}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  如確認符合規範（例如已匿名化），可選擇「確認上傳」繼續；否則請取消並修改檔名。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消，重新命名</AlertDialogCancel>
            <AlertDialogAction onClick={執行上傳} className="gap-1">
              <ShieldCheck className="w-4 h-4" />確認上傳
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}