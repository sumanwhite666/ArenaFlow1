import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type WalletRow = {
  id: string;
  balance: number;
  club_name: string;
  sport_name: string;
};

type AttendanceSummaryRow = {
  total: number;
  last_seen: string | null;
  recent: number;
};

export async function GET() {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { rows: profileRows } = await pool.query<{
    full_name: string | null;
    phone: string | null;
    email: string;
    is_superadmin: boolean;
  }>(
    `
      select full_name, phone, email, is_superadmin
      from public.profiles
      where id = $1
    `,
    [access.userId],
  );

  const profile = profileRows[0];

  const { rows: walletRows } = await pool.query<WalletRow>(
    `
      select w.id, w.balance, c.name as club_name, s.name as sport_name
      from public.wallets w
      join public.clubs c on c.id = w.club_id
      join public.sports s on s.id = c.sport_id
      where w.student_id = $1
      order by c.name
    `,
    [access.userId],
  );

  const { rows: summaryRows } = await pool.query<AttendanceSummaryRow>(
    `
      select
        count(*)::int as total,
        max(scanned_at) as last_seen,
        count(*) filter (where scanned_at >= now() - interval '30 days')::int as recent
      from public.attendance
      where student_id = $1
    `,
    [access.userId],
  );

  const summary = summaryRows[0] ?? {
    total: 0,
    last_seen: null,
    recent: 0,
  };

  return NextResponse.json({
    user: {
      id: access.userId,
      email: profile?.email ?? access.userLabel,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      role: access.role,
      isSuperadmin: Boolean(profile?.is_superadmin),
    },
    clubs: access.clubs,
    wallets: walletRows.map((row: (typeof walletRows)[number]) => ({
      id: row.id,
      balance: Number(row.balance),
      clubName: row.club_name,
      sportName: row.sport_name,
    })),
    attendanceSummary: {
      total: summary.total ?? 0,
      recent: summary.recent ?? 0,
      lastSeen: summary.last_seen,
    },
  });
}
