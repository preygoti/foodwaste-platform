import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("hl_user");
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    const u = localStorage.getItem("hl_user");
    return !u;
  });

  // Validate currently stored token and fetch live user profile from /auth/me
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      localStorage.removeItem("hl_user");
      setLoading(false);
      return null;
    }
    try {
      const userData = await api.me();
      setUser(userData);
      localStorage.setItem("hl_user", JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.warn("Session token validation failed:", err.message);
      localStorage.removeItem("token");
      localStorage.removeItem("hl_user");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth on component mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Synchronize authentication across multiple browser tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "hl_user") {
        refreshUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshUser]);

  // Listen for 401 unauthorized events from api.js
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("hl_user");
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    // 1. Clear any residual auth state
    localStorage.removeItem("token");
    localStorage.removeItem("hl_user");
    setUser(null);

    // 2. Perform login request
    const data = await api.login(email, password);
    localStorage.setItem("token", data.access_token);
    if (data.user) {
      setUser(data.user);
      localStorage.setItem("hl_user", JSON.stringify(data.user));
    }

    // 3. Verify live session from /auth/me
    try {
      const verifiedUser = await api.me();
      setUser(verifiedUser);
      localStorage.setItem("hl_user", JSON.stringify(verifiedUser));
      return verifiedUser;
    } catch (_) {
      setUser(data.user);
      return data.user;
    }
  };

  const register = async (payload) => {
    // 1. Clear any residual auth state
    localStorage.removeItem("token");
    localStorage.removeItem("hl_user");
    setUser(null);

    // 2. Perform register request
    const data = await api.register(payload);
    localStorage.setItem("token", data.access_token);
    if (data.user) {
      setUser(data.user);
      localStorage.setItem("hl_user", JSON.stringify(data.user));
    }

    // 3. Verify live session from /auth/me
    try {
      const verifiedUser = await api.me();
      setUser(verifiedUser);
      localStorage.setItem("hl_user", JSON.stringify(verifiedUser));
      return verifiedUser;
    } catch (_) {
      setUser(data.user);
      return data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("hl_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
