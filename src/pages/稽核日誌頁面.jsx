/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Search, Download, AlertTriangle, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { 組別列表 } from "@/lib/常數";
import moment from "moment";

const 操作類型列表 = ["上傳", "下載", "預覽", "編輯", "刪除", "移動", "審核", "建立資料夾", "還原", "永久刪除", "登入"];

export default function 稽核日誌頁面() {
  const [篩選操作, set篩選操作] = useState("");
  const [篩選組別, set篩選組別] = useState("");
  const [搜尋, set搜尋] = useState("");
  const [只看異常, set只看異常] = useState(false);

  const { data: 日誌 = [], isLoading } = useQuery({
    queryKey: ["稽核日誌"],
    queryFn: () => base44.entities.操作日誌.list("-created_date", 500),
  });

  const 篩選後日誌 = useMemo(() => {
    let result = 日誌;
    if (篩選操作) result = result.filter(l => l.操作類型 === 篩選操作);
    if (篩選組別) result = result.filter(l => l.所屬組別 === 篩選組別);
    if (只看異常) result = result.filter(l => l.是否異常);
    if (搜尋) {
      const kw = 搜尋.toLowerCase();
      result = result.filter(l =>
        l.目標檔案?.toLowerCase().includes(kw) ||
        l.操作者?.toLowerCase().includes(kw) ||
        l.詳細內容?.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [日誌, 篩選操作, 篩選組別, 搜尋, 只看異常]);

  const 匯出Excel = () => {
    const rows = 篩選後日誌.map(l => ({
      時間: moment(l.created_date).format("YYYY-MM-DD HH:mm:ss"),
      操作類型: l.操作類型 || "",
      操作者: l.操作者 || "",
      IP位址: l.操作者IP || "",
      目標檔案: l.目標檔案 || "",
      組別: l.所屬組別 || "",
      儲存區域: l.儲存區域 || "",
      詳細內容: l.詳細內容 || "",
      是否異常: l.是否異常 ? "是" : "否",
      異常原因: l.異常原因 || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "稽核日誌");
    XLSX.writeFile(wb, `稽核日誌_${moment().format("YYYYMMDD_HHmmss")}.xlsx`);
  };

  const 操作類型顏色 = {
    "上傳": "bg-blue-100 text-blue-800",
    "下載": "bg-green-100 text-green-800",
    "預覽": "bg-cyan-100 text-cyan-800",
    "編輯": "bg-purple-100 text-purple-800",
    "刪除": "bg-red-100 text-red-800",
    "審核": "bg-amber-100 text-amber-800",
    "還原": "bg-emerald-100 text-emerald-800",
    "永久刪除": "bg-red-200 text-red-900",
    "建立資料夾": "bg-indigo-100 text-indigo-800",
    "移動": "bg-orange-100 text-orange-800",
    "登入": "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">稽核日誌</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {篩選後日誌.length} 筆紀錄
            {只看異常 && <span className="text-destructive ml-1">（僅顯示異常）</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={匯出Excel}>
          <Download className="w-4 h-4 mr-1" />匯出 Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={篩選操作} onValueChange={set篩選操作}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="操作類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>全部類型</SelectItem>
            {操作類型列表.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={篩選組別} onValueChange={set篩選組別}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="全部組別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>全部組別</SelectItem>
            {組別列表.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={只看異常 ? "destructive" : "outline"}
          size="sm"
          onClick={() => set只看異常(!只看異常)}
          className="h-10"
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          {只看異常 ? "顯示全部" : "僅看異常"}
        </Button>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜尋..." value={搜尋} onChange={e => set搜尋(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-40">時間</TableHead>
                <TableHead>操作類型</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>IP位址</TableHead>
                <TableHead>目標檔案</TableHead>
                <TableHead>組別</TableHead>
                <TableHead>詳細內容</TableHead>
                <TableHead className="w-16">異常</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : 篩選後日誌.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    沒有符合條件的紀錄
                  </TableCell>
                </TableRow>
              ) : (
                篩選後日誌.map(log => (
                  <TableRow key={log.id} className={log.是否異常 ? "bg-destructive/5" : ""}>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {moment(log.created_date).format("YYYY/MM/DD HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge className={操作類型顏色[log.操作類型] || "bg-muted"}>
                        {log.操作類型}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.操作者 || "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.操作者IP || "—"}</TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]">{log.目標檔案 || "—"}</TableCell>
                    <TableCell className="text-sm">{log.所屬組別 || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {log.詳細內容 || "—"}
                    </TableCell>
                    <TableCell>
                      {log.是否異常 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}