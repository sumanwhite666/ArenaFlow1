"use client";

import { useEffect, useMemo, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type WalletRow = {
  id: string;
  balance: number;
  clubName: string;
  sportName: string;
};

type AttendanceSummary = {
  total: number;
  recent: number;
  lastSeen: string | null;
};

type ProfileResponse = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    role: string;
    isSuperadmin: boolean;
  };
  clubs: Array<{
    id: string;
    name: string;
    sport?: string | null;
    role: "admin" | "coach" | "student";
  }>;
  wallets: WalletRow[];
  attendanceSummary: AttendanceSummary;
};

type AttendanceItem = {
  id: string;
  status: string;
  scannedAt: string;
  sessionTitle: string;
};

function ProfileContent({ access }: { access: AllowedAccess }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [error, setError] = useState("");

  const totalCredits = useMemo(
    () =>
      profile?.wallets.reduce((sum, wallet) => sum + wallet.balance, 0) ?? 0,
    [profile?.wallets],
  );

  useEffect(() => {
    if (access.role !== "student") return;

    const loadProfile = async () => {
      try {
        const result = await apiRequest<ProfileResponse>("/api/profile");
        setProfile(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    const loadAttendance = async () => {
      try {
        const result = await apiRequest<{ attendance: AttendanceItem[] }>(
          "/api/attendance?limit=40",
        );
        setAttendance(result.attendance ?? []);
      } catch {
        setAttendance([]);
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadProfile();
    loadAttendance();
  }, [access.role]);

  if (access.role !== "student") {
    return (
      <AccessNotice
        title="Student only"
        message="This page is reserved for student self-service profiles."
      />
    );
  }

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 text-sm text-muted">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <AccessNotice
        title="Profile unavailable"
        message={error || "Unable to load your profile details."}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6">
        <div className="glass-card rounded-3xl p-6">
          <p className="font-display text-2xl">Profile</p>
          <p className="mt-2 text-sm text-muted">
            Manage your details and see your current access.
          </p>
          <div className="mt-6 space-y-4 text-sm">
            <div className="rounded-2xl border border-subtle bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Name
              </p>
              <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
                {profile.user.fullName || "Student"}
              </p>
              <p className="text-xs text-muted">{profile.user.email}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-subtle bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Role
                </p>
                <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
                  Student
                </p>
              </div>
              <div className="rounded-2xl border border-subtle bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Phone
                </p>
                <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
                  {profile.user.phone || "Not set"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <p className="font-display text-2xl">Wallet overview</p>
          <p className="mt-2 text-sm text-muted">
            Total credits across your clubs.
          </p>
          <div className="mt-4 rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Total credits
            </p>
            <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
              RM {totalCredits.toLocaleString("en-US")}
            </p>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted">
            {profile.wallets.length > 0 ? (
              profile.wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                >
                  <p className="font-semibold text-[color:var(--ink)]">
                    {wallet.clubName} - {wallet.sportName}
                  </p>
                  <p className="text-xs text-muted">
                    Balance: RM {wallet.balance.toLocaleString("en-US")}
                  </p>
                </div>
              ))
            ) : (
              <p>No wallet records yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card rounded-3xl p-6">
          <p className="font-display text-2xl">Attendance summary</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm text-muted">
            <div className="rounded-2xl border border-subtle bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Total check-ins
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
                {profile.attendanceSummary.total}
              </p>
            </div>
            <div className="rounded-2xl border border-subtle bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Last 30 days
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
                {profile.attendanceSummary.recent}
              </p>
            </div>
            <div className="rounded-2xl border border-subtle bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Last check-in
              </p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
                {profile.attendanceSummary.lastSeen
                  ? new Date(
                      profile.attendanceSummary.lastSeen,
                    ).toLocaleDateString("en-US")
                  : "No scans yet"}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Attendance history</p>
              <p className="font-display text-2xl">Recent sessions</p>
            </div>
            <button
              onClick={async () => {
                setAttendanceLoading(true);
                try {
                  const result = await apiRequest<{ attendance: AttendanceItem[] }>(
                    "/api/attendance?limit=40",
                  );
                  setAttendance(result.attendance ?? []);
                } finally {
                  setAttendanceLoading(false);
                }
              }}
              className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
            >
              Refresh
            </button>
          </div>
          <div className="mt-6 space-y-3 text-sm text-muted">
            {attendanceLoading ? (
              <p>Loading attendance...</p>
            ) : attendance.length > 0 ? (
              attendance.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--ink)]">
                      {entry.sessionTitle}
                    </p>
                    <p className="text-xs text-muted">{entry.status}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(entry.scannedAt).toLocaleString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      day: "2-digit",
                    })}
                  </p>
                </div>
              ))
            ) : (
              <p>No attendance records yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Profile"
        title="My profile"
        subtitle={(access) => `Welcome back, ${access.userLabel}`}
      >
        {(access) => <ProfileContent access={access} />}
      </DashboardShell>
    </div>
  );
}
