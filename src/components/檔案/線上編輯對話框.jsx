import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import ReactQuill from "react-quill";

// 判斷檔案類型
function 取得編輯類型(副檔名) {
  const ext = (副檔名 || "").toLowerCase();
  if (ext === "txt") return "txt";
  if (["xlsx", "xls"].includes(ext)) return "excel";
  if (ext === "docx") return "docx";
  return null;
}

// Excel 格狀編輯器
function ExcelEditor({ data, onChange }) {
  const [rows, setRows] = useState(data || []);

  useEffect(() => { setRows(data || []); }, [data]);

  const updateCell = (r, c, val) => {
    const next = rows.map(row => [...row]);
    if (!next[r]) next[r] = [];
    next[r][c] = val;
    setRows(next);
    onChange(next);
  };

  const maxCols = Math.max(...rows.map(r => r.length), 0);

  return (
    <div className="overflow-auto max-h-[55vh] border rounded text-xs">
      <table className="border-collapse w-max">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {Array.from({ length: maxCols }).map((_, c) => (
                <td key={c} className="border border-border p-0">
                  <input
                    className="px-1.5 py-1 min-w-[80px] max-w-[200px] outline-none focus:bg-primary/5"
                    value={row[c] ?? ""}
                    onChange={e => updateCell(r, c, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function 線上編輯對話框({ 開啟, 關閉, 檔案, 重新整理 }) {
  const { toast } = useToast();
  const [載入中, set載入中] = useState(false);
  const [儲存中, set儲存中] = useState(false);
  const [內容, set內容] = useState("");          // txt / docx (html)
  const [excelData, setExcelData] = useState([]); // excel rows
  const [excelWb, setExcelWb] = useState(null);   // original workbook
  const [sheetName, setSheetName] = useState("");
  const 類型 = 取得編輯類型(檔案?.副檔名);

  useEffect(() => {
    if (!開啟 || !檔案) return;
    載入檔案();
  }, [開啟, 檔案]);

  const 載入檔案 = async () => {
    set載入中(true);
    const res = await fetch(檔案.檔案網址);
    const arrayBuf = await res.arrayBuffer();

    if (類型 === "txt") {
      set內容(new TextDecoder("utf-8").decode(arrayBuf));
    } else if (類型 === "excel") {
      const wb = XLSX.read(arrayBuf, { type: "array" });
      setExcelWb(wb);
      const sn = wb.SheetNames[0];
      setSheetName(sn);
      const ws = wb.Sheets[sn];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      setExcelData(rows);
    } else if (類型 === "docx") {
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuf });
      set內容(result.value);
    }
    set載入中(false);
  };

  const 儲存 = async () => {
    set儲存中(true);
    let blob;
    let fileName = 檔案.檔案名稱;

    if (類型 === "txt") {
      blob = new Blob([內容], { type: "text/plain;charset=utf-8" });
    } else if (類型 === "excel") {
      const wb = excelWb || XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      wb.Sheets[sheetName || "Sheet1"] = ws;
      if (!wb.SheetNames.includes(sheetName || "Sheet1")) {
        wb.SheetNames.push(sheetName || "Sheet1");
      }
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    } else if (類型 === "docx") {
      // 儲存為 HTML（無法在瀏覽器端重新產生 .docx 二進位格式，改存 HTML）
      blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${內容}</body></html>`], { type: "text/html;charset=utf-8" });
      fileName = fileName.replace(/\.docx$/i, ".html");
    }

    const file = new File([blob], fileName, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.檔案.update(檔案.id, {
      檔案網址: file_url,
      檔案名稱: fileName,
      檔案大小: blob.size,
      副檔名: fileName.split(".").pop(),
    });
    await base44.entities.操作日誌.create({
      操作類型: "編輯",
      操作者IP: "本機",
      目標檔案: fileName,
      目標檔案ID: 檔案.id,
      詳細內容: `線上編輯並儲存「${fileName}」`,
      所屬組別: 檔案.所屬組別,
      儲存區域: 檔案.儲存區域,
    });

    toast({ title: "已儲存", description: fileName });
    set儲存中(false);
    重新整理?.();
    關閉();
  };

  const 重置 = () => {
    set內容("");
    setExcelData([]);
    setExcelWb(null);
    setSheetName("");
  };

  return (
    <Dialog open={開啟} onOpenChange={() => { 重置(); 關閉(); }}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="truncate">線上編輯：{檔案?.檔案名稱}</DialogTitle>
        </DialogHeader>

        {載入中 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="min-h-[300px]">
            {類型 === "txt" && (
              <Textarea
                className="font-mono text-sm h-[55vh] resize-none"
                value={內容}
                onChange={e => set內容(e.target.value)}
              />
            )}
            {類型 === "excel" && (
              <ExcelEditor data={excelData} onChange={setExcelData} />
            )}
            {類型 === "docx" && (
              <div className="border rounded overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={內容}
                  onChange={set內容}
                  style={{ height: "50vh" }}
                />
              </div>
            )}
          </div>
        )}

        {類型 === "docx" && (
          <p className="text-xs text-muted-foreground">
            ⚠ DOCX 檔案儲存後將轉為 HTML 格式（.html），原始 Word 格式無法在瀏覽器端還原。
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { 重置(); 關閉(); }}>取消</Button>
          <Button onClick={儲存} disabled={儲存中 || 載入中}>
            {儲存中 ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}