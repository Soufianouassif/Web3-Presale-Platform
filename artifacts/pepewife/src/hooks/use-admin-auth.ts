import { useState, useEffect } from "react";
import { adminApi, type AdminUser } from "@/lib/admin-api";

export function useAdminAuth() {
  const [state, setState] = useState<{
    loading: boolean;
    authenticated: boolean;
    user: AdminUser["user"] | null;
  }>({ loading: true, authenticated: false, user: null });

  useEffect(() => {
    adminApi
      .getMe()
      .then((data) => setState({ loading: false, authenticated: data.authenticated, user: data.user ?? null }))
      .catch(() => setState({ loading: false, authenticated: false, user: null }));
  }, []);

  const logout = async () => {
    await adminApi.logout();
    setState({ loading: false, authenticated: false, user: null });
    window.location.href = "/admin";
  };

  return { ...state, logout };
}
