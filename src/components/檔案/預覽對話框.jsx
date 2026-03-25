import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { 可預覽類型 } from "@/lib/常數";
import 檔案圖示元件 from "./檔案圖示";

export default function 預覽對話框({ 開啟, 關閉, 檔案 }) {
  if (!檔案) return null;

  const ext = (檔案.副檔名 || "").toLowerCase();
  const url = 檔案.檔案網址;

  const 是圖片 = 可預覽類型.圖片.includes(ext);
  const 是PDF = ext === ".pdf";
  const 是文字 = [".txt", ".md", ".csv"].includes(ext);
  const 是影片 = 可預覽類型.影片.includes(ext);
  const 是音訊 = 可預覽類型.音訊.includes(ext);

  return (
    <Dialog open={開啟} onOpenChange={關閉}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <檔案圖示元件 副檔名={ext} />
            <span className="truncate">{檔案.檔案名稱}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-[300px] max-h-[65vh] flex items-center justify-center bg-muted/30 rounded-lg">
          {是圖片 && (
            <img src={url} alt={檔案.檔案名稱} className="max-w-full max-h-full object-contain" />
          )}
          {是PDF && (
            <iframe src={url} className="w-full h-[60vh]" title={檔案.檔案名稱} />
          )}
          {是影片 && (
            <video controls className="max-w-full max-h-full">
              <source src={url} type={檔案.檔案類型} />
            </video>
          )}
          {是音訊 && (
            <audio controls>
              <source src={url} type={檔案.檔案類型} />
            </audio>
          )}
          {!是圖片 && !是PDF && !是影片 && !是音訊 && (
            <div className="text-center p-8">
              <檔案圖示元件 副檔名={ext} className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">此檔案類型無法線上預覽</p>
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  在新視窗開啟
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={關閉}>關閉</Button>
          <Button asChild>
            <a href={url} download={檔案.檔案名稱}>
              <Download className="w-4 h-4 mr-2" />
              下載檔案
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}