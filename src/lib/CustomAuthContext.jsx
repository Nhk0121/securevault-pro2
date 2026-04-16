import React, { createContext, useState, useContext, useEffect } from "react";
import apiClient, { getToken, removeToken } from "@/api/apiClient";

const CustomAuthContext = createContext();

export const CustomAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      setAuthError({ type: "auth_required", message: "請先登入" });
      setIsLoadingAuth(false);
      return;
    }
    try {
      const res = await apiClient.auth.me();
      const currentUser = res.data || res;
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (e) {
      removeToken();
      setIsAuthenticated(false);
      setAuthError({ type: "auth_required", message: "請先登入" });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    removeToken();
    window.location.href = "/login";
  };

  return (
    <CustomAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin: () => { window.location.href = "/login"; },
        checkAppState: checkAuth,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </CustomAuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(CustomAuthContext);
  if (!context) throw new Error("useAuth must be used within a CustomAuthProvider");
  return context;
};