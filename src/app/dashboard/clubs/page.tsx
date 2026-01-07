"use client";

import { useCallback, useEffect, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type ClubRow = {
  id: string;
  name: string;
  sportId: string;
  sportName: string;
};

type SportOption = {
  id: string;
  name: string;
};

function ClubsContent({ access }: { access: AllowedAccess }) {
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [clubName, setClubName] = useState("");
  const [sportId, setSportId] = useState("");
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canCreate = access.role === "superadmin";

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ clubs: ClubRow[] }>("/api/clubs");
      setClubs(result.clubs ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load clubs.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSports = useCallback(async () => {
    try {
      const result = await apiRequest<{ sports: SportOption[] }>("/api/sports");
      setSports(result.sports ?? []);
    } catch {
      setSports([]);
    }
  }, []);

  useEffect(() => {
    loadClubs();
    if (canCreate) {
      loadSports();
    }
  }, [canCreate, loadClubs, loadSports]);

  const handleSave = async () => {
    if (!clubName.trim() || !sportId) {
      setError("Provide a club name and sport.");
      return;
    }

    setSaving(true);
    const payload = {
      name: clubName.trim(),
      sport_id: sportId,
    };
    try {
      if (editingClubId) {
        await apiRequest(`/api/clubs/${editingClubId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: payload.name,
            sportId: payload.sport_id,
          }),
        });
      } else {
        await apiRequest("/api/clubs", {
          method: "POST",
          body: JSON.stringify({
            name: payload.name,
            sportId: payload.sport_id,
          }),
        });
      }
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Unable to save club.");
      return;
    }
    setSaving(false);

    setClubName("");
    setSportId("");
    setEditingClubId(null);
    loadClubs();
  };

  const handleEdit = (club: ClubRow) => {
    if (!canCreate) return;
    setEditingClubId(club.id);
    setClubName(club.name);
    setSportId(club.sportId);
  };

  const handleDelete = async (club: ClubRow) => {
    if (!canCreate) return;
    const confirmed = window.confirm(
      `Delete "${club.name}"? This will remove all club data.`,
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/api/clubs/${club.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete club.");
      return;
    }
    loadClubs();
  };

  const resetForm = () => {
    setEditingClubId(null);
    setClubName("");
    setSportId("");
  };

  if (access.role !== "superadmin" && access.role !== "admin") {
    return (
      <AccessNotice
        title="Access limited"
        message="Only admins can view clubs."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">
          {canCreate
            ? editingClubId
              ? "Edit club"
              : "Add a club"
            : "Club overview"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {canCreate
            ? "Create a new club under a sport."
            : "Clubs you manage under your sport."}
        </p>
        {canCreate ? (
          <div className="mt-6 space-y-4 text-sm">
            <label className="block">
              <span className="text-muted">Club name</span>
              <input
                value={clubName}
                onChange={(event) => setClubName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="Club A"
              />
            </label>
            <label className="block">
              <span className="text-muted">Sport</span>
              <select
                value={sportId}
                onChange={(event) => setSportId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              >
                <option value="">Select a sport</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
            {error ? (
              <p className="rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-[color:var(--ink)]">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving
                  ? "Saving..."
                  : editingClubId
                    ? "Update club"
                    : "Create club"}
              </button>
              {editingClubId ? (
                <button
                  onClick={resetForm}
                  className="rounded-full border border-subtle bg-white/80 px-4 py-3 text-sm font-semibold text-muted"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-subtle bg-white/70 p-4 text-sm text-muted">
            Club creation is limited to superadmins.
          </div>
        )}
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">Clubs</p>
          <button
            onClick={loadClubs}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Refresh
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted">
          {loading ? (
            <p>Loading clubs...</p>
          ) : clubs.length > 0 ? (
            clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between rounded-2xl border border-subtle bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[color:var(--ink)]">
                    {club.name}
                  </p>
                  <p className="text-xs text-muted">
                    Sport: {club.sportName ?? "Unassigned"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                    Active
                  </span>
                  {canCreate ? (
                    <>
                      <button
                        onClick={() => handleEdit(club)}
                        className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(club)}
                        className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p>No clubs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClubsPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Clubs"
        title="Club management"
        subtitle={(access) => `Manage clubs, ${access.userLabel}`}
      >
        {(access) => <ClubsContent access={access} />}
      </DashboardShell>
    </div>
  );
}
