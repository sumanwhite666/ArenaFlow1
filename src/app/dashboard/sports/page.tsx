"use client";

import { useCallback, useEffect, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type SportRow = {
  id: string;
  name: string;
  clubCount: number;
};

function SportsContent({ access }: { access: AllowedAccess }) {
  const [sports, setSports] = useState<SportRow[]>([]);
  const [name, setName] = useState("");
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ sports: SportRow[] }>("/api/sports");
      setSports(result.sports ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access.role !== "superadmin") return;
    loadSports();
  }, [access.role, loadSports]);

  if (access.role !== "superadmin") {
    return (
      <AccessNotice
        title="Superadmin only"
        message="Only platform owners can manage the sports directory."
      />
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Enter a sport name.");
      return;
    }

    setSaving(true);
    try {
      if (editingSportId) {
        await apiRequest(`/api/sports/${editingSportId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim() }),
        });
      } else {
        await apiRequest("/api/sports", {
          method: "POST",
          body: JSON.stringify({ name: name.trim() }),
        });
      }
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Unable to save sport.");
      return;
    }
    setSaving(false);

    setName("");
    setEditingSportId(null);
    loadSports();
  };

  const handleEdit = (sport: SportRow) => {
    setEditingSportId(sport.id);
    setName(sport.name);
  };

  const handleDelete = async (sport: SportRow) => {
    const confirmed = window.confirm(
      `Delete "${sport.name}"? Clubs under this sport will be blocked.`,
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/api/sports/${sport.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete sport.");
      return;
    }
    loadSports();
  };

  const resetForm = () => {
    setEditingSportId(null);
    setName("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">
          {editingSportId ? "Edit sport" : "Add a sport"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Define a sport to group clubs and coaches.
        </p>
        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            <span className="text-muted">Sport name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              placeholder="Football"
            />
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
                : editingSportId
                  ? "Update sport"
                  : "Create sport"}
            </button>
            {editingSportId ? (
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
          <p className="font-display text-2xl">Sports directory</p>
          <button
            onClick={loadSports}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Refresh
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted">
          {loading ? (
            <p>Loading sports...</p>
          ) : sports.length > 0 ? (
            sports.map((sport) => (
              <div
                key={sport.id}
                className="flex items-center justify-between rounded-2xl border border-subtle bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[color:var(--ink)]">
                    {sport.name}
                  </p>
                  <p className="text-xs text-muted">
                    {sport.clubCount} clubs
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                    Active
                  </span>
                  <button
                    onClick={() => handleEdit(sport)}
                    className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sport)}
                    className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No sports yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SportsPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Sports"
        title="Sports directory"
        subtitle={(access) => `Manage sports, ${access.userLabel}`}
      >
        {(access) => <SportsContent access={access} />}
      </DashboardShell>
    </div>
  );
}
