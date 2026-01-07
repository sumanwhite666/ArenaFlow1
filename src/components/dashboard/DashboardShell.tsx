"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import AuthBanner from "@/components/auth/AuthBanner";
import DashboardAccess, {
  type AllowedAccess,
  type DashboardRole,
} from "@/components/dashboard/DashboardAccess";

type NavItem = {
  label: string;
  href: string;
  roles: DashboardRole[];
};

type DashboardShellProps = {
  active: string;
  title: string;
  subtitle?: (access: AllowedAccess) => string;
  actions?: ReactNode | ((access: AllowedAccess) => ReactNode);
  showScope?: boolean;
  children: (access: AllowedAccess) => ReactNode;
};

const roleLabels: Record<DashboardRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  coach: "Coach",
  student: "Student",
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", roles: ["superadmin", "admin", "coach", "student"] },
  { label: "Sports", href: "/dashboard/sports", roles: ["superadmin"] },
  { label: "Clubs", href: "/dashboard/clubs", roles: ["superadmin", "admin"] },
  { label: "Members", href: "/dashboard/members", roles: ["superadmin", "admin"] },
  { label: "Sessions", href: "/dashboard/sessions", roles: ["superadmin", "admin", "coach"] },
  { label: "Wallets", href: "/dashboard/wallets", roles: ["superadmin", "admin"] },
  { label: "Attendance", href: "/dashboard/attendance", roles: ["superadmin", "admin", "coach", "student"] },
  { label: "Profile", href: "/dashboard/profile", roles: ["student"] },
  { label: "Reports", href: "/dashboard/reports", roles: ["superadmin", "admin"] },
  { label: "Settings", href: "/dashboard/settings", roles: ["superadmin", "admin"] },
];

const renderActions = (
  actions: DashboardShellProps["actions"],
  access: AllowedAccess,
) => {
  if (!actions) return null;
  if (typeof actions === "function") return actions(access);
  return actions;
};

export default function DashboardShell({
  active,
  title,
  subtitle,
  actions,
  showScope = false,
  children,
}: DashboardShellProps) {
  return (
    <DashboardAccess>
      {(access) => {
        const filteredNav = navItems.filter((item) =>
          item.roles.includes(access.role),
        );
        const subtitleText = subtitle ? subtitle(access) : "";

        return (
          <div className="relative z-10 grid min-h-screen lg:grid-cols-[240px_1fr]">
            <aside className="border-b border-subtle bg-white/80 px-6 py-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--primary)] text-white shadow-soft">
                  AF
                </div>
                <div>
                  <p className="font-display text-lg">ArenaFlow</p>
                  <p className="text-xs text-muted">Admin console</p>
                </div>
              </div>
              <nav className="mt-8 space-y-3 text-sm font-semibold text-muted">
                {filteredNav.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 transition ${
                      item.label === active
                        ? "bg-[color:var(--ink)] text-white"
                        : "hover:bg-white/80 hover:text-[color:var(--ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-10 rounded-2xl border border-subtle bg-surface-soft p-4 text-sm text-muted">
                <p className="font-semibold text-[color:var(--ink)]">
                  Need quick setup?
                </p>
                <p className="mt-1">
                  Invite admins and coaches to start tracking sessions today.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex rounded-full bg-[color:var(--ink)] px-4 py-2 text-xs font-semibold text-white"
                >
                  View landing
                </Link>
              </div>
            </aside>

            <main className="px-6 py-8 lg:px-10 lg:py-10">
              <div className="mb-6">
                <AuthBanner />
              </div>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-muted">{subtitleText}</p>
                  <h1 className="font-display text-4xl">{title}</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                  {renderActions(actions, access)}
                </div>
              </div>

              {showScope ? (
                <div className="mt-6 rounded-3xl border border-subtle bg-white/70 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    Access scope
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Role: {roleLabels[access.role]}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                    {access.role === "superadmin" ? (
                      <span className="rounded-full border border-subtle bg-white/80 px-4 py-2">
                        All sports and clubs
                      </span>
                    ) : (
                      access.clubs.map((club) => (
                        <span
                          key={`${club.id}-${club.role}`}
                          className="rounded-full border border-subtle bg-white/80 px-4 py-2"
                        >
                          {club.name}
                          {club.sport ? ` - ${club.sport}` : ""} (
                          {roleLabels[club.role]})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-8">{children(access)}</div>
            </main>
          </div>
        );
      }}
    </DashboardAccess>
  );
}
