"use client";

import { useEffect, useState } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiRequest } from "@/lib/api";

type ReportStat = {
  label: string;
  value: string;
  note: string;
};

type TrendRow = {
  name: string;
  sessions: number;
  attendance: number;
};

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStat[]>([
    { label: "Sessions", value: "--", note: "Last 30 days" },
    { label: "Attendance scans", value: "--", note: "Last 30 days" },
    { label: "Credits in wallets", value: "--", note: "Current balance" },
    { label: "Active clubs", value: "--", note: "All sports" },
  ]);
  const [message, setMessage] = useState("Loading live reports...");
  const [trends, setTrends] = useState<{
    bySport: TrendRow[];
    byCoach: TrendRow[];
  }>({ bySport: [], byCoach: [] });
  const [trendLoading, setTrendLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const result = await apiRequest<{
          sessions: number;
          attendance: number;
          walletsTotal: number;
          clubs: number;
        }>("/api/reports");

        setStats([
          {
            label: "Sessions",
            value: String(result.sessions ?? 0),
            note: "Last 30 days",
          },
          {
            label: "Attendance scans",
            value: String(result.attendance ?? 0),
            note: "Last 30 days",
          },
          {
            label: "Credits in wallets",
            value: `RM ${Number(result.walletsTotal ?? 0).toLocaleString("en-US")}`,
            note: "Current balance",
          },
          {
            label: "Active clubs",
            value: String(result.clubs ?? 0),
            note: "All sports",
          },
        ]);
        setMessage("");

        const trendResult = await apiRequest<{
          bySport: TrendRow[];
          byCoach: TrendRow[];
        }>("/api/reports/trends?days=30");
        setTrends({
          bySport: trendResult.bySport ?? [],
          byCoach: trendResult.byCoach ?? [],
        });
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Unable to load reports.");
      } finally {
        setTrendLoading(false);
      }
    };

    loadReports();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/reports/export?days=30", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Export failed.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const buildBarWidth = (value: number, maxValue: number) => {
    if (!maxValue) return "0%";
    const percent = Math.min(100, Math.round((value / maxValue) * 100));
    return `${percent}%`;
  };

  const maxSportSessions = Math.max(
    0,
    ...trends.bySport.map((row) => row.sessions),
  );
  const maxCoachSessions = Math.max(
    0,
    ...trends.byCoach.map((row) => row.sessions),
  );

  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Reports"
        title="Reports center"
        subtitle={(access) => `Insights for ${access.userLabel}`}
        actions={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        }
      >
        {() => (
          <div className="grid gap-6 lg:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-3xl p-6">
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="font-display text-3xl">{stat.value}</p>
                <p className="text-xs text-muted">{stat.note}</p>
              </div>
            ))}
            <div className="glass-card rounded-3xl p-6 lg:col-span-2">
              <p className="font-display text-2xl">Trends by sport</p>
              <p className="mt-2 text-sm text-muted">
                Last 30 days session volume and attendance.
              </p>
              <div className="mt-6 space-y-3 text-sm text-muted">
                {trendLoading ? (
                  <p>Loading sport trends...</p>
                ) : trends.bySport.length > 0 ? (
                  trends.bySport.map((row) => (
                    <div
                      key={row.name}
                      className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[color:var(--ink)]">
                          {row.name}
                        </p>
                        <p className="text-xs text-muted">
                          {row.sessions} sessions · {row.attendance} check-ins
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[color:var(--primary)]"
                          style={{
                            width: buildBarWidth(
                              row.sessions,
                              maxSportSessions,
                            ),
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No sport trends yet.</p>
                )}
              </div>
            </div>
            <div className="glass-card rounded-3xl p-6 lg:col-span-2">
              <p className="font-display text-2xl">Trends by coach</p>
              <p className="mt-2 text-sm text-muted">
                Session output with recent attendance volume.
              </p>
              <div className="mt-6 space-y-3 text-sm text-muted">
                {trendLoading ? (
                  <p>Loading coach trends...</p>
                ) : trends.byCoach.length > 0 ? (
                  trends.byCoach.map((row) => (
                    <div
                      key={row.name}
                      className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[color:var(--ink)]">
                          {row.name}
                        </p>
                        <p className="text-xs text-muted">
                          {row.sessions} sessions · {row.attendance} check-ins
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[color:var(--secondary)]"
                          style={{
                            width: buildBarWidth(
                              row.sessions,
                              maxCoachSessions,
                            ),
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No coach trends yet.</p>
                )}
              </div>
            </div>
            <div className="glass-card rounded-3xl p-6 lg:col-span-2">
              <p className="font-display text-2xl">Report notes</p>
              <p className="mt-2 text-sm text-muted">
                {message || "Live data loaded from Postgres."}
              </p>
            </div>
          </div>
        )}
      </DashboardShell>
    </div>
  );
}
