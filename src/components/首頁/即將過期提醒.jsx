import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Calendar } from "lucide-react";
import 檔案圖示元件 from "@/components/檔案/檔案圖示";
import moment from "moment";

export default function 即將過期提醒({ 檔案列表 = [] }) {
  if (檔案列表.length === 0) return null;

  const 計算剩餘天數 = (日期) => {
    const diff = moment(日期).diff(moment(), "days");
    return diff;
  };

  const 取得緊急程度顏色 = (天數) => {
    if (天數 <= 3) return "bg-red-100 text-red-800";
    if (天數 <= 7) return "bg-orange-100 text-orange-800";
    return "bg-amber-100 text-amber-800";
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-orange-700">
          <AlertTriangle className="w-4 h-4" />
          時效區即將過期檔案（{檔案列表.length} 個）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {檔案列表.map(f => {
            const 剩餘 = 計算剩餘天數(f.到期日期);
            return (
              <div key={f.id} className="flex items-center gap-3 text-sm bg-white rounded-lg px-3 py-2 border border-orange-100">
                <檔案圖示元件 副檔名={f.副檔名} />
                <span className="flex-1 truncate font-medium">{f.檔案名稱}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{f.所屬組別?.substring(3)}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{moment(f.到期日期).format("MM/DD")}</span>
                </div>
                <Badge className={取得緊急程度顏色(剩餘)}>
                  {剩餘 <= 0 ? "已過期" : `剩${剩餘}天`}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}