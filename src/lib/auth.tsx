"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AUTH_API = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcHNiYW10cW1wYWRlYmRscGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mzg0MzgsImV4cCI6MjA4NzIxNDQzOH0.N5MgOjG9g8oAlTQgQeAzHWXFcypjJeci9L0qtFvxlCY";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${AUTH_API}/api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${AUTH_API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error };
      setUser(data);
      return {};
    } catch {
      return { error: "Cannot reach auth server" };
    }
  };

  const logout = async () => {
    await fetch(`${AUTH_API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
