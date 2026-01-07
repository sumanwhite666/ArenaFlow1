import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";
import { getSessionUser } from "@/lib/server/auth";

export async function GET() {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params: string[] = [];
  let filterClause = "";

  if (access.role === "admin") {
    params.push(access.userId);
    filterClause = `
      join public.club_memberships cm_admin
        on cm_admin.club_id = r.club_id
       and cm_admin.user_id = $1
       and cm_admin.role = 'admin'
    `;
  }

  const { rows } = await pool.query<{
    id: string;
    status: string;
    note: string | null;
    user_id: string;
    club_id: string;
    created_at: string;
    club_name: string;
    sport_name: string;
    user_name: string | null;
  }>(
    `
      select
        r.id,
        r.status,
        r.note,
        r.user_id,
        r.club_id,
        r.created_at,
        c.name as club_name,
        s.name as sport_name,
        p.full_name as user_name
      from public.club_join_requests r
      join public.clubs c on c.id = r.club_id
      join public.sports s on s.id = c.sport_id
      join public.profiles p on p.id = r.user_id
      ${filterClause}
      order by r.created_at desc
    `,
    params,
  );

  return NextResponse.json({
    requests: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      status: row.status,
      note: row.note,
      userId: row.user_id,
      clubId: row.club_id,
      createdAt: row.created_at,
      clubName: row.club_name,
      sportName: row.sport_name,
      userName: row.user_name,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clubId = body?.clubId;
  const note = body?.note?.trim() || null;

  if (!clubId) {
    return NextResponse.json({ error: "Club is required." }, { status: 400 });
  }

  const { rows } = await pool.query<{ id: string }>(
    `
      insert into public.club_join_requests (club_id, user_id, note)
      values ($1, $2, $3)
      returning id
    `,
    [clubId, user.id, note],
  );

  return NextResponse.json({ requestId: rows[0]?.id });
}
