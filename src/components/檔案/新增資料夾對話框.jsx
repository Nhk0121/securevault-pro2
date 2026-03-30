import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 資料夾名稱最大長度, 最大資料夾層級 } from "@/lib/常數";
import { useToast } from "@/components/ui/use-toast";

export default function 新增資料夾對話框({ 開啟, 關閉, 組別, 課別, 儲存區域, 上層資料夾ID, 目前層級, 上層路徑, 重新整理 }) {
  const [名稱, set名稱] = useState("");
  const [儲存中, set儲存中] = useState(false);
  const { toast } = useToast();

  const 確認新增 = async () => {
    const trimmed = 名稱.trim();
    if (!trimmed) return;

    if (trimmed.length > 資料夾名稱最大長度) {
      toast({ variant: "destructive", title: "名稱過長", description: `資料夾名稱不得超過${資料夾名稱最大長度}字元` });
      return;
    }

    if ((目前層級 || 0) >= 最大資料夾層級) {
      toast({ variant: "destructive", title: "層級限制", description: `資料夾最多只能建立${最大資料夾層級}層` });
      return;
    }

    set儲存中(true);
    const 新層級 = (目前層級 || 0) + 1;
    const 路徑段 = 上層路徑 ? `${上層路徑}/${trimmed}` : `${儲存區域}/${組別}/${課別 || ""}/${trimmed}`;

    await base44.entities.資料夾.create({
      資料夾名稱: trimmed,
      上層資料夾: 上層資料夾ID || "",
      所屬組別: 組別,
      所屬課別: 課別 || "",
      儲存區域: 儲存區域,
      層級: 新層級,
      虛擬路徑: 路徑段,
    });

    await base44.entities.操作日誌.create({
      操作類型: "建立資料夾",
      操作者: "",
      操作者IP: "本機測試",
      目標檔案: trimmed,
      詳細內容: `在${儲存區域}/${組別}建立資料夾「${trimmed}」`,
      所屬組別: 組別,
      儲存區域: 儲存區域,
    });

    toast({ title: "建立成功", description: `已建立資料夾「${trimmed}」` });
    set名稱("");
    set儲存中(false);
    重新整理?.();
    關閉();
  };

  return (
    <Dialog open={開啟} onOpenChange={關閉}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新增資料夾</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder={`輸入資料夾名稱（最多${資料夾名稱最大長度}字）`}
            value={名稱}
            onChange={e => set名稱(e.target.value)}
            maxLength={資料夾名稱最大長度}
          />
          <p className="text-xs text-muted-foreground">
            {名稱.length}/{資料夾名稱最大長度} 字元 · 目前層級：{(目前層級 || 0) + 1}/{最大資料夾層級}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={關閉}>取消</Button>
          <Button onClick={確認新增} disabled={儲存中 || !名稱.trim()}>
            {儲存中 ? "建立中..." : "建立"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}