/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, Clock, Eye, FileText, Download
} from "lucide-react";
import { 組別列表, 格式化檔案大小 } from "@/lib/常數";
import * as XLSX from "xlsx";
import 檔案圖示元件 from "@/components/檔案/檔案圖示";
import 預覽對話框 from "@/components/檔案/預覽對話框";
import moment from "moment";
import { useToast } from "@/components/ui/use-toast";

export default function 審核管理頁面() {
  const [篩選狀態, set篩選狀態] = useState("待審核");
  const [篩選組別, set篩選組別] = useState("");
  const [審核對話框, set審核對話框] = useState(null);
  const [審核備註, set審核備註] = useState("");
  const [預覽檔案, set預覽檔案] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: 待審核檔案 = [], isLoading } = useQuery({
    queryKey: ["審核檔案"],
    queryFn: () => base44.entities.檔案.filter({ 儲存區域: "永久區" }, "-created_date", 200),
  });

  const 重新整理 = () => queryClient.invalidateQueries({ queryKey: ["審核檔案"] });

  const 匯出Excel = () => {
    const rows = 篩選後.map(f => ({
      檔案名稱: f.檔案名稱 || "",
      所屬組別: f.所屬組別 || "",
      上傳者: f.created_by || "",
      上傳時間: moment(f.created_date).format("YYYY-MM-DD HH:mm:ss"),
      檔案大小: 格式化檔案大小(f.檔案大小),
      審核狀態: f.審核狀態 || "",
      審核備註: f.審核備註 || "",
      審核時間: f.審核時間 ? moment(f.審核時間).format("YYYY-MM-DD HH:mm:ss") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "審核狀態報表");
    XLSX.writeFile(wb, `審核狀態報表_${moment().format("YYYYMMDD_HHmmss")}.xlsx`);
  };

  const 篩選後 = 待審核檔案.filter(f => {
    if (篩選狀態 && f.審核狀態 !== 篩選狀態) return false;
    if (篩選組別 && f.所屬組別 !== 篩選組別) return false;
    return true;
  });

  const 執行審核 = async (通過) => {
    const file = 審核對話框;
    if (!file) return;

    const 新狀態 = 通過 ? "已通過" : "已退回";
    
    await base44.entities.檔案.update(file.id, {
      審核狀態: 新狀態,
      審核時間: new Date().toISOString(),
      審核備註: 審核備註,
      // If rejected, move to temp zone
      ...(通過 ? {} : { 儲存區域: "時效區", 到期日期: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }),
    });

    await base44.entities.審核記錄.create({
      檔案ID: file.id,
      檔案名稱: file.檔案名稱,
      申請者: file.created_by,
      所屬組別: file.所屬組別,
      審核狀態: 新狀態,
      審核備註: 審核備註,
      審核時間: new Date().toISOString(),
    });

    await base44.entities.操作日誌.create({
      操作類型: "審核",
      操作者IP: "本機測試",
      目標檔案: file.檔案名稱,
      目標檔案ID: file.id,
      詳細內容: `${新狀態}「${file.檔案名稱}」${審核備註 ? `，備註：${審核備註}` : ""}`,
      所屬組別: file.所屬組別,
      儲存區域: "永久區",
    });

    toast({ title: `已${新狀態}`, description: file.檔案名稱 });
    set審核對話框(null);
    set審核備註("");
    重新整理();
  };

  const 狀態顏色 = {
    "待審核": "bg-amber-100 text-amber-800",
    "已通過": "bg-green-100 text-green-800",
    "已退回": "bg-red-100 text-red-800",
    "免審核": "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">審核管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理永久區檔案的審核流程（共 {篩選後.length} 筆）</p>
        </div>
        <Button variant="outline" size="sm" onClick={匯出Excel}>
          <Download className="w-4 h-4 mr-1" />匯出 Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={篩選狀態} onValueChange={set篩選狀態}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="審核狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="待審核">待審核</SelectItem>
            <SelectItem value="已通過">已通過</SelectItem>
            <SelectItem value="已退回">已退回</SelectItem>
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
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>檔案名稱</TableHead>
                <TableHead>所屬組別</TableHead>
                <TableHead>上傳者</TableHead>
                <TableHead>上傳時間</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {篩選後.map(file => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <檔案圖示元件 副檔名={file.副檔名} />
                      <span className="font-medium truncate max-w-[200px]">{file.檔案名稱}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{file.所屬組別}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{file.created_by}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {moment(file.created_date).format("YYYY/MM/DD HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm">{格式化檔案大小(file.檔案大小)}</TableCell>
                  <TableCell>
                    <Badge className={狀態顏色[file.審核狀態]}>{file.審核狀態}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => set預覽檔案(file)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {file.審核狀態 === "待審核" && (
                        <Button size="sm" variant="outline" onClick={() => set審核對話框(file)}>
                          審核
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {篩選後.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    沒有符合條件的檔案
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!審核對話框} onOpenChange={() => { set審核對話框(null); set審核備註(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>審核檔案</DialogTitle>
          </DialogHeader>
          {審核對話框 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">檔案名稱：</span>{審核對話框.檔案名稱}</div>
                <div><span className="text-muted-foreground">所屬組別：</span>{審核對話框.所屬組別}</div>
                <div><span className="text-muted-foreground">上傳者：</span>{審核對話框.created_by}</div>
                <div><span className="text-muted-foreground">大小：</span>{格式化檔案大小(審核對話框.檔案大小)}</div>
              </div>
              <Textarea
                placeholder="審核備註（選填）"
                value={審核備註}
                onChange={e => set審核備註(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => 執行審核(false)}>
              <XCircle className="w-4 h-4 mr-1" />退回
            </Button>
            <Button onClick={() => 執行審核(true)}>
              <CheckCircle className="w-4 h-4 mr-1" />通過
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <預覽對話框 開啟={!!預覽檔案} 關閉={() => set預覽檔案(null)} 檔案={預覽檔案} />
    </div>
  );
}