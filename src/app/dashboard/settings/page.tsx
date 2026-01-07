"use client";

import { useEffect, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type AppSettings = {
  id: string;
  registration_fee: number;
  monthly_fee: number;
};

type BillingRun = {
  runMonth: string;
  executedAt: string;
  monthlyFee: number;
  chargedCount: number;
  skippedCount: number;
};

type BillingStatus = {
  lastRun: BillingRun | null;
  currentMonthBilled: boolean;
};

function SettingsContent({ access }: { access: AllowedAccess }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [registrationFee, setRegistrationFee] = useState("100");
  const [monthlyFee, setMonthlyFee] = useState("70");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(
    null,
  );
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [billingError, setBillingError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = access.role === "superadmin";

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const result = await apiRequest<{ settings: AppSettings | null }>(
          "/api/settings",
        );
        if (result.settings) {
          setSettings(result.settings);
          setRegistrationFee(String(result.settings.registration_fee));
          setMonthlyFee(String(result.settings.monthly_fee));
        }

        const billing = await apiRequest<BillingStatus>(
          "/api/billing-runs/latest",
        );
        setBillingStatus(billing);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load settings.");
      } finally {
        setLoading(false);
        setBillingLoading(false);
      }
    };

    loadSettings();
  }, [canManage]);

  if (!canManage) {
    return (
      <AccessNotice
        title="Access limited"
        message="Only superadmins can update platform settings."
      />
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const regValue = Number(registrationFee);
    const monthlyValue = Number(monthlyFee);

    if (Number.isNaN(regValue) || Number.isNaN(monthlyValue)) {
      setError("Enter valid fee values.");
      setSaving(false);
      return;
    }

    try {
      const result = await apiRequest<{ settings: AppSettings }>(
        "/api/settings",
        {
          method: "PATCH",
          body: JSON.stringify({
            registrationFee: regValue,
            monthlyFee: monthlyValue,
          }),
        },
      );
      if (result.settings) {
        setSettings(result.settings);
      }
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const refreshBillingStatus = async () => {
    const billing = await apiRequest<BillingStatus>(
      "/api/billing-runs/latest",
    );
    setBillingStatus(billing);
  };

  const handleRunBilling = async () => {
    setBillingRunning(true);
    setBillingError("");
    setBillingMessage("");
    try {
      const result = await apiRequest<{
        monthly: {
          ran: boolean;
          reason?: string;
          charged?: number;
          skipped?: number;
        };
        registration: {
          ran: boolean;
          reason?: string;
          charged?: number;
          skipped?: number;
        };
      }>("/api/billing-runs/run", { method: "POST" });

      const monthlyNote = result.monthly.ran
        ? `${result.monthly.charged ?? 0} charged / ${
            result.monthly.skipped ?? 0
          } skipped`
        : result.monthly.reason ?? "Skipped";
      const registrationNote = result.registration.ran
        ? `${result.registration.charged ?? 0} charged / ${
            result.registration.skipped ?? 0
          } skipped`
        : result.registration.reason ?? "Skipped";

      setBillingMessage(
        `Monthly: ${monthlyNote}. Registration: ${registrationNote}.`,
      );
      await refreshBillingStatus();
    } catch (err) {
      setBillingError(
        err instanceof Error ? err.message : "Unable to run billing.",
      );
    } finally {
      setBillingRunning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">Billing defaults</p>
        <p className="mt-2 text-sm text-muted">
          Configure registration and monthly fees for all sports.
        </p>
        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            <span className="text-muted">Registration fee (credits)</span>
            <input
              value={registrationFee}
              onChange={(event) => setRegistrationFee(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <span className="text-muted">Monthly fee (credits)</span>
            <input
              value={monthlyFee}
              onChange={(event) => setMonthlyFee(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              inputMode="numeric"
            />
          </label>
          {loading ? (
            <p className="rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-muted">
              Loading settings...
            </p>
          ) : null}
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
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">Notifications</p>
        <p className="mt-2 text-sm text-muted">
          Wallet alerts and attendance reminders will be automated in the next
          phase.
        </p>
        <div className="mt-6 space-y-3 text-sm text-muted">
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="font-semibold text-[color:var(--ink)]">
              Low balance alerts
            </p>
            <p className="text-xs text-muted">
              Alert admins when student credits drop below monthly fees.
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="font-semibold text-[color:var(--ink)]">
              Attendance reminders
            </p>
            <p className="text-xs text-muted">
              Send reminders before each scheduled session.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl">Billing automation</p>
            <p className="mt-2 text-sm text-muted">
              Monthly charges run once per month. Registration fees are applied
              once per wallet.
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
            Scheduler active
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleRunBilling}
            disabled={billingRunning}
            className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {billingRunning ? "Running billing..." : "Run billing now"}
          </button>
          <button
            onClick={refreshBillingStatus}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Refresh status
          </button>
        </div>
        <div className="mt-6 grid gap-4 text-sm text-muted sm:grid-cols-3">
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">This month</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {billingLoading
                ? "Loading..."
                : billingStatus?.currentMonthBilled
                  ? "Charged"
                  : "Pending"}
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">Last run</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {billingLoading
                ? "Loading..."
                : billingStatus?.lastRun
                  ? new Date(
                      billingStatus.lastRun.executedAt,
                    ).toLocaleString("en-US")
                  : "No runs yet"}
            </p>
          </div>
          <div className="rounded-2xl border border-subtle bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em]">Latest counts</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--ink)]">
              {billingLoading || !billingStatus?.lastRun
                ? "--"
                : `${billingStatus.lastRun.chargedCount} charged / ${billingStatus.lastRun.skippedCount} skipped`}
            </p>
          </div>
        </div>
        {billingStatus?.lastRun ? (
          <p className="mt-4 text-xs text-muted">
            Last run month:{" "}
            {new Date(billingStatus.lastRun.runMonth).toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
              },
            )}{" "}
            · Fee: RM {billingStatus.lastRun.monthlyFee.toLocaleString("en-US")}
          </p>
        ) : null}
        {billingMessage ? (
          <p className="mt-4 rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-muted">
            {billingMessage}
          </p>
        ) : null}
        {billingError ? (
          <p className="mt-4 rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-[color:var(--ink)]">
            {billingError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Settings"
        title="Platform settings"
        subtitle={(access) => `Configure ArenaFlow, ${access.userLabel}`}
      >
        {(access) => <SettingsContent access={access} />}
      </DashboardShell>
    </div>
  );
}
