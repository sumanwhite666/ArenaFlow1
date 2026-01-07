import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin" && access.role !== "coach")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
    title: string;
    starts_at: string;
    location: string | null;
    capacity: number | null;
    qr_token: string;
    club_id: string;
    club_name: string;
    sport_id: string;
    sport_name: string;
  }>(
    `
      select
        s.id,
        s.title,
        s.starts_at,
        s.location,
        s.capacity,
        s.qr_token,
        c.id as club_id,
        c.name as club_name,
        sp.id as sport_id,
        sp.name as sport_name
      from public.sessions s
      join public.clubs c on c.id = s.club_id
      join public.sports sp on sp.id = s.sport_id
      ${filterClause}
      order by s.starts_at desc
    `,
    params,
  );

  return NextResponse.json({
    sessions: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      location: row.location,
      capacity: row.capacity,
      qrToken: row.qr_token,
      clubId: row.club_id,
      clubName: row.club_name,
      sportId: row.sport_id,
      sportName: row.sport_name,
    })),
  });
}

export async function POST(request: Request) {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin" && access.role !== "coach")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = body?.title?.trim();
  const startsAt = body?.startsAt;
  const clubId = body?.clubId;
  const location = body?.location?.trim() || null;
  const capacity = body?.capacity ?? null;

  if (!title || !startsAt || !clubId) {
    return NextResponse.json(
      { error: "Title, start time, and club are required." },
      { status: 400 },
    );
  }

  const { rows: clubRows } = await pool.query<{ sport_id: string }>(
    `select sport_id from public.clubs where id = $1`,
    [clubId],
  );
  const sportId = clubRows[0]?.sport_id;
  if (!sportId) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 });
  }

  if (access.role !== "superadmin") {
    const { rows: membershipRows } = await pool.query<{ role: string }>(
      `
        select role
        from public.club_memberships
        where user_id = $1 and club_id = $2
      `,
      [access.userId, clubId],
    );
    if (!membershipRows[0] || !["admin", "coach"].includes(membershipRows[0].role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const { rows } = await pool.query<{ id: string }>(
    `
      insert into public.sessions (club_id, sport_id, coach_id, title, starts_at, location, capacity)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [clubId, sportId, access.userId, title, startsAt, location, capacity],
  );

  return NextResponse.json({ sessionId: rows[0]?.id });
}
