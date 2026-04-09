import { useState, useEffect, useRef, useCallback } from "react";
import { adminApi, type AdminUser } from "@/lib/admin-api";

const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1_000;

export function useAdminAuth() {
  const [state, setState] = useState<{
    loading: boolean;
    authenticated: boolean;
    user: AdminUser["user"] | null;
  }>({ loading: true, authenticated: false, user: null });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const data = await adminApi.getMe();
      setState({ loading: false, authenticated: data.authenticated, user: data.user ?? null });
      if (!data.authenticated && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      setState({ loading: false, authenticated: false, user: null });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    checkSession();

    intervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkSession]);

  const logout = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await adminApi.logout();
    setState({ loading: false, authenticated: false, user: null });
    window.location.href = "/admin";
  };

  return { ...state, logout };
}
