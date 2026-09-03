'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return;

    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/login');
    }

    if (isAuthenticated && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, pathname, router]);

  const login = useCallback(async (password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
