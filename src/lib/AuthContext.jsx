import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, getToken } from "@/api/apiClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false); // 自建後端不需要
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    const token = getToken();
    if (!token) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: "auth_required", message: "請先登入" });
      return;
    }
    try {
      const currentUser = await auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (e) {
      setIsAuthenticated(false);
      setAuthError({ type: "auth_required", message: "請先登入" });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    auth.logout();
  };

  const navigateToLogin = () => {
    auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        checkAppState: checkAuth,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};