import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { adminApi, type SessionInfo } from "@/lib/admin-api";
import { useAdminAuth } from "@/hooks/use-admin-auth";

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(ts?: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortSid(sid: string): string {
  return sid.length > 12 ? sid.slice(0, 12) + "…" : sid;
}

function levelColor(level?: number): string {
  if (level === 3) return "text-red-400";
  if (level === 2) return "text-orange-400";
  if (level === 1) return "text-yellow-400";
  return "text-green-400";
}

function levelLabel(level?: number): string {
  if (level === 3) return "TERMINATED";
  if (level === 2) return "FLAGGED";
  if (level === 1) return "WATCH";
  return "CLEAN";
}

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminSessions() {
  const { loading, authenticated, logout } = useAdminAuth();
  const [, setLocation] = useLocation();

  const [sessions, setSessions]             = useState<SessionInfo[]>([]);
  const [fetchLoading, setFetchLoading]     = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [killing, setKilling]               = useState<string | null>(null);
  const [purging, setPurging]               = useState(false);
  const [notification, setNotification]     = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!loading && !authenticated) setLocation("/admin");
  }, [loading, authenticated, setLocation]);

  const showNote = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSessions = useCallback(async () => {
    try {
      setFetchLoading(true);
      setError(null);
      const data = await adminApi.getSessions();
      setSessions(data.sessions);
    } catch (err) {
      setError(String(err));
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchSessions();
      const iv = setInterval(fetchSessions, 20_000);
      return () => clearInterval(iv);
    }
  }, [authenticated, fetchSessions]);

  const killSession = async (sid: string) => {
    if (!confirm("Terminate this session? The user will be logged out immediately.")) return;
    try {
      setKilling(sid);
      await adminApi.terminateSession(sid);
      showNote("Session terminated");
      await fetchSessions();
    } catch (err) {
      showNote(String(err), "error");
    } finally {
      setKilling(null);
    }
  };

  const purgeAll = async () => {
    if (!confirm("Terminate ALL other admin sessions? Only your current session will remain.")) return;
    try {
      setPurging(true);
      const res = await adminApi.purgeOtherSessions();
      showNote(`✓ ${res.terminated} session(s) terminated`);
      await fetchSessions();
    } catch (err) {
      showNote(String(err), "error");
    } finally {
      setPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  const suspiciousSessions = sessions.filter((s) => s.suspicious && !s.isCurrent);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-800 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/admin/dashboard")}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Dashboard
          </button>
          <span className="text-gray-600">|</span>
          <h1 className="text-[#39ff14] font-bold text-lg">🔐 Active Sessions</h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {sessions.length} total
          </span>
          {suspiciousSessions.length > 0 && (
            <span className="text-xs text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded animate-pulse">
              ⚠ {suspiciousSessions.length} suspicious
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSessions}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded"
          >
            ↻ Refresh
          </button>
          <button
            onClick={purgeAll}
            disabled={purging || sessions.filter((s) => !s.isCurrent).length === 0}
            className="text-xs text-red-400 hover:text-red-300 border border-red-800 px-3 py-1.5 rounded disabled:opacity-40"
          >
            {purging ? "Purging…" : "Terminate All Others"}
          </button>
          <button
            onClick={() => { logout(); setLocation("/admin"); }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Notification ────────────────────────────────────────────────── */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded text-sm font-medium shadow-lg ${
            notification.type === "error"
              ? "bg-red-900 border border-red-600 text-red-200"
              : "bg-[#002200] border border-[#39ff14] text-[#39ff14]"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ── Security Overview ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions",  value: sessions.length,                        color: "text-white" },
            { label: "Clean",           value: sessions.filter((s) => !s.suspicious).length, color: "text-green-400" },
            { label: "Flagged",         value: sessions.filter((s) => s.suspicious).length,  color: "text-orange-400" },
            { label: "Your Session",    value: sessions.find((s) => s.isCurrent)?.userEmail ?? "—", color: "text-[#39ff14]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded p-4">
              <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Sessions table ─────────────────────────────────────────────── */}
        {fetchLoading && sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-12 animate-pulse">Loading sessions…</div>
        ) : error ? (
          <div className="text-center text-red-400 py-12 border border-red-900 rounded bg-red-950/20">
            <p className="text-sm">{error}</p>
            <p className="text-xs text-gray-500 mt-2">
              Session management requires a fresh login (within 15 minutes).
              Try logging out and back in.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No active admin sessions found.</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.sid}
                className={`border rounded p-4 transition-all ${
                  s.isCurrent
                    ? "border-[#39ff14]/40 bg-[#001100]"
                    : s.suspicious
                    ? "border-orange-700/60 bg-orange-950/20"
                    : "border-gray-800 bg-gray-900"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* ── Row 1: ID + user + level ────────────────── */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <code className="text-xs text-gray-500">{shortSid(s.sid)}</code>
                      <span className="text-sm font-medium text-white">{s.userEmail ?? "unknown"}</span>
                      {s.isCurrent && (
                        <span className="text-xs bg-[#39ff14]/20 text-[#39ff14] px-2 py-0.5 rounded">
                          YOUR SESSION
                        </span>
                      )}
                      <span className={`text-xs font-bold ${levelColor(s.securityLevel)}`}>
                        {levelLabel(s.securityLevel)}
                      </span>
                      {s.suspicious && s.suspiciousReason && (
                        <span className="text-xs text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded">
                          ⚠ {s.suspiciousReason}
                        </span>
                      )}
                    </div>

                    {/* ── Row 2: IP + timing ──────────────────────── */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      <span>🌐 {s.loginIp ?? "—"}</span>
                      <span>🕐 Login: {timeAgo(s.loginAt)}</span>
                      <span>📡 Active: {timeAgo(s.lastActivity)}</span>
                      <span>📊 Requests: {s.requestCount ?? 0}</span>
                    </div>

                    {/* ── Row 3: IP history (only if multiple IPs) ── */}
                    {(s.ipHistory?.length ?? 0) > 1 && (
                      <div className="text-xs text-orange-300">
                        IP History:{" "}
                        {s.ipHistory!.map((ip, i) => (
                          <span key={ip} className={i === 0 ? "text-gray-400" : "text-orange-400"}>
                            {i > 0 && " → "}
                            {ip}
                          </span>
                        ))}
                        <span className="text-gray-500 ml-2">
                          ({s.ipChangeCount} change{s.ipChangeCount !== 1 ? "s" : ""})
                        </span>
                      </div>
                    )}

                    {/* ── Row 4: UA (truncated) ────────────────────── */}
                    {s.userAgent && (
                      <p className="text-xs text-gray-600 truncate max-w-xl">{s.userAgent}</p>
                    )}
                  </div>

                  {/* ── Kill button ──────────────────────────────── */}
                  {!s.isCurrent && (
                    <button
                      onClick={() => killSession(s.sid)}
                      disabled={killing === s.sid}
                      className={`shrink-0 text-xs px-3 py-2 rounded border transition-colors ${
                        s.suspicious
                          ? "border-red-600 text-red-400 hover:bg-red-900/30"
                          : "border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700"
                      } disabled:opacity-40`}
                    >
                      {killing === s.sid ? "…" : "Terminate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Legend ────────────────────────────────────────────────────── */}
        <div className="text-xs text-gray-600 border-t border-gray-800 pt-4 space-y-1">
          <p className="font-bold text-gray-500 mb-2">Security Levels:</p>
          <p><span className="text-green-400 font-bold">CLEAN</span> — Normal session, no anomalies detected.</p>
          <p><span className="text-yellow-400 font-bold">WATCH</span> — Monitored, minor change detected.</p>
          <p><span className="text-orange-400 font-bold">FLAGGED</span> — IP or UA changed. Re-authentication required for all actions.</p>
          <p><span className="text-red-400 font-bold">TERMINATED</span> — Both IP and UA changed simultaneously (dual-change attack), or too many IP switches. Session was killed.</p>
        </div>
      </div>
    </div>
  );
}
