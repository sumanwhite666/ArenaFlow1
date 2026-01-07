"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { apiRequest } from "@/lib/api";

export type DashboardRole = "superadmin" | "admin" | "coach" | "student";

export type ClubAccess = {
  id: string;
  name: string;
  sport?: string | null;
  role: "admin" | "coach" | "student";
};

export type AllowedAccess = {
  status: "allowed";
  role: DashboardRole;
  clubs: ClubAccess[];
  userId: string;
  userLabel: string;
};

type AccessState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "no-membership" }
  | AllowedAccess;

type DashboardAccessProps = {
  children: (access: AllowedAccess) => ReactNode;
};

export default function DashboardAccess({ children }: DashboardAccessProps) {
  const [state, setState] = useState<AccessState>({ status: "loading" });

  const statusCopy = useMemo(() => {
    switch (state.status) {
      case "signed-out":
        return "Sign in to access your club dashboard.";
      case "no-membership":
        return "No club membership assigned yet. Ask an admin for access.";
      case "loading":
        return "Checking access...";
      default:
        return "";
    }
  }, [state.status]);

  useEffect(() => {
    let mounted = true;

    const loadAccess = async () => {
      try {
        const result = await apiRequest<
          | { status: "signed-out" }
          | { status: "no-membership"; userId: string; userLabel: string }
          | AllowedAccess
        >("/api/access");

        if (!mounted) return;

        if (result.status === "signed-out") {
          setState({ status: "signed-out" });
          return;
        }

        if (result.status === "no-membership") {
          setState({ status: "no-membership" });
          return;
        }

        if (result.status === "allowed") {
          setState(result);
          return;
        }
      } catch {
        if (!mounted) return;
        setState({ status: "signed-out" });
      }
    };

    loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status !== "allowed") {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-lg rounded-3xl p-8 text-center">
          <p className="font-display text-3xl">Dashboard access</p>
          <p className="mt-3 text-sm text-muted">{statusCopy}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {state.status === "signed-out" ? (
              <Link
                href="/login"
                className="rounded-full bg-[color:var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-soft"
              >
                Sign in
              </Link>
            ) : null}
            {state.status === "no-membership" ? (
              <Link
                href="/request-access"
                className="rounded-full bg-[color:var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-soft"
              >
                Request access
              </Link>
            ) : null}
            <Link
              href="/"
              className="rounded-full border border-subtle bg-white/80 px-5 py-2 text-xs font-semibold text-muted"
            >
              Back to landing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(state)}</>;
}
