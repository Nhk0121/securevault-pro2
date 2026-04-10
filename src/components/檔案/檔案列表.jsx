import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Eye, Download, Trash2, MoreVertical, FolderOpen,
  CornerUpLeft, AlertTriangle, Clock, CheckCircle, XCircle, Pencil
} from "lucide-react";
import { 格式化檔案大小 } from "@/lib/常數";
import 檔案圖示元件 from "./檔案圖示";
import 預覽對話框 from "./預覽對話框";
import 線上編輯對話框 from "./線上編輯對話框";

const 可編輯副檔名 = ["txt", "xlsx", "xls", "docx"];
import moment from "moment";
import { useToast } from "@/components/ui/use-toast";

const 審核狀態樣式 = {
  "待審核": "bg-amber-100 text-amber-800 border-amber-200",
  "已通過": "bg-green-100 text-green-800 border-green-200",
  "已退回": "bg-red-100 text-red-800 border-red-200",
  "免審核": "bg-muted text-muted-foreground",
};

export default function 檔案列表({
  檔案清單 = [], 資料夾清單 = [], 進入資料夾,
  儲存區域, 重新整理, 是否為回收桶 = false
}) {
  const [預覽檔案, set預覽檔案] = useState(null);
  const [編輯檔案, set編輯檔案] = useState(null);
  const { toast } = useToast();

  const 移至回收桶 = async (file) => {
    await base44.entities.檔案.update(file.id, {
      儲存區域: "資源回收桶",
      已刪除: true,
      刪除時間: new Date().toISOString(),
    });
    await base44.entities.操作日誌.create({
      操作類型: "刪除",
      操作者IP: "本機測試",
      目標檔案: file.檔案名稱,
      目標檔案ID: file.id,
      詳細內容: `將「${file.檔案名稱}」移至資源回收桶`,
      所屬組別: file.所屬組別,
      儲存區域: file.儲存區域,
    });
    toast({ title: "已移至回收桶" });
    重新整理?.();
  };

  const 還原檔案 = async (file) => {
    await base44.entities.檔案.update(file.id, {
      儲存區域: "時效區",
      已刪除: false,
      刪除時間: null,
    });
    await base44.entities.操作日誌.create({
      操作類型: "還原",
      操作者IP: "本機測試",
      目標檔案: file.檔案名稱,
      詳細內容: `從回收桶還原「${file.檔案名稱}」`,
    });
    toast({ title: "已還原檔案" });
    重新整理?.();
  };

  const 永久刪除 = async (file) => {
    await base44.entities.檔案.delete(file.id);
    await base44.entities.操作日誌.create({
      操作類型: "永久刪除",
      操作者IP: "本機測試",
      目標檔案: file.檔案名稱,
      詳細內容: `永久刪除「${file.檔案名稱}」`,
    });
    toast({ title: "已永久刪除" });
    重新整理?.();
  };

  const 下載檔案 = async (file) => {
    await base44.entities.操作日誌.create({
      操作類型: "下載",
      操作者IP: "本機測試",
      目標檔案: file.檔案名稱,
      目標檔案ID: file.id,
      詳細內容: `下載「${file.檔案名稱}」`,
      所屬組別: file.所屬組別,
      儲存區域: file.儲存區域,
    });
    window.open(file.檔案網址, "_blank");
  };

  const 預覽 = async (file) => {
    await base44.entities.操作日誌.create({
      操作類型: "預覽",
      操作者IP: "本機測試",
      目標檔案: file.檔案名稱,
      目標檔案ID: file.id,
      詳細內容: `預覽「${file.檔案名稱}」`,
      所屬組別: file.所屬組別,
      儲存區域: file.儲存區域,
    });
    set預覽檔案(file);
  };

  return (
    <>
      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40%]">檔案名稱</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>上傳時間</TableHead>
              {儲存區域 === "永久區" && <TableHead>審核狀態</TableHead>}
              {儲存區域 === "時效區" && <TableHead>到期日</TableHead>}
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {資料夾清單.map(folder => (
              <TableRow
                key={`folder-${folder.id}`}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => 進入資料夾?.(folder)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <span className="font-medium">{folder.資料夾名稱}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">—</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {moment(folder.created_date).format("YYYY/MM/DD HH:mm")}
                </TableCell>
                {儲存區域 === "永久區" && <TableCell>—</TableCell>}
                {儲存區域 === "時效區" && <TableCell>—</TableCell>}
                <TableCell />
              </TableRow>
            ))}

            {檔案清單.map(file => (
              <TableRow key={file.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <檔案圖示元件 副檔名={file.副檔名} />
                    <span className="font-medium truncate max-w-[300px]">{file.檔案名稱}</span>
                    {file.是否為執行檔 && (
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {格式化檔案大小(file.檔案大小)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {moment(file.created_date).format("YYYY/MM/DD HH:mm")}
                </TableCell>
                {儲存區域 === "永久區" && (
                  <TableCell>
                    <Badge variant="outline" className={審核狀態樣式[file.審核狀態] || ""}>
                      {file.審核狀態 === "待審核" && <Clock className="w-3 h-3 mr-1" />}
                      {file.審核狀態 === "已通過" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {file.審核狀態 === "已退回" && <XCircle className="w-3 h-3 mr-1" />}
                      {file.審核狀態}
                    </Badge>
                  </TableCell>
                )}
                {儲存區域 === "時效區" && (
                  <TableCell className="text-sm">
                    {file.到期日期 ? (
                      <span className={moment(file.到期日期).diff(moment(), 'days') <= 7 ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {moment(file.到期日期).format("YYYY/MM/DD")}
                      </span>
                    ) : "—"}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => 預覽(file)}>
                        <Eye className="w-4 h-4 mr-2" />預覽
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => 下載檔案(file)}>
                        <Download className="w-4 h-4 mr-2" />下載
                      </DropdownMenuItem>
                      {可編輯副檔名.includes((file.副檔名 || "").toLowerCase()) && (
                        <DropdownMenuItem onClick={() => set編輯檔案(file)}>
                          <Pencil className="w-4 h-4 mr-2" />線上編輯
                        </DropdownMenuItem>
                      )}
                      {是否為回收桶 ? (
                        <>
                          <DropdownMenuItem onClick={() => 還原檔案(file)}>
                            <CornerUpLeft className="w-4 h-4 mr-2" />還原
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => 永久刪除(file)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />永久刪除
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => 移至回收桶(file)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />移至回收桶
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {檔案清單.length === 0 && 資料夾清單.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  目前沒有檔案
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <預覽對話框 開啟={!!預覽檔案} 關閉={() => set預覽檔案(null)} 檔案={預覽檔案} />
      <線上編輯對話框 開啟={!!編輯檔案} 關閉={() => set編輯檔案(null)} 檔案={編輯檔案} 重新整理={重新整理} />
    </>
  );
}