"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import QrCard from "@/components/qr/QrCard";
import { apiRequest } from "@/lib/api";

type SessionDetail = {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  capacity: number | null;
  qrToken: string;
  clubName: string;
  sportName: string;
};

type AttendanceRow = {
  id: string;
  status: string;
  scannedAt: string;
  studentId: string;
  studentName: string | null;
};

function SessionDetailContent({ access }: { access: AllowedAccess }) {
  const params = useParams();
  const sessionId = String(params?.id ?? "");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canView =
    access.role === "superadmin" ||
    access.role === "admin" ||
    access.role === "coach";

  const scanUrl = useMemo(() => {
    if (!session?.qrToken) return "";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (baseUrl) {
      return `${baseUrl}/scan?token=${session.qrToken}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/scan?token=${session.qrToken}`;
  }, [session?.qrToken]);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ session: SessionDetail }>(
        `/api/sessions/${sessionId}`,
      );
      setSession(result.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session not found.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const loadAttendance = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await apiRequest<{ attendance: AttendanceRow[] }>(
        `/api/sessions/${sessionId}/attendance`,
      );
      setAttendance(result.attendance ?? []);
    } catch {
      setAttendance([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!canView) return;
    loadSession();
    loadAttendance();
  }, [canView, loadSession, loadAttendance]);

  if (!canView) {
    return (
      <AccessNotice
        title="Access limited"
        message="Only coaches and admins can view session details."
      />
    );
  }

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 text-sm text-muted">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <AccessNotice
        title="Session unavailable"
        message={error || "Unable to load session details."}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-3xl">{session.title}</p>
            <p className="mt-2 text-sm text-muted">
              {session.clubName}{" "}
              {session.sportName ? `- ${session.sportName}` : ""}
            </p>
          </div>
          <Link
            href="/dashboard/sessions"
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Back to sessions
          </Link>
        </div>
        <div className="mt-6 grid gap-4 text-sm text-muted sm:grid-cols-2">
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">Starts</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {new Date(session.startsAt).toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">Location</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {session.location || "TBA"}
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">Capacity</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {session.capacity ?? "Open"}
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">Attendance</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {attendance.length} check-ins
            </p>
          </div>
        </div>
        <div className="mt-6">
          <p className="font-display text-2xl">Attendance list</p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            {attendance.length > 0 ? (
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
                    <p className="text-xs text-muted">{entry.status}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(entry.scannedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            ) : (
              <p>No attendance scans yet.</p>
            )}
          </div>
        </div>
      </div>

      <QrCard
        title="Session QR"
        value={scanUrl || session.qrToken}
        subtitle="Use this QR at the venue"
        downloadName={session.title.toLowerCase().replace(/\s+/g, "-")}
        showDownload
        showPrint
      />
    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Sessions"
        title="Session details"
        subtitle={(access) => `Review training, ${access.userLabel}`}
      >
        {(access) => <SessionDetailContent access={access} />}
      </DashboardShell>
    </div>
  );
}
