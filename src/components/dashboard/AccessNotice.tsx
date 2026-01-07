"use client";

import Link from "next/link";

type AccessNoticeProps = {
  title?: string;
  message: string;
};

export default function AccessNotice({ title, message }: AccessNoticeProps) {
  return (
    <div className="rounded-3xl border border-subtle bg-white/80 p-6 text-sm text-muted">
      {title ? (
        <p className="font-display text-2xl text-[color:var(--ink)]">
          {title}
        </p>
      ) : null}
      <p className="mt-2">{message}</p>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white"
      >
        Back to overview
      </Link>
    </div>
  );
}
