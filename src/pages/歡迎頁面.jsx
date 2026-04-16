import React from "react";
import { base44 } from "@/api/base44Client";
import {
  HardDrive, FolderOpen, Clock, Shield, Search,
  Users, AlertTriangle, CheckCircle, Lock, LogIn,
  FileCheck, Trash2, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";

const 功能卡 = ({ icon: Icon, title, desc, color }) => (
  <div className={`flex gap-4 p-5 rounded-xl border bg-card shadow-sm`}>
    <div className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-lg ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className="text-muted-foreground text-sm leading-relaxed">{desc}</div>
    </div>
  </div>
);

const 限制卡 = ({ icon: Icon, text }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
    <Icon className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
    <span className="text-sm text-amber-800">{text}</span>
  </div>
);

export default function 歡迎頁面() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* 頂部導覽 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">雲端檔案管理系統</span>
        </div>
        <Button onClick={handleLogin} className="gap-2 bg-primary hover:bg-primary/90">
          <LogIn className="w-4 h-4" />
          登入系統
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        {/* Hero */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-slate-300">
            <Shield className="w-4 h-4 text-primary" />
            內部人員專用系統
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            集中管理 · 安全存取<br />
            <span className="text-primary">企業級</span>檔案管理平台
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
            提供永久區、時效區雙軌儲存機制，搭配審核流程與稽核日誌，確保組織檔案完整可控。
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" onClick={handleLogin} className="gap-2 bg-primary hover:bg-primary/90 text-base px-8">
              <LogIn className="w-5 h-5" />
              立即登入
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-white/20 text-white hover:bg-white/10"
              onClick={() => window.location.href = '/申請帳號'}>
              <Users className="w-5 h-5" />
              申請帳號
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-white/20 text-white hover:bg-white/10"
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              了解更多
            </Button>
          </div>
        </section>

        {/* 主要功能 */}
        <section id="features" className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">系統主要功能</h2>
            <p className="text-slate-400 text-sm">完整的檔案生命週期管理</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <功能卡 icon={FolderOpen} title="永久區" color="bg-blue-600"
              desc="需經主管審核的重要文件，審核通過後永久保存，確保資料完整性。" />
            <功能卡 icon={Clock} title="時效區" color="bg-cyan-600"
              desc="暫存性檔案，預設保留30天，到期自動提醒，適合短期共用文件。" />
            <功能卡 icon={Trash2} title="資源回收桶" color="bg-slate-600"
              desc="已刪除檔案暫存區，管理員可還原或永久清除，防止誤刪。" />
            <功能卡 icon={FileCheck} title="審核流程" color="bg-green-600"
              desc="永久區檔案上傳後進入待審核狀態，組別審核人員確認後方可存取。" />
            <功能卡 icon={Search} title="稽核日誌" color="bg-purple-600"
              desc="所有上傳、下載、刪除、預覽等操作均留有完整紀錄，可追蹤異常行為。" />
            <功能卡 icon={Users} title="使用者管理" color="bg-orange-600"
              desc="管理員可建立員工與外包人員帳號，並依組別設定存取權限。" />
          </div>
        </section>

        {/* 使用限制 */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">使用限制說明</h2>
            <p className="text-slate-400 text-sm">請詳閱以下規範，確保合規使用</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <限制卡 icon={AlertTriangle} text="外包人員僅能使用時效區，可上傳及下載檔案，無法刪除檔案，亦無法存取永久區。" />
            <限制卡 icon={AlertTriangle} text="執行檔（.exe、.bat 等）上傳受到 IP 白名單限制，非授權 IP 將被拒絕。" />
            <限制卡 icon={AlertTriangle} text="時效區檔案保留期限預設30天，到期後將提示管理員處理，請勿用於永久保存。" />
            <限制卡 icon={AlertTriangle} text="永久區檔案需經組別審核人員審核通過，審核前其他人員無法下載。" />
            <限制卡 icon={AlertTriangle} text="資料夾最多支援3層結構，課別資料夾層下不可再建立子資料夾。" />
            <限制卡 icon={AlertTriangle} text="系統全程記錄操作行為，請勿進行異常大量下載，否則將觸發稽核警示。" />
          </div>
        </section>

        {/* 適用對象 */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
          <h2 className="text-xl font-bold text-center">適用對象</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: CheckCircle, label: "一般員工", desc: "上傳、預覽、下載所屬組別之檔案", color: "text-green-400" },
              { icon: Eye, label: "組別審核人員", desc: "審核本組永久區上傳申請", color: "text-blue-400" },
              { icon: Lock, label: "系統管理員", desc: "使用者管理、系統設定、稽核日誌完整存取", color: "text-purple-400" },
            ].map(item => (
              <div key={item.label} className="space-y-3">
                <item.icon className={`w-8 h-8 mx-auto ${item.color}`} />
                <div className="font-semibold">{item.label}</div>
                <div className="text-sm text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-8">
          <h2 className="text-2xl font-bold">準備好了嗎？</h2>
          <p className="text-slate-400">請使用您的組織帳號登入以開始使用</p>
          <Button size="lg" onClick={handleLogin} className="gap-2 bg-primary hover:bg-primary/90 text-base px-10">
            <LogIn className="w-5 h-5" />
            登入系統
          </Button>
        </section>
      </main>

      <footer className="border-t border-white/10 text-center text-xs text-slate-500 py-6">
        © {new Date().getFullYear()} 雲端檔案管理系統 · 僅供內部人員使用
      </footer>
    </div>
  );
}