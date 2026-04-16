export const 職稱列表 = [
  "00.處長", "01.副處長", "02.經理", "03.課長(主任)",
  "04.主辦", "05.經辦(員工)", "06.外包人員"
];

export const 組別列表 = [
  "00.處長室", "01.維護組", "02.設計組", "03.業務組",
  "04.電費組", "05.調度組", "06.總務組", "07.會計組",
  "08.人資組", "09.政風組", "10.工務段", "11.工安組",
  "12.電控組", "13.電力工會", "14.福利會", "15.檔案下載"
];

export const 組別課別對應 = {
  "00.處長室": [],
  "01.維護組": ["維護一課", "維護二課", "維護三課"],
  "02.設計組": ["設計一課", "設計二課"],
  "03.業務組": ["業務一課", "業務二課", "業務三課"],
  "04.電費組": ["電費一課", "電費二課"],
  "05.調度組": ["調度一課", "調度二課"],
  "06.總務組": ["總務一課", "總務二課"],
  "07.會計組": ["會計一課", "會計二課"],
  "08.人資組": ["人資一課", "人資二課"],
  "09.政風組": [],
  "10.工務段": ["工務一課", "工務二課", "工務三課"],
  "11.工安組": [],
  "12.電控組": ["電控一課", "電控二課"],
  "13.電力工會": [],
  "14.福利會": [],
  "15.檔案下載": [],
};

export const 儲存區域列表 = ["永久區", "時效區", "資源回收桶"];

export const 執行檔副檔名 = [".exe", ".bat", ".cmd", ".msi", ".ps1", ".vbs", ".com", ".scr"];

export const 可預覽類型 = {
  圖片: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"],
  文件: [".pdf", ".txt", ".md", ".csv"],
  影片: [".mp4", ".webm"],
  音訊: [".mp3", ".wav", ".ogg"],
};

export const 檔案名稱最大長度 = 50;
export const 資料夾名稱最大長度 = 30;
export const 最大資料夾層級 = 3;

export function 取得檔案圖示(副檔名) {
  const ext = (副檔名 || "").toLowerCase();
  if ([".jpg",".jpeg",".png",".gif",".bmp",".webp",".svg"].includes(ext)) return "Image";
  if ([".pdf"].includes(ext)) return "FileText";
  if ([".doc",".docx"].includes(ext)) return "FileText";
  if ([".xls",".xlsx"].includes(ext)) return "Sheet";
  if ([".ppt",".pptx"].includes(ext)) return "Presentation";
  if ([".mp4",".webm",".avi"].includes(ext)) return "Video";
  if ([".mp3",".wav",".ogg"].includes(ext)) return "Music";
  if ([".zip",".rar",".7z"].includes(ext)) return "Archive";
  if ([".exe",".bat",".msi"].includes(ext)) return "Cog";
  if ([".txt",".md",".csv"].includes(ext)) return "FileText";
  return "File";
}

export function 格式化檔案大小(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function 取得副檔名(檔名) {
  if (!檔名) return "";
  const idx = 檔名.lastIndexOf(".");
  return idx >= 0 ? 檔名.substring(idx).toLowerCase() : "";
}

export function 是否為執行檔(檔名) {
  return 執行檔副檔名.includes(取得副檔名(檔名));
}