import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type TrendRow = {
  name: string;
  sessions: number;
  attendance: number;
};

export async function GET(request: Request) {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(daysParam, 7), 365)
    : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const params: Array<string | Date> = [since];
  let membershipJoin = "";

  if (access.role !== "superadmin") {
    params.push(access.userId);
    const idx = params.length;
    membershipJoin = `
      join public.club_memberships cm
        on cm.club_id = s.club_id
       and cm.user_id = $${idx}
       and cm.role = 'admin'
    `;
  }

  const { rows: sportRows } = await pool.query<{
    sport_name: string;
    sessions: number;
    attendance: number;
  }>(
    `
      select
        sp.name as sport_name,
        count(distinct s.id)::int as sessions,
        count(a.id)::int as attendance
      from public.sessions s
      join public.sports sp on sp.id = s.sport_id
      ${membershipJoin}
      left join public.attendance a on a.session_id = s.id
      where s.starts_at >= $1
      group by sp.name
      order by sessions desc
    `,
    params,
  );

  const { rows: coachRows } = await pool.query<{
    coach_name: string | null;
    sessions: number;
    attendance: number;
  }>(
    `
      select
        p.full_name as coach_name,
        count(distinct s.id)::int as sessions,
        count(a.id)::int as attendance
      from public.sessions s
      left join public.profiles p on p.id = s.coach_id
      ${membershipJoin}
      left join public.attendance a on a.session_id = s.id
      where s.starts_at >= $1
      group by p.full_name
      order by sessions desc
    `,
    params,
  );

  const bySport: TrendRow[] = sportRows.map(
    (row: (typeof sportRows)[number]) => ({
      name: row.sport_name,
      sessions: Number(row.sessions ?? 0),
      attendance: Number(row.attendance ?? 0),
    }),
  );

  const byCoach: TrendRow[] = coachRows.map(
    (row: (typeof coachRows)[number]) => ({
      name: row.coach_name || "Unassigned coach",
      sessions: Number(row.sessions ?? 0),
      attendance: Number(row.attendance ?? 0),
    }),
  );

  return NextResponse.json({ days, bySport, byCoach });
}
