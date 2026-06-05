"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

type PendingUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  purpose: string;
};

type ActiveUser = {
  id: number;
  username: string;
  email: string;
};

type AdminData = {
  pending: PendingUser[];
  active: ActiveUser[];
};

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] ${color}`}
    >
      {label}
    </span>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (res.ok) setData(await res.json());
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (!loading && user && !user.is_admin) { router.push("/"); return; }
    if (!loading && user?.is_admin) fetchUsers();
  }, [loading, user, router, fetchUsers]);

  const action = async (type: "approve" | "reject" | "revoke", id: number, name: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/${type}/${id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${name} ${type}d`, true);
        fetchUsers();
      } else {
        showToast(data.error ?? "Action failed", false);
      }
    } catch {
      showToast("Server unreachable", false);
    } finally {
      setActionId(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-12">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">
            SYSTEM ACCESS
          </p>
          <h1 className="font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">
            ADMIN PANEL
          </h1>
          <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
            Logged in as <span className="text-[var(--accent)]">{user?.username}</span>
          </p>
        </div>

        {/* Stats row */}
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {[
            { label: "Pending Approval", value: data.pending.length, color: "text-amber-400" },
            { label: "Active Users", value: data.active.length, color: "text-emerald-400" },
            { label: "Total", value: data.pending.length + data.active.length, color: "text-[var(--accent)]" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className={`font-mono text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pending section */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-[var(--text)]">
              Pending Approval
            </h2>
            {data.pending.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] text-amber-400">
                {data.pending.length}
              </span>
            )}
          </div>

          {data.pending.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <p className="font-mono text-xs text-[var(--text-muted)]">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.pending.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
                >
                  <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-[var(--text)]">
                          {u.username}
                        </span>
                        <StatusChip label="PENDING" color="border-amber-500/30 text-amber-400" />
                      </div>
                      <p className="font-mono text-xs text-[var(--text-muted)] mb-1">{u.email}</p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)]">
                        📞 {u.phone || "—"}
                      </p>
                      {u.purpose && (
                        <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--text-muted)] rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                          {u.purpose}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => action("approve", u.id, u.username)}
                        disabled={actionId === u.id}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40"
                      >
                        {actionId === u.id ? "..." : "APPROVE"}
                      </button>
                      <button
                        onClick={() => action("reject", u.id, u.username)}
                        disabled={actionId === u.id}
                        className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-40"
                      >
                        {actionId === u.id ? "..." : "REJECT"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Active users section */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-[var(--text)]">
              Active Users
            </h2>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] text-emerald-400">
              {data.active.length}
            </span>
          </div>

          {data.active.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <p className="font-mono text-xs text-[var(--text-muted)]">No active users</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.active.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[var(--text)]">
                        {u.username}
                      </span>
                      <StatusChip label="ACTIVE" color="border-emerald-500/30 text-emerald-400" />
                    </div>
                    <p className="font-mono text-[10px] text-[var(--text-muted)]">{u.email}</p>
                  </div>
                  <button
                    onClick={() => action("revoke", u.id, u.username)}
                    disabled={actionId === u.id}
                    className="rounded-full border border-[var(--border)] px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] transition-all hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                  >
                    {actionId === u.id ? "..." : "REVOKE"}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border px-6 py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-sm ${
              toast.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
