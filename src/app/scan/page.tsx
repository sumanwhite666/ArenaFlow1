"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

type ScanState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

type SessionInfo = {
  id: string;
  title: string;
  clubName: string;
  sportName: string;
};

function ScanContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [state, setState] = useState<ScanState>({
    status: "idle",
    message: "Scan a QR code to check in.",
  });

  useEffect(() => {
    const param = searchParams.get("token") ?? "";
    if (param) {
      setToken(param);
      setInputToken(param);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    const handleScan = async () => {
      setState({ status: "loading", message: "Checking session..." });

      try {
        const lookup = await apiRequest<{ session: SessionInfo }>(
          `/api/sessions/lookup?token=${encodeURIComponent(token)}`,
        );

        if (mounted) {
          setSession(lookup.session);
        }

        await apiRequest("/api/attendance", {
          method: "POST",
          body: JSON.stringify({ token }),
        });

        if (mounted) {
          setState({
            status: "success",
            message: "Attendance recorded. Have a great session!",
          });
        }
      } catch (err) {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : "Unable to record attendance.";
        setState({
          status: "error",
          message:
            message === "Unauthorized."
              ? "Sign in to record attendance."
              : message,
        });
      }
    };

    handleScan();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="stadium-surface min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-lg rounded-3xl p-8 text-center">
          <p className="font-display text-4xl">Session check-in</p>
          <p className="mt-2 text-sm text-muted">
            {session
              ? `${session.title} - ${session.clubName}`
              : "Scan a QR code to log attendance."}
          </p>
          <div className="mt-6 rounded-2xl border border-subtle bg-white/80 p-4 text-sm text-muted">
            <p className="font-semibold text-[color:var(--ink)]">
              {state.message}
            </p>
          </div>
          {!token ? (
            <div className="mt-6 text-sm text-muted">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-muted">
                  Enter token
                </span>
                <input
                  value={inputToken}
                  onChange={(event) => setInputToken(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                  placeholder="Paste token from QR"
                />
              </label>
              <button
                onClick={() => {
                  const trimmed = inputToken.trim();
                  if (!trimmed) {
                    setState({
                      status: "error",
                      message: "Enter a valid token.",
                    });
                    return;
                  }
                  setToken(trimmed);
                }}
                className="mt-4 w-full rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft"
              >
                Check in
              </button>
            </div>
          ) : null}
          {state.status === "error" ? (
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Back to landing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="stadium-surface min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
            <div className="glass-card w-full max-w-lg rounded-3xl p-8 text-center text-sm text-muted">
              Loading check-in...
            </div>
          </div>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
