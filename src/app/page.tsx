import Link from "next/link";

const stats = [
  { label: "Active clubs", value: "48", note: "3 sports" },
  { label: "Monthly credits", value: "12.4k", note: "RM 1 = 1 credit" },
  { label: "Attendance scans", value: "2,340", note: "Last 30 days" },
];

const highlights = [
  {
    title: "Multi-tenant sports structure",
    description:
      "Organize sports, clubs, coaches, and student groups with clean data separation.",
  },
  {
    title: "Credit-based billing",
    description:
      "Handle registration and monthly fees with wallet balances and manual top-ups.",
  },
  {
    title: "QR attendance capture",
    description:
      "Generate session QR codes and log attendance instantly from any device.",
  },
];

const roles = [
  {
    role: "Superadmin",
    responsibilities: [
      "Create sports and clubs",
      "Assign club admins",
      "Platform-wide reporting",
    ],
  },
  {
    role: "Admin",
    responsibilities: [
      "Manage coaches and students",
      "Credit wallet top-ups",
      "Club performance view",
    ],
  },
  {
    role: "Coach",
    responsibilities: [
      "Create training sessions",
      "Verify attendance",
      "Track student progress",
    ],
  },
  {
    role: "Student",
    responsibilities: [
      "Check credit balance",
      "Scan session QR",
      "View attendance history",
    ],
  },
];

const sessions = [
  {
    time: "6:30 PM",
    title: "U16 Football - Sprint & Shot",
    coach: "Coach Arman",
    capacity: "18/24",
  },
  {
    time: "7:15 PM",
    title: "Basketball Skills - Footwork",
    coach: "Coach Elise",
    capacity: "22/24",
  },
  {
    time: "8:00 PM",
    title: "Tennis Advanced - Serve Lab",
    coach: "Coach Rio",
    capacity: "10/14",
  },
];

const qrCells = Array.from({ length: 49 }, (_, index) => {
  const row = Math.floor(index / 7);
  const col = index % 7;
  const corner =
    (row < 2 && col < 2) ||
    (row < 2 && col > 4) ||
    (row > 4 && col < 2);
  const diagonal = (row + col) % 3 === 0;
  return corner || diagonal;
});

