"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    setLoading(true);
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      return;
    }
    setLoading(false);

    setMessage("Signed in. Redirecting...");
    const redirectPath = searchParams.get("redirect") || "/dashboard";
    router.push(redirectPath);
  };

  return (
    <div className="stadium-surface min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-md rounded-3xl p-8">
          <div className="mb-6 text-center">
            <p className="font-display text-4xl">Welcome back</p>
            <p className="mt-2 text-sm text-muted">
              Sign in to manage clubs, sessions, and attendance.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <label className="block">
              <span className="text-muted">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="coach@arenaflow.com"
              />
            </label>
            <label className="block">
              <span className="text-muted">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="********"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          {error ? (
            <p className="mt-4 rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-[color:var(--ink)]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 rounded-2xl border border-subtle bg-white/80 p-3 text-xs text-muted">
              {message}
            </p>
          ) : null}
          <p className="mt-6 text-center text-xs text-muted">
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[color:var(--ink)]"
            >
              Create an account
            </Link>
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Back to landing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="stadium-surface min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
            <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center text-sm text-muted">
              Loading sign-in...
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
