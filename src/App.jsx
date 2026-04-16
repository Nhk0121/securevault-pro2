import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { CustomAuthProvider as AuthProvider, useAuth } from '@/lib/CustomAuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import 登入頁面 from '@/pages/登入頁面';
import 歡迎頁面 from '@/pages/歡迎頁面';
import 變更密碼頁面 from '@/pages/變更密碼頁面';
import 主佈局 from '@/components/佈局/主佈局';
import 首頁 from '@/pages/首頁';
import 永久區頁面 from '@/pages/永久區頁面';
import 時效區頁面 from '@/pages/時效區頁面';
import 資源回收桶頁面 from '@/pages/資源回收桶頁面';
import 審核管理頁面 from '@/pages/審核管理頁面';
import 稽核日誌頁面 from '@/pages/稽核日誌頁面';
import 系統設定頁面 from '@/pages/系統設定頁面';
import 個人資料頁面 from '@/pages/個人資料頁面';
import 使用者管理頁面 from '@/pages/使用者管理頁面';
import 組課別管理頁面 from '@/pages/組課別管理頁面';
import 外包人員申請頁面 from '@/pages/外包人員申請頁面';
import 連線測試頁面 from '@/pages/連線測試頁面';
import 使用者申請頁面 from '@/pages/使用者申請頁面';
import 電話簿頁面 from '@/pages/電話簿頁面';
import 管理員守衛 from '@/components/佈局/管理員守衛';
import MonthlyThemeProvider from '@/components/佈局/月份主題提供者';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return (
        <Routes>
          <Route path="/login" element={<登入頁面 />} />
          <Route path="/歡迎" element={<歡迎頁面 />} />
          <Route path="/申請帳號" element={<使用者申請頁面 />} />
          <Route path="/連線測試" element={<連線測試頁面 />} />
          <Route path="*" element={<歡迎頁面 />} />
        </Routes>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<登入頁面 />} />
          <Route path="/歡迎" element={<歡迎頁面 />} />
          <Route path="/申請帳號" element={<使用者申請頁面 />} />
          <Route path="/連線測試" element={<連線測試頁面 />} />
      <Route path="/變更密碼" element={<變更密碼頁面 />} />
      <Route element={<主佈局 />}>
        <Route path="/" element={<首頁 />} />
        <Route path="/永久區" element={<永久區頁面 />} />
        <Route path="/時效區" element={<時效區頁面 />} />
        <Route path="/資源回收桶" element={<資源回收桶頁面 />} />
        <Route path="/審核管理" element={<審核管理頁面 />} />
        <Route path="/稽核日誌" element={<稽核日誌頁面 />} />
        <Route path="/系統設定" element={<系統設定頁面 />} />
        <Route path="/個人資料" element={<個人資料頁面 />} />
        <Route path="/使用者管理" element={<管理員守衛><使用者管理頁面 /></管理員守衛>} />
        <Route path="/組課別管理" element={<管理員守衛><組課別管理頁面 /></管理員守衛>} />
        <Route path="/外包人員管理" element={<管理員守衛><外包人員申請頁面 /></管理員守衛>} />
        <Route path="/電話簿" element={<電話簿頁面 />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <MonthlyThemeProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </MonthlyThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App