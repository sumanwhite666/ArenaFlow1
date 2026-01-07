"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import QrOverlay from "@/components/qr/QrOverlay";
import { apiRequest } from "@/lib/api";

type ClubOption = {
  id: string;
  name: string;
  sportId?: string;
  sportName: string | null;
};

type SessionRow = {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  capacity: number | null;
  clubId: string;
  sportId: string;
  qrToken: string;
  clubName: string;
  sportName: string;
};

function SessionsContent({ access }: { access: AllowedAccess }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(
    null,
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [clubId, setClubId] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage =
    access.role === "superadmin" ||
    access.role === "admin" ||
    access.role === "coach";

  const clubOptions = useMemo(
    () =>
      clubs.map((club) => ({
        ...club,
        label: club.sportName ? `${club.name} - ${club.sportName}` : club.name,
      })),
    [clubs],
  );

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ sessions: SessionRow[] }>(
        "/api/sessions",
      );
      setSessions(result.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClubs = useCallback(async () => {
    try {
      const result = await apiRequest<{ clubs: ClubOption[] }>("/api/clubs");
      setClubs(result.clubs ?? []);
    } catch {
      setClubs([]);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    loadSessions();
    loadClubs();
  }, [canManage, loadSessions, loadClubs]);

  const formatDateTimeLocal = (value: string) => {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60000);
    return adjusted.toISOString().slice(0, 16);
  };

  const startEdit = (session: SessionRow) => {
    setEditingSessionId(session.id);
    setClubId(session.clubId);
    setTitle(session.title);
    setStartsAt(formatDateTimeLocal(session.startsAt));
    setLocation(session.location ?? "");
    setCapacity(session.capacity ? String(session.capacity) : "");
  };

  const resetForm = () => {
    setEditingSessionId(null);
    setClubId("");
    setTitle("");
    setStartsAt("");
    setLocation("");
    setCapacity("");
  };

  const handleCreate = async () => {
    if (!clubId || !title.trim() || !startsAt) {
      setError("Provide a club, title, and start time.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clubId,
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
        location: location.trim() || null,
        capacity: capacity ? Number(capacity) : null,
      };

      if (editingSessionId) {
        await apiRequest(`/api/sessions/${editingSessionId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/sessions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Unable to save session.");
      return;
    }
    setSaving(false);

    resetForm();
    loadSessions();
  };

  const handleDelete = async (session: SessionRow) => {
    const confirmed = window.confirm(
      `Delete session "${session.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/api/sessions/${session.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete session.");
      return;
    }
    loadSessions();
  };

  if (!canManage) {
    return (
      <AccessNotice
        title="Access limited"
        message="Only coaches and admins can manage sessions."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">
          {editingSessionId ? "Edit session" : "Create session"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Schedule training and generate QR attendance.
        </p>
        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            <span className="text-muted">Club</span>
            <select
              value={clubId}
              onChange={(event) => setClubId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
            >
              <option value="">Select a club</option>
              {clubOptions.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted">Session title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              placeholder="U16 Football - Sprint and Shot"
            />
          </label>
          <label className="block">
            <span className="text-muted">Start time</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-muted">Location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="Main court"
              />
            </label>
            <label className="block">
              <span className="text-muted">Capacity</span>
              <input
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="24"
                inputMode="numeric"
              />
            </label>
          </div>
          {error ? (
            <p className="rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-[color:var(--ink)]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving
                ? "Saving..."
                : editingSessionId
                  ? "Update session"
                  : "Create session"}
            </button>
            {editingSessionId ? (
              <button
                onClick={resetForm}
                className="rounded-full border border-subtle bg-white/80 px-4 py-3 text-sm font-semibold text-muted"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">Upcoming sessions</p>
          <button
            onClick={loadSessions}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Refresh
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted">
          {loading ? (
            <p>Loading sessions...</p>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[color:var(--ink)]">
                    {session.title}
                  </p>
                  <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                    {new Date(session.startsAt).toLocaleDateString("en-US")}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {session.clubName}{" "}
                  {session.sportName ? `- ${session.sportName}` : ""}
                </p>
                <p className="text-xs text-muted">
                  {session.location
                    ? `Location: ${session.location}`
                    : "Location: TBA"}{" "}
                  {session.capacity ? `- Capacity: ${session.capacity}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
                  >
                    Show QR
                  </button>
                  <Link
                    href={`/dashboard/sessions/${session.id}`}
                    className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => startEdit(session)}
                    className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(session)}
                    className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No sessions yet.</p>
          )}
        </div>
      </div>
      {selectedSession ? (
        <QrOverlay
          title={selectedSession.title}
          token={selectedSession.qrToken}
          onClose={() => setSelectedSession(null)}
        />
      ) : null}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Sessions"
        title="Session planning"
        subtitle={(access) => `Schedule training, ${access.userLabel}`}
      >
        {(access) => <SessionsContent access={access} />}
      </DashboardShell>
    </div>
  );
}
