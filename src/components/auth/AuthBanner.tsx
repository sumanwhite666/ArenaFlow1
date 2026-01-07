"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

type UserInfo = {
  id: string;
  email: string;
  full_name: string | null;
  is_superadmin: boolean;
};

type BannerState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: UserInfo };

export default function AuthBanner() {
  const [state, setState] = useState<BannerState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    apiRequest<{ user: UserInfo | null }>("/api/auth/me")
      .then((result) => {
        if (!mounted) return;
        if (result.user) {
          setState({ status: "signed-in", user: result.user });
        } else {
          setState({ status: "signed-out" });
        }
      })
      .catch(() => {
        if (!mounted) return;
        setState({ status: "signed-out" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="rounded-3xl border border-subtle bg-white/70 p-4 text-sm text-muted">
        Checking session...
      </div>
    );
  }

  if (state.status === "signed-out") {
    return (
      <div className="rounded-3xl border border-subtle bg-white/70 p-4 text-sm text-muted">
        <p className="font-semibold text-[color:var(--ink)]">
          Demo mode active
        </p>
        <p className="mt-1">
          Sign in to manage clubs, sessions, and wallets.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-flex rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-subtle bg-white/70 p-4 text-sm text-muted">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[color:var(--ink)]">
            Signed in as {state.user.email ?? "user"}
          </p>
          <p className="mt-1">Your role is resolved from club memberships.</p>
        </div>
        <button
          onClick={async () => {
            await apiRequest("/api/auth/logout", { method: "POST" }).catch(
              () => null,
            );
            setState({ status: "signed-out" });
          }}
          className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
