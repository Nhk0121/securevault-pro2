import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">存取受限</h1>
          <p className="text-slate-600 mb-8">
            您的帳號尚未取得此系統的使用權限，請聯繫管理員申請存取。
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600">
            <p>若您認為這是錯誤，請嘗試：</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-left">
              <li>確認您使用正確的帳號登入</li>
              <li>聯繫系統管理員開通權限</li>
              <li>登出後重新登入</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            返回登入頁
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;