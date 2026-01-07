"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
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
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          fullName,
        }),
      });
      setMessage("Account created. You can sign in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stadium-surface min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-md rounded-3xl p-8">
          <div className="mb-6 text-center">
            <p className="font-display text-4xl">Create your account</p>
            <p className="mt-2 text-sm text-muted">
              Start managing clubs and training sessions in minutes.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <label className="block">
              <span className="text-muted">Full name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="Aiman Iskandar"
              />
            </label>
            <label className="block">
              <span className="text-muted">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-subtle bg-white px-4 py-3 text-[color:var(--ink)] shadow-soft outline-none"
                placeholder="admin@arenaflow.com"
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
              className="w-full rounded-full bg-[color:var(--secondary)] px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Create account"}
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
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[color:var(--ink)]"
            >
              Sign in
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
