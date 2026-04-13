/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Clock } from "lucide-react";
import moment from "moment";

export default function 頂部欄() {
  const [使用者, set使用者] = useState(null);
  const [現在時間, set現在時間] = useState(moment());

  useEffect(() => {
    base44.auth.me().then(set使用者).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => set現在時間(moment()), 1000);
    return () => clearInterval(timer);
  }, []);

  const 登出 = () => base44.auth.logout();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4" />
          <span className="font-mono font-medium">
            {現在時間.format("YYYY年MM月DD日 HH:mm:ss")}
          </span>
          <span className="text-xs opacity-70">（民國{現在時間.year() - 1911}年）</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">{使用者?.full_name || "使用者"}</p>
                <p className="text-xs text-muted-foreground">{使用者?.role || "一般使用者"}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs text-muted-foreground">
              {使用者?.email}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs text-muted-foreground">
              組別：{使用者?.所屬組別 || "未設定"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={登出} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              登出系統
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}