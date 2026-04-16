/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderLock, Clock, Trash2, Shield, AlertTriangle, TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 組別列表 } from "@/lib/常數";
import moment from "moment";
import 歡迎橫幅 from "@/components/首頁/歡迎橫幅";
import 即將過期提醒 from "@/components/首頁/即將過期提醒";
import 部門權限儀表板 from "@/components/首頁/部門權限儀表板";
import 待審核快覽 from "@/components/首頁/待審核快覽";
import { 取得當月主題 } from "@/lib/月份主題";

function 統計卡({ 標題, 數值, 圖示: Icon, 顏色類, 強調色 }) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-0 shadow-md">
      <div className={`absolute inset-0 opacity-5 ${顏色類}`} />
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-15 -translate-y-4 translate-x-4 ${顏色類}`} />
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{標題}</p>
            <p className="text-3xl font-bold mt-1.5 tabular-nums">{數值}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${顏色類} bg-opacity-15 shrink-0`}>
            <Icon className="w-5 h-5" style={{ color: 強調色 }} />
          </div>
        </div>
        <div className="mt-3 h-0.5 rounded-full opacity-20" style={{ background: 強調色 }} />
      </CardContent>
    </Card>
  );
}

const 自訂Tooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.fill }}>
            {p.dataKey}：{p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function 首頁() {
  const 當月主題 = 取得當月主題();
  const 主色 = `hsl(${當月主題.primary})`;
  const 輔色 = `hsl(${當月主題.accent})`;

  const { data: 所有檔案 = [] } = useQuery({
    queryKey: ["首頁-檔案"],
    queryFn: () => apiClient.entities.檔案.list("-created_date", 500),
  });

  const { data: 最近日誌 = [] } = useQuery({
    queryKey: ["首頁-日誌"],
    queryFn: () => apiClient.entities.操作日誌.list("-created_date", 50),
  });

  const 永久區數 = 所有檔案.filter(f => f.儲存區域 === "永久區" && !f.已刪除).length;
  const 時效區數 = 所有檔案.filter(f => f.儲存區域 === "時效區" && !f.已刪除).length;
  const 回收桶數 = 所有檔案.filter(f => f.儲存區域 === "資源回收桶").length;
  const 待審核數 = 所有檔案.filter(f => f.審核狀態 === "待審核").length;
  const 異常數 = 最近日誌.filter(l => l.是否異常).length;

  const 即將過期 = 所有檔案.filter(f => {
    if (f.儲存區域 !== "時效區" || f.已刪除 || !f.到期日期) return false;
    const 剩餘 = moment(f.到期日期).diff(moment(), "days");
    return 剩餘 >= 0 && 剩餘 <= 7;
  }).sort((a, b) => moment(a.到期日期).diff(moment(b.到期日期)));

  const 待審核清單 = 所有檔案.filter(f => f.審核狀態 === "待審核" && !f.已刪除);

  const 組別統計 = 組別列表.map(g => ({
    name: g.substring(3),
    永久區: 所有檔案.filter(f => f.所屬組別 === g && f.儲存區域 === "永久區").length,
    時效區: 所有檔案.filter(f => f.所屬組別 === g && f.儲存區域 === "時效區").length,
  }));

  const 區域統計 = [
    { name: "永久區", value: 永久區數 },
    { name: "時效區", value: 時效區數 },
    { name: "回收桶", value: 回收桶數 },
  ];

  const 統計色彩 = [主色, 輔色, "hsl(220,14%,70%)"];

  return (
    <div className="space-y-6">
      <歡迎橫幅 待審核數={待審核數} 即將過期數={即將過期.length} />

      {/* 統計卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <統計卡 標題="永久區" 數值={永久區數} 圖示={FolderLock} 顏色類="bg-blue-500" 強調色={主色} />
        <統計卡 標題="時效區" 數值={時效區數} 圖示={Clock} 顏色類="bg-cyan-500" 強調色={輔色} />
        <統計卡 標題="回收桶" 數值={回收桶數} 圖示={Trash2} 顏色類="bg-slate-500" 強調色="hsl(220,14%,55%)" />
        <統計卡 標題="待審核" 數值={待審核數} 圖示={Shield} 顏色類="bg-amber-500" 強調色="hsl(38,92%,50%)" />
        <統計卡 標題="異常紀錄" 數值={異常數} 圖示={AlertTriangle} 顏色類="bg-red-500" 強調色="hsl(0,72%,51%)" />
      </div>

      {/* 提醒區塊 */}
      {即將過期.length > 0 && <即將過期提醒 檔案列表={即將過期} />}
      {待審核清單.length > 0 && <待審核快覽 待審核檔案={待審核清單} />}

      {/* 圖表區 */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                各組別檔案數量
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 主色 }} />永久區
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 輔色 }} />時效區
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={組別統計} barGap={2}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<自訂Tooltip />} />
                <Bar dataKey="永久區" fill={主色} radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="時效區" fill={輔色} radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">儲存區域分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={區域統計}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                  }
                  labelLine={false}
                >
                  {區域統計.map((_, i) => (
                    <Cell key={i} fill={統計色彩[i % 統計色彩.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {區域統計.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 統計色彩[i] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <部門權限儀表板 所有檔案={所有檔案} />

      {/* 操作紀錄 */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            最近操作紀錄
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {最近日誌.slice(0, 10).map(log => (
              <div
                key={log.id}
                className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 ${log.是否異常 ? "bg-red-50 dark:bg-red-950/20" : ""}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.是否異常 ? "bg-destructive" : "bg-primary"}`} />
                <span className="text-muted-foreground font-mono text-xs w-36 flex-shrink-0">
                  {moment(log.created_date).format("MM/DD HH:mm:ss")}
                </span>
                <span className="font-medium w-14 flex-shrink-0 text-xs bg-muted rounded px-1.5 py-0.5 text-center">
                  {log.操作類型}
                </span>
                <span className="truncate text-muted-foreground text-xs">{log.詳細內容}</span>
                {log.是否異常 && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
              </div>
            ))}
            {最近日誌.length === 0 && (
              <p className="text-muted-foreground text-center py-8 text-sm">暫無操作紀錄</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}