"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";

type QuickStat = {
  label: string;
  value: string;
  delta: string;
};

type AttendanceItem = {
  student: string;
  session: string;
  time: string;
  status: string;
};

type WalletMove = {
  club: string;
  action: string;
  note: string;
};

type DashboardLiveProps = {
  initialStats: QuickStat[];
  initialAttendance: AttendanceItem[];
  initialWalletMoves: WalletMove[];
};

type DataStatus = "loading" | "live" | "sample" | "error";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

const reasonLabels: Record<string, string> = {
  registration: "Registration fee",
  monthly: "Monthly fee",
  topup: "Manual top-up",
  adjustment: "Adjustment",
};

const formatCount = (value: number) => value.toLocaleString("en-US");

const formatCredits = (value: number) =>
  `RM ${value.toLocaleString("en-US")}`;

const formatTime = (value?: string | null) => {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default function DashboardLive({
  initialStats,
  initialAttendance,
  initialWalletMoves,
}: DashboardLiveProps) {
  const [stats, setStats] = useState(initialStats);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [walletMoves, setWalletMoves] = useState(initialWalletMoves);
  const [status, setStatus] = useState<DataStatus>("loading");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState("all");

  const statusCopy = useMemo(() => {
    switch (status) {
      case "sample":
        return "Sign in to load live data. Showing sample data.";
      case "error":
        return "Live data unavailable. Showing sample data.";
      case "loading":
        return "Loading live data...";
      default:
        return "";
    }
  }, [status]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const result = await apiRequest<{
          stats: { students: number; sessions: number; walletsTotal: number };
          attendance: Array<{
            student: string | null;
            session: string;
            time: string;
            status: string;
          }>;
          walletMoves: Array<{ amount: number; reason: string; club: string }>;
        }>("/api/dashboard/live");

        if (!isMounted) return;

        setStats([
          {
            label: "Students active",
            value: formatCount(result.stats.students),
            delta: "Live",
          },
          {
            label: "Credits in wallets",
            value: formatCredits(result.stats.walletsTotal),
            delta: "Live",
          },
          {
            label: "Sessions this week",
            value: formatCount(result.stats.sessions),
            delta: "Last 7 days",
          },
        ]);

        setAttendance(
          result.attendance.map((row) => ({
            student: row.student ?? "Student",
            session: row.session,
            time: formatTime(row.time),
            status: titleCase(row.status ?? "present"),
          })),
        );

        setWalletMoves(
          result.walletMoves.map((row) => ({
            club: row.club,
            action: `${row.amount >= 0 ? "+" : "-"}${formatCount(
              Math.abs(row.amount),
            )} credits`,
            note: reasonLabels[row.reason] ?? "Wallet update",
          })),
        );

        setStatus("live");
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof Error && error.message === "Unauthorized.") {
          setStatus("sample");
          return;
        }
        setStatus("error");
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadNotifications = async (filter = notificationFilter) => {
    setNotificationsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "6" });
      if (filter === "unread") {
        params.set("unread", "1");
      } else if (filter !== "all") {
        params.set("type", filter);
      }
      const result = await apiRequest<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>(`/api/notifications?${params.toString()}`);
      setNotifications(result.notifications ?? []);
      setUnreadCount(result.unreadCount ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await apiRequest("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ ids: [id] }),
      });
      await loadNotifications();
    } catch {
      // Ignore failures to keep UI responsive.
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ all: true }),
      });
      await loadNotifications();
    } catch {
      // Ignore failures to keep UI responsive.
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [notificationFilter]);

  return (
    <div>
      {status !== "live" ? (
        <div className="mb-6 rounded-2xl border border-subtle bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {statusCopy}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-3xl p-6">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="font-display text-3xl">{stat.value}</p>
            <p className="text-xs text-muted">{stat.delta}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Recent attendance</p>
              <p className="font-display text-2xl">Live check-ins</p>
            </div>
            <span className="rounded-full bg-[color:var(--secondary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Active
            </span>
          </div>
          <div className="mt-6 space-y-3 text-sm text-muted">
            {attendance.length > 0 ? (
              attendance.map((entry) => (
                <div
                  key={`${entry.student}-${entry.session}-${entry.time}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--ink)]">
                      {entry.student}
                    </p>
                    <p className="text-xs text-muted">{entry.session}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[color:var(--ink)]">
                      {entry.status}
                    </p>
                    <p className="text-xs text-muted">{entry.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-subtle bg-white/70 px-4 py-3 text-xs text-muted">
                No attendance scans yet.
              </p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <p className="text-sm text-muted">Wallet pulse</p>
          <p className="font-display text-2xl">Credits in motion</p>
          <div className="mt-6 space-y-3 text-sm text-muted">
            {walletMoves.length > 0 ? (
              walletMoves.map((move) => (
                <div
                  key={`${move.club}-${move.action}`}
                  className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[color:var(--ink)]">
                      {move.club}
                    </p>
                    <p className="text-xs font-semibold text-[color:var(--ink)]">
                      {move.action}
                    </p>
                  </div>
                  <p className="text-xs text-muted">{move.note}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-subtle bg-white/70 px-4 py-3 text-xs text-muted">
                No wallet activity yet.
              </p>
            )}
          </div>
          <div className="mt-6 rounded-2xl border border-subtle bg-white/80 p-4 text-sm text-muted">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Balance safeguard
            </p>
            <p className="mt-2">
              Alert admins when wallet balance falls below monthly fees.
            </p>
            <button className="mt-4 rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white">
              Enable alerts
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Notifications</p>
              <p className="font-display text-2xl">Alerts & reminders</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={notificationFilter}
                onChange={(event) => setNotificationFilter(event.target.value)}
                className="rounded-full border border-subtle bg-white/80 px-3 py-2 text-xs font-semibold text-muted"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="low_balance">Low balance</option>
                <option value="session_reminder">Session reminders</option>
              </select>
              <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                {unreadCount} unread
              </span>
              <button
                onClick={markAllRead}
                className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
              >
                Mark all read
              </button>
              <button
                onClick={() => loadNotifications()}
                className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm text-muted">
            {notificationsLoading ? (
              <p>Loading notifications...</p>
            ) : notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[color:var(--ink)]">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {!item.readAt ? (
                        <button
                          onClick={() => markOneRead(item.id)}
                          className="rounded-full border border-subtle bg-white/80 px-2 py-1 text-[11px] font-semibold text-muted"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {item.body ? (
                    <p className="mt-1 text-xs text-muted">{item.body}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p>No notifications yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
