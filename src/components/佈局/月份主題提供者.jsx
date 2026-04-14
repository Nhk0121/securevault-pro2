import { useEffect } from "react";
import { 取得當月主題, 套用月份主題 } from "@/lib/月份主題";

/**
 * 掛載在 App 頂層，自動根據當月套用色調主題
 */
export default function MonthlyThemeProvider({ children }) {
  useEffect(() => {
    const 主題 = 取得當月主題();
    套用月份主題(主題);
  }, []);

  return children;
}