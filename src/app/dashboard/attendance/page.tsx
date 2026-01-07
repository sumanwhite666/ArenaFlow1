"use client";

import { useCallback, useEffect, useState } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type AttendanceRow = {
  id: string;
  status: string;
  scannedAt: string;
  studentId: string;
  studentName: string | null;
  sessionTitle: string;
};

function AttendanceContent({ access }: { access: AllowedAccess }) {
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ attendance: AttendanceRow[] }>(
        "/api/attendance",
      );
      setAttendance(result.attendance ?? []);
    } catch {
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [access.userId, loadAttendance]);

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl">Recent attendance</p>
        <button
          onClick={loadAttendance}
          className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
        >
          Refresh
        </button>
      </div>
      <div className="mt-6 space-y-3 text-sm text-muted">
        {loading ? (
          <p>Loading attendance...</p>
        ) : attendance.length > 0 ? (
          attendance.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-subtle bg-white/70 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-[color:var(--ink)]">
                  {entry.studentName ??
                    `Student ${entry.studentId.slice(0, 6)}`}
                </p>
                <p className="text-xs text-muted">
                  {entry.sessionTitle ?? "Session"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[color:var(--ink)]">
                  {entry.status}
                </p>
                <p className="text-xs text-muted">
                  {new Date(entry.scannedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p>No attendance records yet.</p>
        )}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Attendance"
        title="Attendance log"
        subtitle={(access) => `Track scans, ${access.userLabel}`}
      >
        {(access) => <AttendanceContent access={access} />}
      </DashboardShell>
    </div>
  );
}
