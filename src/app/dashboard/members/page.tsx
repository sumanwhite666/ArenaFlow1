"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess, DashboardRole } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type MembershipRow = {
  id: string;
  role: "admin" | "coach" | "student";
  userId: string;
  clubId: string;
  userName: string | null;
  clubName: string;
  sportName: string;
};

type ClubOption = {
  id: string;
  name: string;
  sport?: string | null;
  sportName?: string | null;
};

type JoinRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  userId: string;
  clubId: string;
  createdAt: string;
  userName: string | null;
  clubName: string;
  sportName: string;
};

const roleLabels: Record<MembershipRow["role"], string> = {
  admin: "Admin",
  coach: "Coach",
  student: "Student",
};

const allowedRoles: Record<DashboardRole, MembershipRow["role"][]> = {
  superadmin: ["admin", "coach", "student"],
  admin: ["coach", "student"],
  coach: [],
  student: [],
};

function MembersContent({ access }: { access: AllowedAccess }) {
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [clubId, setClubId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<MembershipRow["role"]>("student");
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = access.role === "superadmin" || access.role === "admin";
  const roleOptions = allowedRoles[access.role] ?? [];

  const clubOptions = useMemo(
    () =>
      clubs.map((club) => ({
        ...club,
        label: club.sport ? `${club.name} - ${club.sport}` : club.name,
      })),
    [clubs],
  );

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ memberships: MembershipRow[] }>(
        "/api/memberships",
      );
      setMemberships(result.memberships ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load members.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJoinRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const result = await apiRequest<{ requests: JoinRequest[] }>(
        "/api/join-requests",
      );
      setJoinRequests(result.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadClubs = useCallback(async () => {
    try {
      const result = await apiRequest<{ clubs: ClubOption[] }>("/api/clubs");
      setClubs(
        (result.clubs ?? []).map((club) => ({
          id: club.id,
          name: club.name,
          sport: club.sport ?? club.sportName ?? null,
        })),
      );
    } catch {
      setClubs([]);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    loadMemberships();
    loadClubs();
    loadJoinRequests();
  }, [canManage, loadMemberships, loadClubs, loadJoinRequests]);

  const handleSave = async () => {
    if (!clubId || !userId.trim()) {
      setError("Provide a club and user id.");
      return;
    }

    setSaving(true);
    try {
      if (editingMembershipId) {
        await apiRequest(`/api/memberships/${editingMembershipId}`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        });
      } else {
        await apiRequest("/api/memberships", {
          method: "POST",
          body: JSON.stringify({
            clubId,
            userId: userId.trim(),
            role,
          }),
        });
      }
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Unable to save member.");
      return;
    }
    setSaving(false);

    resetForm();
    loadMemberships();
    loadJoinRequests();
  };

  const handleEdit = (member: MembershipRow) => {
    setEditingMembershipId(member.id);
    setUserId(member.userId);
    setClubId(member.clubId);
    setRole(member.role);
  };

  const handleDelete = async (member: MembershipRow) => {
    const confirmed = window.confirm(
      `Remove ${member.userName ?? "member"} from this club?`,
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/api/memberships/${member.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete member.");
      return;
    }
    loadMemberships();
  };

  const handleRequestDecision = async (
    request: JoinRequest,
    decision: "approved" | "rejected",
  ) => {
    setError("");
    if (decision === "approved") {
      try {
        await apiRequest("/api/memberships", {
          method: "POST",
          body: JSON.stringify({
            clubId: request.clubId,
            userId: request.userId,
            role: "student",
          }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to approve.");
        return;
      }
    }

    try {
      await apiRequest(`/api/join-requests/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: decision }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update request.");
      return;
    }

    loadJoinRequests();
    loadMemberships();
  };

  const resetForm = () => {
    setEditingMembershipId(null);
    setUserId("");
    setClubId("");
    setRole(roleOptions[0] ?? "student");
  };

  if (!canManage) {
    return (
      <AccessNotice
        title="Access limited"
        message="Only admins can manage members."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">
          {editingMembershipId ? "Update member role" : "Add club member"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Assign an existing user to a club.
        </p>
        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            <span className="text-muted">User id</span>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              disabled={Boolean(editingMembershipId)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              placeholder="UUID from auth.users"
            />
          </label>
          <label className="block">
            <span className="text-muted">Club</span>
            <select
              value={clubId}
              onChange={(event) => setClubId(event.target.value)}
              disabled={Boolean(editingMembershipId)}
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
            <span className="text-muted">Role</span>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as MembershipRow["role"])
              }
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {roleLabels[option]}
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
                : editingMembershipId
                  ? "Update role"
                  : "Add member"}
            </button>
            {editingMembershipId ? (
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
          <p className="font-display text-2xl">Club members</p>
          <button
            onClick={loadMemberships}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Refresh
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted">
          {loading ? (
            <p>Loading members...</p>
          ) : memberships.length > 0 ? (
            memberships.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[color:var(--ink)]">
                    {member.userName ?? `User ${member.userId.slice(0, 6)}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                      {roleLabels[member.role]}
                    </span>
                    <button
                      onClick={() => handleEdit(member)}
                      className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  {member.clubName}{" "}
                  {member.sportName ? `- ${member.sportName}` : ""}
                </p>
              </div>
            ))
          ) : (
            <p>No memberships found.</p>
          )}
        </div>
        <div className="mt-8 rounded-2xl border border-subtle bg-white/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Join requests
            </p>
            <button
              onClick={loadJoinRequests}
              className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 space-y-2 text-xs text-muted">
            {loadingRequests ? (
              <p>Loading requests...</p>
            ) : joinRequests.length > 0 ? (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-subtle bg-white/80 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[color:var(--ink)]">
                        {request.userName ??
                          `User ${request.userId.slice(0, 6)}`}
                      </p>
                      <p className="text-[11px] text-muted">
                        {request.clubName}{" "}
                        {request.sportName ? `- ${request.sportName}` : ""}
                      </p>
                      <p className="text-[11px] text-muted">
                        Status: {request.status}
                      </p>
                      {request.note ? (
                        <p className="text-[11px] text-muted">
                          Note: {request.note}
                        </p>
                      ) : null}
                    </div>
                    {request.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            handleRequestDecision(request, "approved")
                          }
                          className="rounded-full bg-[color:var(--secondary)] px-3 py-1 text-[11px] font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleRequestDecision(request, "rejected")
                          }
                          className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-[11px] font-semibold text-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p>No join requests.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Members"
        title="Member management"
        subtitle={(access) => `Manage access, ${access.userLabel}`}
      >
        {(access) => <MembersContent access={access} />}
      </DashboardShell>
    </div>
  );
}
