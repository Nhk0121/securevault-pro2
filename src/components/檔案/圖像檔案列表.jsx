/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Eye, Download, Trash2, MoreVertical, FolderOpen,
  CornerUpLeft, AlertTriangle, Clock, CheckCircle, XCircle, Pencil
} from "lucide-react";
import { 格式化檔案大小 } from "@/lib/常數";
import { 可操作永久區 } from "@/lib/權限";
import 檔案圖示元件 from "./檔案圖示";
import 預覽對話框 from "./預覽對話框";
import 線上編輯對話框 from "./線上編輯對話框";
import moment from "moment";
import { useToast } from "@/components/ui/use-toast";

const 可編輯副檔名 = ["txt", "xlsx", "xls", "docx"];

const 審核狀態樣式 = {
  "待審核": "bg-amber-100 text-amber-800 border-amber-200",
  "已通過": "bg-green-100 text-green-800 border-green-200",
  "已退回": "bg-red-100 text-red-800 border-red-200",
  "免審核": "bg-muted text-muted-foreground",
};

export default function 圖像檔案列表({
  檔案清單 = [], 資料夾清單 = [], 進入資料夾,
  儲存區域, 重新整理, 是否為回收桶 = false, 目前使用者 = null
}) {
  const [預覽檔案, set預覽檔案] = useState(null);
  const [編輯檔案, set編輯檔案] = useState(null);
  const { toast } = useToast();

  const 移至回收桶 = async (file) => {
    await base44.entities.檔案.update(file.id, {
      儲存區域: "資源回收桶", 已刪除: true, 刪除時間: new Date().toISOString(),
    });
    await base44.entities.操作日誌.create({
      操作類型: "刪除", 操作者IP: "本機測試",
      目標檔案: file.檔案名稱, 目標檔案ID: file.id,
      詳細內容: `將「${file.檔案名稱}」移至資源回收桶`,
      所屬組別: file.所屬組別, 儲存區域: file.儲存區域,
    });
    toast({ title: "已移至回收桶" });
    重新整理?.();
  };

  const 還原檔案 = async (file) => {
    await base44.entities.檔案.update(file.id, { 儲存區域: "時效區", 已刪除: false, 刪除時間: null });
    await base44.entities.操作日誌.create({
      操作類型: "還原", 操作者IP: "本機測試",
      目標檔案: file.檔案名稱, 詳細內容: `從回收桶還原「${file.檔案名稱}」`,
    });
    toast({ title: "已還原檔案" });
    重新整理?.();
  };

  const 永久刪除 = async (file) => {
    await base44.entities.檔案.delete(file.id);
    await base44.entities.操作日誌.create({
      操作類型: "永久刪除", 操作者IP: "本機測試",
      目標檔案: file.檔案名稱, 詳細內容: `永久刪除「${file.檔案名稱}」`,
    });
    toast({ title: "已永久刪除" });
    重新整理?.();
  };

  const 下載檔案 = async (file) => {
    await base44.entities.操作日誌.create({
      操作類型: "下載", 操作者IP: "本機測試",
      目標檔案: file.檔案名稱, 目標檔案ID: file.id,
      詳細內容: `下載「${file.檔案名稱}」`,
      所屬組別: file.所屬組別, 儲存區域: file.儲存區域,
    });
    window.open(file.檔案網址, "_blank");
  };

  const 預覽 = async (file) => {
    await base44.entities.操作日誌.create({
      操作類型: "預覽", 操作者IP: "本機測試",
      目標檔案: file.檔案名稱, 目標檔案ID: file.id,
      詳細內容: `預覽「${file.檔案名稱}」`,
      所屬組別: file.所屬組別, 儲存區域: file.儲存區域,
    });
    set預覽檔案(file);
  };

  const 無資料 = 檔案清單.length === 0 && 資料夾清單.length === 0;

  return (
    <>
      {無資料 ? (
        <div className="text-center py-16 text-muted-foreground">目前沒有檔案</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* 資料夾卡片 */}
          {資料夾清單.map(folder => (
            <div
              key={`folder-${folder.id}`}
              onClick={() => 進入資料夾?.(folder)}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 select-none"
            >
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FolderOpen className="w-10 h-10 text-primary" />
              </div>
              <span className="text-sm font-medium text-center line-clamp-2 leading-snug w-full">
                {folder.資料夾名稱}
              </span>
              <span className="text-xs text-muted-foreground">
                {moment(folder.created_date).format("YYYY/MM/DD")}
              </span>
            </div>
          ))}

          {/* 檔案卡片 */}
          {檔案清單.map(file => (
            <div
              key={file.id}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all duration-200"
            >
              {/* 操作選單 */}
              {(() => {
                const 有寫入權限 = 儲存區域 !== "永久區" || 是否為回收桶 || 可操作永久區(目前使用者, file.所屬組別);
                return (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => 預覽(file)}>
                        <Eye className="w-4 h-4 mr-2" />預覽
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => 下載檔案(file)}>
                        <Download className="w-4 h-4 mr-2" />下載
                      </DropdownMenuItem>
                      {有寫入權限 && 可編輯副檔名.includes((file.副檔名 || "").toLowerCase()) && (
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
                      ) : 有寫入權限 ? (
                        <DropdownMenuItem onClick={() => 移至回收桶(file)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />移至回收桶
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                );
              })()}

              {/* 圖示 */}
              <div
                className="w-16 h-16 flex items-center justify-center cursor-pointer"
                onDoubleClick={() => 預覽(file)}
              >
                <檔案圖示元件 副檔名={file.副檔名} className="w-14 h-14" />
              </div>

              {/* 檔名 */}
              <span className="text-xs font-medium text-center line-clamp-2 leading-snug w-full" title={file.檔案名稱}>
                {file.檔案名稱}
                {file.是否為執行檔 && <AlertTriangle className="inline w-3 h-3 text-destructive ml-1" />}
              </span>

              {/* 狀態/到期 */}
              {儲存區域 === "永久區" && file.審核狀態 && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${審核狀態樣式[file.審核狀態] || ""}`}>
                  {file.審核狀態 === "待審核" && <Clock className="w-2.5 h-2.5 mr-0.5" />}
                  {file.審核狀態 === "已通過" && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
                  {file.審核狀態 === "已退回" && <XCircle className="w-2.5 h-2.5 mr-0.5" />}
                  {file.審核狀態}
                </Badge>
              )}
              {儲存區域 === "時效區" && file.到期日期 && (
                <span className={`text-[10px] ${moment(file.到期日期).diff(moment(), 'days') <= 7 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  到期：{moment(file.到期日期).format("MM/DD")}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{格式化檔案大小(file.檔案大小)}</span>
            </div>
          ))}
        </div>
      )}

      <預覽對話框 開啟={!!預覽檔案} 關閉={() => set預覽檔案(null)} 檔案={預覽檔案} />
      <線上編輯對話框 開啟={!!編輯檔案} 關閉={() => set編輯檔案(null)} 檔案={編輯檔案} 重新整理={重新整理} />
    </>
  );
}