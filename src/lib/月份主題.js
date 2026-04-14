/**
 * 月份色調主題設定
 * 每個月份有獨特的主色調，讓系統隨季節/月份呈現不同風格
 */

export const 月份主題列表 = [
  // 1月 - 冬季寶藍
  { 月份: 1, 名稱: "冬月", primary: "217 71% 45%", accent: "199 60% 55%", sidebar: "220 25% 14%", label: "1月・寒冬" },
  // 2月 - 情人節玫瑰
  { 月份: 2, 名稱: "如月", primary: "340 65% 48%", accent: "350 80% 60%", sidebar: "340 30% 14%", label: "2月・早春" },
  // 3月 - 春櫻粉
  { 月份: 3, 名稱: "彌生", primary: "330 55% 55%", accent: "300 50% 65%", sidebar: "330 25% 14%", label: "3月・春櫻" },
  // 4月 - 嫩草綠
  { 月份: 4, 名稱: "卯月", primary: "145 60% 40%", accent: "160 70% 45%", sidebar: "145 25% 12%", label: "4月・新綠" },
  // 5月 - 清涼翠綠
  { 月份: 5, 名稱: "皐月", primary: "160 65% 38%", accent: "175 75% 42%", sidebar: "160 30% 12%", label: "5月・初夏" },
  // 6月 - 雨季靛藍
  { 月份: 6, 名稱: "水無月", primary: "230 60% 48%", accent: "210 80% 55%", sidebar: "230 28% 14%", label: "6月・梅雨" },
  // 7月 - 夏日橙
  { 月份: 7, 名稱: "文月", primary: "25 90% 48%", accent: "38 95% 52%", sidebar: "25 28% 12%", label: "7月・盛夏" },
  // 8月 - 熱情紅橙
  { 月份: 8, 名稱: "葉月", primary: "16 85% 50%", accent: "30 92% 55%", sidebar: "16 28% 12%", label: "8月・暑夏" },
  // 9月 - 秋收金黃
  { 月份: 9, 名稱: "長月", primary: "42 88% 45%", accent: "55 85% 48%", sidebar: "42 28% 12%", label: "9月・初秋" },
  // 10月 - 楓紅
  { 月份: 10, 名稱: "神無月", primary: "12 75% 48%", accent: "25 80% 52%", sidebar: "12 28% 13%", label: "10月・楓紅" },
  // 11月 - 深秋紫褐
  { 月份: 11, 名稱: "霜月", primary: "272 50% 48%", accent: "290 55% 55%", sidebar: "272 28% 13%", label: "11月・晚秋" },
  // 12月 - 聖誕深綠紅
  { 月份: 12, 名稱: "師走", primary: "0 68% 44%", accent: "142 55% 42%", sidebar: "0 28% 13%", label: "12月・冬至" },
];

export function 取得當月主題() {
  const 月 = new Date().getMonth() + 1;
  return 月份主題列表.find(t => t.月份 === 月) || 月份主題列表[0];
}

export function 套用月份主題(主題) {
  const root = document.documentElement;
  root.style.setProperty("--primary", 主題.primary);
  root.style.setProperty("--accent", 主題.accent);
  root.style.setProperty("--sidebar-background", 主題.sidebar);
  root.style.setProperty("--ring", 主題.primary);
  root.style.setProperty("--sidebar-primary", 主題.primary);
}