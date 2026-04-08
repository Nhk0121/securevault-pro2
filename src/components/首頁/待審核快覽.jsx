import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import 檔案圖示元件 from "@/components/檔案/檔案圖示";
import moment from "moment";

export default function 待審核快覽({ 待審核檔案 = [] }) {
  if (待審核檔案.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-700">
            <ClipboardCheck className="w-4 h-4" />
            待審核檔案（{待審核檔案.length} 個）
          </CardTitle>
          <Link to="/審核管理">
            <Button variant="outline" size="sm" className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
              前往審核 <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {待審核檔案.slice(0, 8).map(f => (
            <div key={f.id} className="flex items-center gap-3 text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
              <檔案圖示元件 副檔名={f.副檔名} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{f.檔案名稱}</p>
                <p className="text-xs text-muted-foreground">{f.created_by}</p>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{f.所屬組別?.substring(3)}</span>
              <span className="text-xs text-muted-foreground">{moment(f.created_date).fromNow()}</span>
            </div>
          ))}
          {待審核檔案.length > 8 && (
            <p className="text-center text-xs text-muted-foreground py-1">
              還有 {待審核檔案.length - 8} 個待審核檔案…
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}