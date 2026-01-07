"use client";

import DashboardLive from "@/components/dashboard/DashboardLive";
import DashboardShell from "@/components/dashboard/DashboardShell";

const quickStats = [
  { label: "Students active", value: "1,120", delta: "+6% MoM" },
  { label: "Credits in wallets", value: "RM 18,450", delta: "Stable" },
  { label: "Sessions this week", value: "38", delta: "+4 new" },
];

const recentAttendance = [
  {
    student: "Aiman Iskandar",
    session: "Football U16 - Sprint & Shot",
    time: "18:32",
    status: "Present",
  },
  {
    student: "Suriya Tan",
    session: "Basketball Skills - Footwork",
    time: "19:18",
    status: "Present",
  },
  {
    student: "Kai Wen",
    session: "Tennis Advanced - Serve Lab",
    time: "20:04",
    status: "Late",
  },
];

const walletMoves = [
  { club: "Club A (Football)", action: "+600 credits", note: "Manual top-up" },
  { club: "Club B (Basketball)", action: "-70 credits", note: "Monthly fee" },
  { club: "Club C (Tennis)", action: "+320 credits", note: "Top-up" },
];

export default function DashboardPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Overview"
        title="Today's command view"
        subtitle={(access) => `Welcome back, ${access.userLabel}`}
        actions={
          <>
            <button className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-sm font-semibold text-muted shadow-soft">
              Generate QR
            </button>
            <button className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-soft">
              Add session
            </button>
          </>
        }
        showScope
      >
        {() => (
          <DashboardLive
            initialStats={quickStats}
            initialAttendance={recentAttendance}
            initialWalletMoves={walletMoves}
          />
        )}
      </DashboardShell>
    </div>
  );
}
