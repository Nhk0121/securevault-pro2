/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Upload, FolderPlus, Search, ChevronRight, Home } from "lucide-react";
import { 組別列表 } from "@/lib/常數";
import 檔案列表 from "@/components/檔案/檔案列表";
import 上傳對話框 from "@/components/檔案/上傳對話框";
import 新增資料夾對話框 from "@/components/檔案/新增資料夾對話框";

// 課別屬於「組別第1層」，不可在課別下再建子資料夾（避免錯亂）
// 判斷目前是否在課別層（路徑堆疊第1層且該資料夾為課別資料夾）
function 是否為課別層(路徑堆疊) {
  return 路徑堆疊.length >= 1 && 路徑堆疊[0]?.是課別;
}

export default function 檔案區({ 儲存區域類型 }) {
  const [選擇組別, set選擇組別] = useState("");
  const [選擇課別, set選擇課別] = useState("");
  const [搜尋關鍵字, set搜尋關鍵字] = useState("");
  const [顯示上傳, set顯示上傳] = useState(false);
  const [顯示新增資料夾, set顯示新增資料夾] = useState(false);
  const [路徑堆疊, set路徑堆疊] = useState([]); // [{id, name, level, 是課別}]
  const queryClient = useQueryClient();

  const 目前資料夾 = 路徑堆疊.length > 0 ? 路徑堆疊[路徑堆疊.length - 1] : null;

  const { data: 所有檔案 = [], isLoading: 載入檔案中 } = useQuery({
    queryKey: ["檔案", 儲存區域類型],
    queryFn: () => base44.entities.檔案.filter({ 儲存區域: 儲存區域類型, 已刪除: false }, "-created_date", 500),
  });

  const { data: 所有資料夾 = [] } = useQuery({
    queryKey: ["資料夾", 儲存區域類型],
    queryFn: () => base44.entities.資料夾.filter({ 儲存區域: 儲存區域類型 }, "-created_date", 200),
  });

  // 取得該組別的課別清單（來自組課別設定）
  const { data: 課別清單 = [] } = useQuery({
    queryKey: ["組課別", 選擇組別],
    queryFn: () => base44.entities.組課別設定.filter({ 組別: 選擇組別 }, "排序", 100),
    enabled: !!選擇組別,
  });

  const 重新整理 = () => {
    queryClient.invalidateQueries({ queryKey: ["檔案", 儲存區域類型] });
    queryClient.invalidateQueries({ queryKey: ["資料夾", 儲存區域類型] });
  };

  const 篩選後檔案 = useMemo(() => {
    let result = 所有檔案;
    if (選擇組別) result = result.filter(f => f.所屬組別 === 選擇組別);
    if (選擇課別) result = result.filter(f => f.所屬課別 === 選擇課別);
    if (搜尋關鍵字) {
      const kw = 搜尋關鍵字.toLowerCase();
      return result.filter(f => f.檔案名稱?.toLowerCase().includes(kw));
    }
    if (目前資料夾) {
      result = result.filter(f => f.所屬資料夾 === 目前資料夾.id);
    } else {
      result = result.filter(f => !f.所屬資料夾);
    }
    return result;
  }, [所有檔案, 選擇組別, 選擇課別, 目前資料夾, 搜尋關鍵字]);

  const 篩選後資料夾 = useMemo(() => {
    if (搜尋關鍵字) return [];
    let result = 所有資料夾;
    if (選擇組別) result = result.filter(f => f.所屬組別 === 選擇組別);
    if (選擇課別) result = result.filter(f => f.所屬課別 === 選擇課別);
    if (目前資料夾) {
      result = result.filter(f => f.上層資料夾 === 目前資料夾.id);
    } else {
      result = result.filter(f => !f.上層資料夾);
    }
    return result;
  }, [所有資料夾, 選擇組別, 選擇課別, 目前資料夾, 搜尋關鍵字]);

  const 進入資料夾 = (folder) => {
    set路徑堆疊(prev => [...prev, { id: folder.id, name: folder.資料夾名稱, level: folder.層級, 是課別: folder.是課別資料夾 }]);
  };

  const 回到指定層 = (idx) => {
    if (idx < 0) {
      set路徑堆疊([]);
    } else {
      set路徑堆疊(prev => prev.slice(0, idx + 1));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{儲存區域類型}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {儲存區域類型 === "永久區" ? "需經審核的永久保存檔案" : "保留30天的暫存檔案"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {選擇課別 && (
            <>
              {/* 禁止在課別資料夾層建立子資料夾，避免結構錯亂 */}
              {!是否為課別層(路徑堆疊) && (
                <Button variant="outline" size="sm" onClick={() => set顯示新增資料夾(true)}>
                  <FolderPlus className="w-4 h-4 mr-1" />新增資料夾
                </Button>
              )}
              <Button size="sm" onClick={() => set顯示上傳(true)}>
                <Upload className="w-4 h-4 mr-1" />上傳檔案
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={選擇組別} onValueChange={(v) => { set選擇組別(v); set選擇課別(""); set路徑堆疊([]); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="選擇組別" />
          </SelectTrigger>
          <SelectContent>
            {組別列表.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {選擇組別 && (
          <Select value={選擇課別} onValueChange={(v) => { set選擇課別(v); set路徑堆疊([]); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={課別清單.length === 0 ? "（無課別）" : "選擇課別"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部課別</SelectItem>
              {課別清單.map(k => (
                <SelectItem key={k.id} value={k.課別名稱}>{k.課別名稱}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋檔案名稱..."
            value={搜尋關鍵字}
            onChange={e => set搜尋關鍵字(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Breadcrumb */}
      {選擇組別 && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => 回到指定層(-1)} className="cursor-pointer flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                {選擇組別}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {路徑堆疊.map((item, idx) => (
              <React.Fragment key={item.id}>
                <BreadcrumbSeparator>
                  <ChevronRight className="w-3.5 h-3.5" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => 回到指定層(idx)}
                    className={idx === 路徑堆疊.length - 1 ? "font-medium" : "cursor-pointer"}
                  >
                    {item.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* File list */}
      {!選擇組別 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">請先選擇組別以檢視檔案</p>
        </div>
      ) : !選擇課別 && 課別清單.length > 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">請選擇課別以檢視檔案</p>
        </div>
      ) : 載入檔案中 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <檔案列表
          檔案清單={篩選後檔案}
          資料夾清單={篩選後資料夾}
          進入資料夾={進入資料夾}
          儲存區域={儲存區域類型}
          重新整理={重新整理}
        />
      )}

      {/* Dialogs */}
      <上傳對話框
        開啟={顯示上傳}
        關閉={() => set顯示上傳(false)}
        儲存區域={儲存區域類型}
        預設組別={選擇組別}
        預設課別={選擇課別 === "__all__" ? "" : 選擇課別}
        預設資料夾ID={目前資料夾?.id || ""}
        重新整理={重新整理}
      />
      <新增資料夾對話框
        開啟={顯示新增資料夾}
        關閉={() => set顯示新增資料夾(false)}
        組別={選擇組別}
        課別={選擇課別 === "__all__" ? "" : 選擇課別}
        儲存區域={儲存區域類型}
        上層資料夾ID={目前資料夾?.id || ""}
        目前層級={目前資料夾?.level || 0}
        重新整理={重新整理}
      />
    </div>
  );
}