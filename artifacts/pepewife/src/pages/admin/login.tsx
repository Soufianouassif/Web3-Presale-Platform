import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export default function AdminLogin() {
  const { loading, authenticated } = useAdminAuth();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  useEffect(() => {
    if (!loading && authenticated) {
      setLocation("/admin/dashboard");
    }
  }, [loading, authenticated, setLocation]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#39ff14]/20 to-[#00d4ff]/20 border border-[#39ff14]/30 mb-6">
            <svg className="w-10 h-10 text-[#39ff14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PEPEWIFE Admin</h1>
          <p className="text-gray-400">Presale Control Panel</p>
        </div>

        <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error === "unauthorized"
                ? "Your Google account is not authorized as admin."
                : "Login failed. Please try again."}
            </div>
          )}

          <p className="text-gray-400 text-sm text-center mb-8">
            Sign in with your authorized Google account to access the admin dashboard.
          </p>

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white hover:bg-gray-100 transition-colors rounded-xl font-semibold text-gray-800 shadow-lg"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </a>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-gray-600">
              Access restricted to authorized administrators only.
              <br />
              Unauthorized access attempts are logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
