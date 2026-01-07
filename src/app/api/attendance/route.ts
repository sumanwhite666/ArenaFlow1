import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";
import { getSessionUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 5), 100)
    : 25;

  if (access.role === "student") {
    const { rows } = await pool.query<{
      id: string;
      status: string;
      scanned_at: string;
      session_title: string;
    }>(
      `
        select
          a.id,
          a.status,
          a.scanned_at,
          s.title as session_title
        from public.attendance a
        join public.sessions s on s.id = a.session_id
        where a.student_id = $1
        order by a.scanned_at desc
        limit $2
      `,
      [access.userId, limit],
    );

    return NextResponse.json({
      attendance: rows.map((row: (typeof rows)[number]) => ({
        id: row.id,
        status: row.status,
        scannedAt: row.scanned_at,
        sessionTitle: row.session_title,
        studentName: access.userLabel,
        studentId: access.userId,
      })),
    });
  }

  const params: string[] = [];
  let filterClause = "";

  if (access.role !== "superadmin") {
    params.push(access.userId);
    filterClause = `
      join public.club_memberships cm
        on cm.club_id = s.club_id
       and cm.user_id = $1
       and cm.role in ('admin', 'coach')
    `;
  }

  const { rows } = await pool.query<{
    id: string;
    status: string;
    scanned_at: string;
    student_id: string;
    student_name: string | null;
    session_title: string;
  }>(
    `
      select
        a.id,
        a.status,
        a.scanned_at,
        a.student_id,
        p.full_name as student_name,
        s.title as session_title
      from public.attendance a
      join public.sessions s on s.id = a.session_id
      join public.profiles p on p.id = a.student_id
      ${filterClause}
      order by a.scanned_at desc
      limit $${params.length + 1}
    `,
    [...params, limit],
  );

  return NextResponse.json({
    attendance: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      status: row.status,
      scannedAt: row.scanned_at,
      sessionTitle: row.session_title,
      studentName: row.student_name,
      studentId: row.student_id,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (!token) {
    return NextResponse.json({ error: "QR token required." }, { status: 400 });
  }

  const { rows: sessionRows } = await pool.query<{ id: string; club_id: string }>(
    `select id, club_id from public.sessions where qr_token = $1`,
    [token],
  );

  const session = sessionRows[0];
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { rows: membershipRows } = await pool.query<{ role: string }>(
    `
      select role
      from public.club_memberships
      where user_id = $1 and club_id = $2
    `,
    [user.id, session.club_id],
  );

  if (!membershipRows[0] || membershipRows[0].role !== "student") {
    return NextResponse.json(
      { error: "Only students can check in." },
      { status: 403 },
    );
  }

  await pool.query(
    `
      insert into public.attendance (session_id, student_id, status)
      values ($1, $2, 'present')
      on conflict (session_id, student_id) do nothing
    `,
    [session.id, user.id],
  );

  return NextResponse.json({ ok: true, sessionId: session.id });
}
