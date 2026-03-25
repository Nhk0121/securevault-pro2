import React from "react";
import {
  Image, FileText, Film, Music, Archive,
  Cog, File, Sheet, Presentation
} from "lucide-react";
import { 取得檔案圖示 } from "@/lib/常數";

const 圖示映射 = {
  Image, FileText, Video: Film, Music, Archive,
  Cog, File, Sheet, Presentation
};

export default function 檔案圖示元件({ 副檔名, className = "w-5 h-5" }) {
  const 圖示名稱 = 取得檔案圖示(副檔名);
  const Icon = 圖示映射[圖示名稱] || File;
  return <Icon className={className} />;
}