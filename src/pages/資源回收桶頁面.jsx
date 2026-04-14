/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Search, AlertCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import 檔案列表 from "@/components/檔案/檔案列表";
import { useToast } from "@/components/ui/use-toast";

export default function 資源回收桶頁面() {
  const [搜尋, set搜尋] = useState("");
  const [使用者, set使用者] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(set使用者).catch(() => {});
  }, []);

  const 是否有權限 = 使用者?.role === "admin" || 使用者?.role === "資訊人員";

  const { data: 回收桶檔案 = [], isLoading } = useQuery({
    queryKey: ["回收桶"],
    queryFn: () => base44.entities.檔案.filter({ 儲存區域: "資源回收桶" }, "-刪除時間", 200),
    enabled: 是否有權限,
  });

  const 重新整理 = () => queryClient.invalidateQueries({ queryKey: ["回收桶"] });

  const 清空回收桶 = async () => {
    for (const f of 回收桶檔案) {
      await base44.entities.檔案.delete(f.id);
    }
    await base44.entities.操作日誌.create({
      操作類型: "永久刪除",
      操作者IP: "本機測試",
      詳細內容: `清空回收桶，共刪除 ${回收桶檔案.length} 個檔案`,
    });
    toast({ title: "已清空回收桶" });
    重新整理();
  };

  const 篩選檔案 = 搜尋
    ? 回收桶檔案.filter(f => f.檔案名稱?.toLowerCase().includes(搜尋.toLowerCase()))
    : 回收桶檔案;

  if (!是否有權限) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">權限不足</h2>
        <p className="text-muted-foreground">只有管理者與資訊人員可以存取資源回收桶</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">資源回收桶</h1>
          <p className="text-sm text-muted-foreground mt-1">已刪除的檔案，可還原或永久刪除</p>
        </div>
        {回收桶檔案.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />清空回收桶
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確定要清空回收桶？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作將永久刪除回收桶中的 {回收桶檔案.length} 個檔案，無法復原。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={清空回收桶}>確定刪除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="搜尋檔案..." value={搜尋} onChange={e => set搜尋(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <檔案列表
          檔案清單={篩選檔案}
          資料夾清單={[]}
          儲存區域="資源回收桶"
          重新整理={重新整理}
          是否為回收桶={true}
        />
      )}
    </div>
  );
}