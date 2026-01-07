"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";

type ClubOption = {
  id: string;
  name: string;
  sportName: string | null;
};

type JoinRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  clubName: string;
  sportName: string;
  createdAt: string;
};

export default function RequestAccessPage() {
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [clubId, setClubId] = useState("");
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const clubOptions = useMemo(
    () =>
      clubs.map((club) => ({
        ...club,
        label: club.sportName ? `${club.name} - ${club.sportName}` : club.name,
      })),
    [clubs],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const auth = await apiRequest<{ user: { id: string } | null }>(
          "/api/auth/me",
        );
        if (!auth.user) {
          setLoading(false);
          return;
        }

        setUserId(auth.user.id);

        const [clubsResult, requestsResult] = await Promise.all([
          apiRequest<{ clubs: ClubOption[] }>("/api/clubs/catalog"),
          apiRequest<{ requests: JoinRequest[] }>("/api/join-requests/self"),
        ]);

        setClubs(clubsResult.clubs ?? []);
        setRequests(requestsResult.requests ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleRequest = async () => {
    if (!clubId || !userId) {
      setError("Select a club to request access.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/api/join-requests", {
        method: "POST",
        body: JSON.stringify({
          clubId,
          note: note.trim() || null,
        }),
      });

      setMessage("Request submitted. An admin will review it soon.");
      setNote("");
      setClubId("");

      const updated = await apiRequest<{ requests: JoinRequest[] }>(
        "/api/join-requests/self",
      );
      setRequests(updated.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
    } finally {
      setSaving(false);
    }
  };

  if (!userId && !loading) {
    return (
      <div className="stadium-surface min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="glass-card w-full max-w-lg rounded-3xl p-8 text-center">
            <p className="font-display text-3xl">Sign in required</p>
            <p className="mt-2 text-sm text-muted">
              Sign in to request access to a club.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stadium-surface min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card rounded-3xl p-6">
            <p className="font-display text-3xl">Request club access</p>
            <p className="mt-2 text-sm text-muted">
              Select a club and share why you need access.
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
                <span className="text-muted">Note (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                  rows={4}
                  placeholder="Share your role or group details..."
                />
              </label>
              {error ? (
                <p className="rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-[color:var(--ink)]">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-muted">
                  {message}
                </p>
              ) : null}
              <button
                onClick={handleRequest}
                disabled={saving}
                className="w-full rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Submitting..." : "Submit request"}
              </button>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
              >
                Back to landing
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl">Your requests</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
              >
                Refresh
              </button>
            </div>
            <div className="mt-6 space-y-3 text-sm text-muted">
              {loading ? (
                <p>Loading requests...</p>
              ) : requests.length > 0 ? (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
                  >
                    <p className="font-semibold text-[color:var(--ink)]">
                      {request.clubName}{" "}
                      {request.sportName ? `- ${request.sportName}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      Status: {request.status}
                    </p>
                    {request.note ? (
                      <p className="text-xs text-muted">
                        Note: {request.note}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p>No requests yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
