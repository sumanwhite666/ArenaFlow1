import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const params: Array<string | Date> = [since];
  let sessionFilter = "";
  let attendanceFilter = "";
  let walletFilter = "";
  let clubsFilter = "";

  if (access.role !== "superadmin") {
    params.push(access.userId);
    const idx = params.length;
    sessionFilter = `
      join public.club_memberships cm_sessions
        on cm_sessions.club_id = s.club_id
       and cm_sessions.user_id = $${idx}
    `;
    attendanceFilter = `
      join public.sessions s_att on s_att.id = a.session_id
      join public.club_memberships cm_att
        on cm_att.club_id = s_att.club_id
       and cm_att.user_id = $${idx}
    `;
    walletFilter = `
      join public.club_memberships cm_wallet
        on cm_wallet.club_id = w.club_id
       and cm_wallet.user_id = $${idx}
    `;
    clubsFilter = `
      join public.club_memberships cm_club
        on cm_club.club_id = c.id
       and cm_club.user_id = $${idx}
    `;
  }

  const [sessionsResult, attendanceResult, walletsResult, clubsResult] =
    await Promise.all([
      pool.query<{ count: string }>(
        `
          select count(*) as count
          from public.sessions s
          ${sessionFilter}
          where s.starts_at >= $1
        `,
        params,
      ),
      pool.query<{ count: string }>(
        `
          select count(*) as count
          from public.attendance a
          ${attendanceFilter}
          where a.scanned_at >= $1
        `,
        params,
      ),
      pool.query<{ total: string | null }>(
        `
          select sum(w.balance) as total
          from public.wallets w
          ${walletFilter}
        `,
        access.role === "superadmin" ? [] : [access.userId],
      ),
      pool.query<{ count: string }>(
        `
          select count(*) as count
          from public.clubs c
          ${clubsFilter}
        `,
        access.role === "superadmin" ? [] : [access.userId],
      ),
    ]);

  return NextResponse.json({
    sessions: Number(sessionsResult.rows[0]?.count ?? 0),
    attendance: Number(attendanceResult.rows[0]?.count ?? 0),
    walletsTotal: Number(walletsResult.rows[0]?.total ?? 0),
    clubs: Number(clubsResult.rows[0]?.count ?? 0),
  });
}
