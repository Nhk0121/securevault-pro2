import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 組別列表 } from "@/lib/常數";

export default function 組課別管理頁面() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [選擇組別, set選擇組別] = useState(組別列表[0]);
  const [新課別名稱, set新課別名稱] = useState("");

  const { data: 課別清單 = [] } = useQuery({
    queryKey: ["組課別", 選擇組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 選擇組別 }, "排序", 100),
    enabled: !!選擇組別,
  });

  const { mutate: 新增課別, isPending: 新增中 } = useMutation({
    mutationFn: () => base44.entities.組課別設定.create({
      組別: 選擇組別,
      課別名稱: 新課別名稱.trim(),
      排序: 課別清單.length,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["組課別"] });
      toast({ title: "課別已新增" });
      set新課別名稱("");
    },
  });

  const { mutate: 刪除課別 } = useMutation({
    mutationFn: (id) => base44.entities.組課別設定.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["組課別"] });
      toast({ title: "課別已刪除" });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">組課別管理</h1>
        <p className="text-muted-foreground text-sm mt-1">設定各組別下的課別清單</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            選擇組別
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={選擇組別} onValueChange={set選擇組別}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {組別列表.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            「{選擇組別}」的課別清單
            <Badge variant="outline" className="ml-2">{課別清單.length} 個課別</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 現有課別 */}
          {課別清單.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">尚未設定課別</p>
          ) : (
            <div className="space-y-2">
              {課別清單.map(k => (
                <div key={k.id} className="flex items-center justify-between bg-muted rounded-lg px-4 py-2">
                  <span className="text-sm font-medium">{k.課別名稱}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => 刪除課別(k.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 新增課別 */}
          <div className="flex gap-2 pt-2 border-t">
            <div className="flex-1 space-y-1.5">
              <Label>新增課別名稱</Label>
              <Input
                placeholder="例：規劃課"
                value={新課別名稱}
                onChange={e => set新課別名稱(e.target.value)}
                onKeyDown={e => e.key === "Enter" && 新課別名稱.trim() && 新增課別()}
              />
            </div>
            <div className="pt-6">
              <Button
                onClick={() => 新增課別()}
                disabled={!新課別名稱.trim() || 新增中}
              >
                <Plus className="w-4 h-4 mr-1" />
                新增
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}