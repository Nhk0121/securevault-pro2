import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import 側邊欄 from "./側邊欄";
import 頂部欄 from "./頂部欄";
import { cn } from "@/lib/utils";

export default function 主佈局() {
  const [側邊欄已收合, set側邊欄已收合] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <側邊欄 已收合={側邊欄已收合} 切換收合={() => set側邊欄已收合(!側邊欄已收合)} />
      <div
        className={cn(
          "transition-all duration-300",
          側邊欄已收合 ? "ml-16" : "ml-60"
        )}
      >
        <頂部欄 />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}