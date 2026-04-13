/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Shield, FolderLock, Clock } from "lucide-react";
import { 組別列表 } from "@/lib/常數";

const 組別顏色 = [
  "bg-blue-100 text-blue-800", "bg-green-100 text-green-800",
  "bg-cyan-100 text-cyan-800", "bg-purple-100 text-purple-800",
  "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800",
  "bg-indigo-100 text-indigo-800", "bg-orange-100 text-orange-800",
  "bg-red-100 text-red-800", "bg-gray-100 text-gray-800",
];

export default function 部門權限儀表板({ 所有檔案 = [] }) {
  const [展開, set展開] = useState(false);

  const 部門統計 = 組別列表.map((g, i) => {
    const 本組檔案 = 所有檔案.filter(f => f.所屬組別 === g && !f.已刪除);
    const 永久 = 本組檔案.filter(f => f.儲存區域 === "永久區").length;
    const 時效 = 本組檔案.filter(f => f.儲存區域 === "時效區").length;
    const 待審 = 本組檔案.filter(f => f.審核狀態 === "待審核").length;
    return { 組別: g, 名稱: g.substring(3), 永久, 時效, 待審, 總計: 永久 + 時效, 顏色: 組別顏色[i % 組別顏色.length] };
  }).filter(d => d.總計 > 0 || d.待審 > 0);

  const 顯示資料 = 展開 ? 部門統計 : 部門統計.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" />部門權限儀表板
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {顯示資料.map(d => (
            <div key={d.組別} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
              <Badge className={`${d.顏色} flex-shrink-0 w-20 justify-center text-xs`}>{d.名稱}</Badge>
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <FolderLock className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">永久</span>
                  <span className="font-bold ml-1">{d.永久}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-muted-foreground">時效</span>
                  <span className="font-bold ml-1">{d.時效}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Shield className="w-3 h-3 text-amber-500" />
                  <span className="text-muted-foreground">待審</span>
                  <span className={`font-bold ml-1 ${d.待審 > 0 ? "text-amber-600" : ""}`}>{d.待審}</span>
                </div>
              </div>
              {/* 長條圖 */}
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(100, (d.總計 / Math.max(...部門統計.map(x => x.總計), 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {部門統計.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground"
            onClick={() => set展開(!展開)}
          >
            {展開 ? <><ChevronUp className="w-4 h-4 mr-1" />收合</> : <><ChevronDown className="w-4 h-4 mr-1" />展開全部 ({部門統計.length})</>}
          </Button>
        )}
        {部門統計.length === 0 && (
          <p className="text-muted-foreground text-center py-6 text-sm">尚無資料</p>
        )}
      </CardContent>
    </Card>
  );
}