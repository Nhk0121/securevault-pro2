import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderLock, Clock, Trash2, FileText, Upload, Download,
  Shield, AlertTriangle, TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 組別列表 } from "@/lib/常數";
import moment from "moment";

const 色彩 = ["hsl(217,71%,45%)", "hsl(199,89%,48%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)"];

function 統計卡({ 標題, 數值, 圖示: Icon, 顏色 }) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
      <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 rounded-full opacity-10 ${顏色}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{標題}</CardTitle>
          <div className={`p-2 rounded-lg ${顏色} bg-opacity-10`}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{數值}</p>
      </CardContent>
    </Card>
  );
}

export default function 首頁() {
  const { data: 所有檔案 = [] } = useQuery({
    queryKey: ["首頁-檔案"],
    queryFn: () => base44.entities.檔案.list("-created_date", 200),
  });

  const { data: 最近日誌 = [] } = useQuery({
    queryKey: ["首頁-日誌"],
    queryFn: () => base44.entities.操作日誌.list("-created_date", 50),
  });

  const 永久區數 = 所有檔案.filter(f => f.儲存區域 === "永久區" && !f.已刪除).length;
  const 時效區數 = 所有檔案.filter(f => f.儲存區域 === "時效區" && !f.已刪除).length;
  const 回收桶數 = 所有檔案.filter(f => f.儲存區域 === "資源回收桶").length;
  const 待審核數 = 所有檔案.filter(f => f.審核狀態 === "待審核").length;
  const 異常數 = 最近日誌.filter(l => l.是否異常).length;

  // Bar chart data by group
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系統總覽</h1>
        <p className="text-muted-foreground text-sm mt-1">歡迎使用雲端檔案管理系統</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <統計卡 標題="永久區檔案" 數值={永久區數} 圖示={FolderLock} 顏色="bg-primary" />
        <統計卡 標題="時效區檔案" 數值={時效區數} 圖示={Clock} 顏色="bg-accent" />
        <統計卡 標題="回收桶" 數值={回收桶數} 圖示={Trash2} 顏色="bg-muted" />
        <統計卡 標題="待審核" 數值={待審核數} 圖示={Shield} 顏色="bg-amber-500" />
        <統計卡 標題="異常紀錄" 數值={異常數} 圖示={AlertTriangle} 顏色="bg-destructive" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">各組別檔案數量</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={組別統計}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="永久區" fill="hsl(217,71%,45%)" radius={[4,4,0,0]} />
                <Bar dataKey="時效區" fill="hsl(199,89%,48%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">儲存區域分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={區域統計} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {區域統計.map((_, i) => (
                    <Cell key={i} fill={色彩[i % 色彩.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近操作紀錄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {最近日誌.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.是否異常 ? "bg-destructive" : "bg-primary"}`} />
                <span className="text-muted-foreground font-mono text-xs w-36 flex-shrink-0">
                  {moment(log.created_date).format("MM/DD HH:mm:ss")}
                </span>
                <span className="font-medium w-16 flex-shrink-0">{log.操作類型}</span>
                <span className="truncate text-muted-foreground">{log.詳細內容}</span>
                {log.是否異常 && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
              </div>
            ))}
            {最近日誌.length === 0 && (
              <p className="text-muted-foreground text-center py-8">暫無操作紀錄</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}