export default function Home() {
  return (
    <div className="stadium-surface min-h-screen">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-24 h-48 w-48 rounded-full border border-white/70 bg-white/60 shadow-soft animate-float" />
        <div
          className="absolute right-[-30px] top-56 h-36 w-36 rounded-full border border-white/60 bg-gradient-to-br from-white/90 to-white/50 shadow-soft animate-float"
          style={{ animationDelay: "1.6s" }}
        />
        <div
          className="absolute left-1/2 top-[520px] h-[2px] w-[280px] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,92,43,0.6),transparent)] animate-sweep"
          style={{ animationDelay: "0.8s" }}
        />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--primary)] text-white shadow-soft">
              AF
            </div>
            <div>
              <p className="font-display text-lg">ArenaFlow</p>
              <p className="text-xs text-muted">Sports club command center</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-muted lg:flex">
            <a href="#features" className="hover:text-[color:var(--ink)]">
              Features
            </a>
            <a href="#roles" className="hover:text-[color:var(--ink)]">
              Roles
            </a>
            <a href="#attendance" className="hover:text-[color:var(--ink)]">
              Attendance
            </a>
            <a href="#pricing" className="hover:text-[color:var(--ink)]">
              Credits
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-subtle bg-white/70 px-4 py-2 text-sm font-semibold text-muted shadow-soft transition hover:text-[color:var(--ink)]"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:translate-y-[-1px]"
            >
              Open dashboard
            </Link>
            <button className="hidden rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:translate-y-[-1px] lg:inline-flex">
              Request demo
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-6 lg:px-10 lg:pt-12">
          <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-6">
              <div className="inline-flex w-fit items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-muted shadow-soft">
                <span className="h-2 w-2 rounded-full bg-[color:var(--secondary)]" />
                Multi-sport operations
              </div>
              <div className="flex flex-col gap-4">
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl">
                  ArenaFlow
                </h1>
                <p className="text-lg text-muted sm:text-xl">
                  Run every club, training session, and credit wallet from one
                  modern hub. Designed for superadmins, coaches, and students.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted">
                <span className="rounded-full border border-subtle bg-white/70 px-4 py-2">
                  Attendance QR
                </span>
                <span className="rounded-full border border-subtle bg-white/70 px-4 py-2">
                  Credit wallet
                </span>
                <span className="rounded-full border border-subtle bg-white/70 px-4 py-2">
                  Multi-club analytics
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:translate-y-[-1px]"
                >
                  Launch dashboard
                </Link>
                <button className="rounded-full border border-subtle bg-white/70 px-6 py-3 text-sm font-semibold text-muted shadow-soft transition hover:text-[color:var(--ink)]">
                  Talk to sales
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-card rounded-2xl p-4 text-sm"
                  >
                    <p className="font-display text-2xl">{stat.value}</p>
                    <p className="text-muted">{stat.label}</p>
                    <p className="text-xs text-muted">{stat.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="glass-card rounded-3xl p-6 animate-rise">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">Today&apos;s sessions</p>
                    <p className="font-display text-3xl">12</p>
                  </div>
                  <div className="rounded-full bg-[color:var(--secondary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    Live
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.title}
                      className="flex items-center justify-between rounded-2xl border border-subtle bg-white/70 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[color:var(--ink)]">
                          {session.title}
                        </p>
                        <p className="text-xs text-muted">
                          {session.time} - {session.coach}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted">
                        {session.capacity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-3xl p-6 animate-rise">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">QR attendance</p>
                    <p className="font-display text-3xl">Scan &amp; Go</p>
                  </div>
                  <div className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    Instant
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-6">
                  <div className="grid grid-cols-7 gap-1 rounded-2xl bg-white p-3 shadow-soft">
                    {qrCells.map((active, index) => (
                      <div
                        key={`${active}-${index}`}
                        className={`h-2.5 w-2.5 rounded-sm ${
                          active ? "bg-[color:var(--ink)]" : "bg-black/10"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="space-y-2 text-sm text-muted">
                    <p className="font-semibold text-[color:var(--ink)]">
                      Unique per session
                    </p>
                    <p>Students scan with any phone camera.</p>
                    <p>Attendance auto-linked to wallets.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="grid gap-6 lg:grid-cols-3">
            {highlights.map((item, index) => (
              <div
                key={item.title}
                className="glass-card rounded-3xl p-6 animate-rise"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="font-display text-2xl">{item.title}</p>
                <p className="mt-3 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </section>

          <section
            id="roles"
            className="grid gap-6 rounded-3xl border border-subtle bg-white/70 p-8 lg:grid-cols-4"
          >
            <div className="lg:col-span-4">
              <p className="font-display text-3xl">Built for every role</p>
              <p className="mt-2 text-sm text-muted">
                Align operations from platform owners to students with tailored
                permissions.
              </p>
            </div>
            {roles.map((item) => (
              <div
                key={item.role}
                className="rounded-2xl border border-subtle bg-white/80 p-5"
              >
                <p className="font-display text-2xl">{item.role}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {item.responsibilities.map((responsibility) => (
                    <li key={responsibility}>- {responsibility}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section
            id="attendance"
            className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div className="space-y-6">
              <p className="font-display text-4xl">
                Attendance and wallet, synced.
              </p>
              <p className="text-sm text-muted">
                Coaches launch sessions, students scan QR codes, and credits are
                reconciled automatically. Keep month-end reporting instant and
                accurate.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                    Monthly fee
                  </p>
                  <p className="font-display text-3xl">70 credits</p>
                  <p className="text-xs text-muted">Flat subscription</p>
                </div>
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                    Registration
                  </p>
                  <p className="font-display text-3xl">100 credits</p>
                  <p className="text-xs text-muted">One-time setup</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Wallet health</p>
                  <p className="font-display text-3xl">RM 18,450</p>
                </div>
                <div className="rounded-full bg-[color:var(--secondary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  Stable
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm text-muted">
                <div className="flex items-center justify-between">
                  <p>Club A (Football)</p>
                  <p className="font-semibold text-[color:var(--ink)]">
                    5,120 credits
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p>Club B (Basketball)</p>
                  <p className="font-semibold text-[color:var(--ink)]">
                    6,780 credits
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p>Club C (Tennis)</p>
                  <p className="font-semibold text-[color:var(--ink)]">
                    6,550 credits
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-subtle bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                  Upcoming deductions
                </p>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  <div className="flex items-center justify-between">
                    <span>Monthly fees</span>
                    <span className="font-semibold text-[color:var(--ink)]">
                      70 credits
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Registration holds</span>
                    <span className="font-semibold text-[color:var(--ink)]">
                      100 credits
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            id="pricing"
            className="grid gap-6 rounded-3xl border border-subtle bg-white/70 p-8 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="space-y-4">
              <p className="font-display text-4xl">Credits made simple</p>
              <p className="text-sm text-muted">
                ArenaFlow keeps fees clear across all sports. Admins top up
                credits manually today, with payment gateways ready for future
                upgrades.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <span className="rounded-full border border-subtle bg-white/80 px-4 py-2">
                  1 credit = RM 1
                </span>
                <span className="rounded-full border border-subtle bg-white/80 px-4 py-2">
                  Monthly fee: 70 credits
                </span>
                <span className="rounded-full border border-subtle bg-white/80 px-4 py-2">
                  Registration: 100 credits
                </span>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="glass-card rounded-2xl p-5">
                <p className="font-display text-2xl">Admin top-ups</p>
                <p className="mt-2 text-sm text-muted">
                  Log cash or bank transfers into wallets with a full audit
                  trail.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="font-display text-2xl">Future gateway</p>
                <p className="mt-2 text-sm text-muted">
                  Stripe or ToyyibPay can be connected when you&apos;re ready.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-[color:var(--ink)] px-8 py-10 text-white">
            <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-display text-4xl">Ready to run every club?</p>
                <p className="mt-2 text-sm text-white/80">
                  Launch ArenaFlow for your sports academy in minutes.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="rounded-full bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:translate-y-[-1px]"
              >
                Explore the dashboard
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-subtle bg-white/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <p>(c) 2025 ArenaFlow. Sports club management, reimagined.</p>
            <div className="flex flex-wrap gap-6">
              <a href="#features" className="hover:text-[color:var(--ink)]">
                Platform
              </a>
              <a href="#roles" className="hover:text-[color:var(--ink)]">
                Roles
              </a>
              <a href="#pricing" className="hover:text-[color:var(--ink)]">
                Credits
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
