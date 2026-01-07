import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const params: Array<string | Date> = [since];
  let membershipFilter = "";
  let sessionFilter = "";
  let walletFilter = "";
  let attendanceFilter = "";
  let walletMoveFilter = "";

  if (access.role !== "superadmin") {
    params.push(access.userId);
    const idx = params.length;
    membershipFilter = `
      join public.club_memberships cm_student
        on cm_student.user_id = cm.user_id
       and cm_student.club_id = cm.club_id
       and cm_student.role = 'student'
      join public.club_memberships cm_access
        on cm_access.club_id = cm.club_id
       and cm_access.user_id = $${idx}
    `;
    sessionFilter = `
      join public.club_memberships cm_access
        on cm_access.club_id = s.club_id
       and cm_access.user_id = $${idx}
    `;
    walletFilter = `
      join public.club_memberships cm_access
        on cm_access.club_id = w.club_id
       and cm_access.user_id = $${idx}
    `;
    attendanceFilter = `
      join public.sessions s_att on s_att.id = a.session_id
      join public.club_memberships cm_access
        on cm_access.club_id = s_att.club_id
       and cm_access.user_id = $${idx}
    `;
    walletMoveFilter = `
      join public.club_memberships cm_access
        on cm_access.club_id = w.club_id
       and cm_access.user_id = $${idx}
    `;
  }

  const [studentsResult, sessionsResult, walletsResult] = await Promise.all([
    pool.query<{ count: string }>(
      `
        select count(distinct cm.user_id) as count
        from public.club_memberships cm
        ${membershipFilter}
        where cm.role = 'student'
      `,
      access.role === "superadmin" ? [] : [access.userId],
    ),
    pool.query<{ count: string }>(
      `
        select count(*) as count
        from public.sessions s
        ${sessionFilter}
        where s.starts_at >= $1
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
  ]);

  const { rows: attendanceRows } = await pool.query<{
    student_name: string | null;
    session_title: string;
    scanned_at: string;
    status: string;
  }>(
    `
      select
        p.full_name as student_name,
        s.title as session_title,
        a.scanned_at,
        a.status
      from public.attendance a
      join public.sessions s on s.id = a.session_id
      join public.profiles p on p.id = a.student_id
      ${attendanceFilter}
      order by a.scanned_at desc
      limit 4
    `,
    access.role === "superadmin" ? [] : [access.userId],
  );

  const { rows: walletRows } = await pool.query<{
    amount: number;
    reason: string;
    club_name: string;
  }>(
    `
      select
        t.amount,
        t.reason,
        c.name as club_name
      from public.wallet_transactions t
      join public.wallets w on w.id = t.wallet_id
      join public.clubs c on c.id = w.club_id
      ${walletMoveFilter}
      order by t.created_at desc
      limit 4
    `,
    access.role === "superadmin" ? [] : [access.userId],
  );

  return NextResponse.json({
    stats: {
      students: Number(studentsResult.rows[0]?.count ?? 0),
      sessions: Number(sessionsResult.rows[0]?.count ?? 0),
      walletsTotal: Number(walletsResult.rows[0]?.total ?? 0),
    },
    attendance: attendanceRows.map(
      (row: (typeof attendanceRows)[number]) => ({
      student: row.student_name,
      session: row.session_title,
      time: row.scanned_at,
      status: row.status,
    })),
    walletMoves: walletRows.map((row: (typeof walletRows)[number]) => ({
      amount: Number(row.amount),
      reason: row.reason,
      club: row.club_name,
    })),
  });
}
