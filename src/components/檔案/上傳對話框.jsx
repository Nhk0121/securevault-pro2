import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, AlertTriangle, FolderOpen } from "lucide-react";
import { 組別列表, 是否為執行檔, 取得副檔名, 檔案名稱最大長度, 格式化檔案大小 } from "@/lib/常數";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function 上傳對話框({ 開啟, 關閉, 儲存區域, 預設組別, 預設課別, 預設資料夾ID, 重新整理 }) {
  const [選擇檔案, set選擇檔案] = useState([]);
  const [組別, set組別] = useState(預設組別 || "");
  const [課別, set課別] = useState(預設課別 || "");
  const [目標資料夾ID, set目標資料夾ID] = useState(預設資料夾ID || "");
  const [上傳中, set上傳中] = useState(false);
  const [進度, set進度] = useState(0);
  const fileRef = useRef(null);
  const { toast } = useToast();

  // 當外部傳入值或對話框開啟時同步
  useEffect(() => {
    if (開啟) {
      set組別(預設組別 || "");
      set課別(預設課別 || "");
      set目標資料夾ID(預設資料夾ID || "");
      set選擇檔案([]);
    }
  }, [開啟, 預設組別, 預設課別, 預設資料夾ID]);

  // 當組別改變時，重置資料夾選擇
  const 更換組別 = (v) => {
    set組別(v);
    set目標資料夾ID("");
  };

  // 取得該組別下的所有資料夾
  const { data: 組別資料夾 = [] } = useQuery({
    queryKey: ["資料夾", 儲存區域, 組別],
    queryFn: () => base44.entities.資料夾.filter({ 儲存區域: 儲存區域, 所屬組別: 組別 }, "created_date", 200),
    enabled: !!組別,
  });

  // 建構資料夾樹狀顯示名稱（加上縮排層次）
  const 建構資料夾選項 = () => {
    const 根層 = 組別資料夾.filter(f => !f.上層資料夾);
    const 結果 = [{ id: "__root__", label: "（根目錄）", 層級: 0 }];

    const 加入子資料夾 = (parentId, depth) => {
      const 子項 = 組別資料夾.filter(f => f.上層資料夾 === parentId);
      子項.forEach(f => {
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
      toast({
        variant: "destructive",
        title: "檔案名稱過長",
        description: `以下檔案名稱超過${檔案名稱最大長度}字元限制：${過長檔案.map(f => f.name).join(", ")}`,
      });
      return;
    }
    set選擇檔案(files);
  };

  const 移除檔案 = (idx) => {
    set選擇檔案(prev => prev.filter((_, i) => i !== idx));
  };

  const 執行上傳 = async () => {
    if (選擇檔案.length === 0 || !組別) return;
    set上傳中(true);
    set進度(0);

    const 每檔進度 = 100 / 選擇檔案.length;
    
    for (let i = 0; i < 選擇檔案.length; i++) {
      const file = 選擇檔案[i];
      const ext = 取得副檔名(file.name);
      const isExe = 是否為執行檔(file.name);
      
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
        操作者: "",
        操作者IP: "本機測試",
        目標檔案: file.name,
        詳細內容: `上傳檔案「${file.name}」至${儲存區域 || "時效區"} / ${組別} / ${目標資料夾名稱}`,
        所屬組別: 組別,
        儲存區域: 儲存區域 || "時效區",
        是否異常: isExe,
        異常原因: isExe ? "上傳執行檔" : "",
      });

      set進度((i + 1) * 每檔進度);
    }

    toast({ title: "上傳成功", description: `已成功上傳 ${選擇檔案.length} 個檔案` });
    set上傳中(false);
    set選擇檔案([]);
    重新整理?.();
    關閉();
  };

  const 資料夾選項 = 建構資料夾選項();

  return (
    <Dialog open={開啟} onOpenChange={關閉}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">上傳檔案至{儲存區域 || "時效區"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 組別選擇 */}
          <div>
            <label className="text-sm font-medium mb-1 block">所屬組別</label>
            <Select value={組別} onValueChange={更換組別}>
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

          {/* 目標資料夾選擇 */}
          {組別 && (
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <FolderOpen className="w-4 h-4" />
                存放至資料夾
              </label>
              <Select value={目標資料夾ID || "__root__"} onValueChange={(v) => set目標資料夾ID(v === "__root__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇目標資料夾（選填）" />
                </SelectTrigger>
                <SelectContent>
                  {資料夾選項.map(opt => (
                    <SelectItem key={opt.id} value={opt.id === "" ? "__root__" : opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                不選擇則存放至組別根目錄
              </p>
            </div>
          )}

          {/* 拖拽上傳區 */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">點擊或拖拽檔案至此上傳</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              檔案名稱不得超過{檔案名稱最大長度}字元
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={處理選擇檔案}
            />
          </div>

          {/* 已選檔案列表 */}
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
                          <AlertTriangle className="w-3 h-3" />
                          執行檔
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={關閉} disabled={上傳中}>取消</Button>
          <Button onClick={執行上傳} disabled={上傳中 || 選擇檔案.length === 0 || !組別}>
            {上傳中 ? "上傳中..." : `上傳 ${選擇檔案.length} 個檔案`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}