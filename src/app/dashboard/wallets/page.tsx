"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AccessNotice from "@/components/dashboard/AccessNotice";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AllowedAccess } from "@/components/dashboard/DashboardAccess";
import { apiRequest } from "@/lib/api";

type WalletRow = {
  id: string;
  balance: number;
  clubId: string;
  clubName: string;
  studentId: string;
  studentName: string | null;
};

type WalletTransaction = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  walletId: string;
  clubName: string;
  studentName: string | null;
};

const reasonOptions = [
  { value: "topup", label: "Top-up" },
  { value: "adjustment", label: "Adjustment" },
  { value: "registration", label: "Registration" },
  { value: "monthly", label: "Monthly fee" },
];

function WalletsContent({ access }: { access: AllowedAccess }) {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [monthlyFee, setMonthlyFee] = useState<number | null>(null);
  const [walletId, setWalletId] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("topup");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingFees, setLoadingFees] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = access.role === "superadmin" || access.role === "admin";

  const walletOptions = useMemo(
    () =>
      wallets.map((wallet) => ({
        id: wallet.id,
        label: `${wallet.studentName ?? "Student"} - ${
          wallet.clubName ?? "Club"
        }`,
      })),
    [wallets],
  );

  const loadWallets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ wallets: WalletRow[] }>("/api/wallets");
      setWallets(result.wallets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallets.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const result = await apiRequest<{ transactions: WalletTransaction[] }>(
        "/api/wallets/transactions",
      );
      setTransactions(result.transactions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load activity.");
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const loadFees = useCallback(async () => {
    setLoadingFees(true);
    try {
      const result = await apiRequest<{ settings: { monthly_fee: number } | null }>(
        "/api/settings",
      );
      setMonthlyFee(result.settings?.monthly_fee ?? null);
    } catch {
      setMonthlyFee(null);
    } finally {
      setLoadingFees(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    loadWallets();
    loadTransactions();
    loadFees();
  }, [canManage, loadWallets, loadTransactions, loadFees]);

  const handleTopup = async () => {
    if (!walletId || !amount) {
      setError("Select a wallet and amount.");
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    const signedAmount = direction === "credit" ? numericAmount : -numericAmount;

    setSaving(true);
    try {
      await apiRequest("/api/wallets/transactions", {
        method: "POST",
        body: JSON.stringify({
          walletId,
          amount: signedAmount,
          reason,
          note: note.trim() || null,
        }),
      });
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Unable to save top-up.");
      return;
    }
    setSaving(false);

    setAmount("");
    setNote("");
    setError("");
    loadWallets();
    loadTransactions();
  };

  const handleMonthlyCharge = async () => {
    if (!monthlyFee || monthlyFee <= 0) {
      setError("Monthly fee not configured.");
      return;
    }

    if (wallets.length === 0) {
      setError("No wallets available for billing.");
      return;
    }

    const confirmed = window.confirm(
      `Apply monthly fee of RM ${monthlyFee} to ${wallets.length} wallets?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/wallets/charge-monthly", { method: "POST" });
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Unable to run billing.");
      return;
    }
    setSaving(false);

    loadWallets();
    loadTransactions();
  };

  if (!canManage) {
    return (
      <AccessNotice
        title="Access limited"
        message="Only admins can manage wallets."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-card rounded-3xl p-6">
        <p className="font-display text-2xl">Wallet top-up</p>
        <p className="mt-2 text-sm text-muted">
          Credit or debit student wallets instantly.
        </p>
        <div className="mt-4 rounded-2xl border border-subtle bg-white/70 p-3 text-xs text-muted">
          {loadingFees ? (
            <p>Loading fee settings...</p>
          ) : monthlyFee ? (
            <p>Monthly fee: RM {monthlyFee}</p>
          ) : (
            <p>No monthly fee configured yet.</p>
          )}
          <button
            onClick={handleMonthlyCharge}
            disabled={saving}
            className="mt-3 w-full rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            Apply monthly fee to all wallets
          </button>
        </div>
        <div className="mt-6 space-y-4 text-sm">
          <label className="block">
            <span className="text-muted">Wallet</span>
            <select
              value={walletId}
              onChange={(event) => setWalletId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
            >
              <option value="">Select a wallet</option>
              {walletOptions.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-muted">Direction</span>
              <select
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as "credit" | "debit")
                }
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              >
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </label>
            <label className="block">
              <span className="text-muted">Reason</span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-muted">Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              placeholder="70"
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <span className="text-muted">Note (optional)</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
              placeholder="Manual top-up"
            />
          </label>
          {error ? (
            <p className="rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-[color:var(--ink)]">
              {error}
            </p>
          ) : null}
          <button
            onClick={handleTopup}
            disabled={saving}
            className="w-full rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Apply transaction"}
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">Wallet balances</p>
          <button
            onClick={loadWallets}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Refresh
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted">
          {loading ? (
            <p>Loading wallets...</p>
          ) : wallets.length > 0 ? (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-2xl border border-subtle bg-white/70 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[color:var(--ink)]">
                    {wallet.studentName ??
                      `Student ${wallet.studentId.slice(0, 6)}`}
                  </p>
                  <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                    RM {wallet.balance.toLocaleString("en-US")}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {wallet.clubName ?? "Club"}
                </p>
              </div>
            ))
          ) : (
            <p>No wallets found.</p>
          )}
        </div>
        <div className="mt-8 rounded-2xl border border-subtle bg-white/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Recent transactions
            </p>
            <button
              onClick={loadTransactions}
              className="rounded-full border border-subtle bg-white/80 px-3 py-1 text-xs font-semibold text-muted"
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 space-y-2 text-xs text-muted">
            {loadingTransactions ? (
              <p>Loading transactions...</p>
            ) : transactions.length > 0 ? (
              transactions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-subtle bg-white/80 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--ink)]">
                      {entry.studentName ?? "Student"} - {entry.clubName}
                    </p>
                    <p className="text-[11px] text-muted">{entry.reason}</p>
                  </div>
                  <p className="text-[11px] font-semibold text-[color:var(--ink)]">
                    {entry.amount >= 0 ? "+" : "-"}RM{" "}
                    {Math.abs(entry.amount).toLocaleString("en-US")}
                  </p>
                </div>
              ))
            ) : (
              <p>No transactions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalletsPage() {
  return (
    <div className="stadium-surface min-h-screen">
      <DashboardShell
        active="Wallets"
        title="Wallet management"
        subtitle={(access) => `Track credits, ${access.userLabel}`}
      >
        {(access) => <WalletsContent access={access} />}
      </DashboardShell>
    </div>
  );
}
