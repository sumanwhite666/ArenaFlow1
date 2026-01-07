import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/server/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { rows } = await pool.query<{
    id: string;
    status: string;
    note: string | null;
    created_at: string;
    club_name: string;
    sport_name: string;
  }>(
    `
      select
        r.id,
        r.status,
        r.note,
        r.created_at,
        c.name as club_name,
        s.name as sport_name
      from public.club_join_requests r
      join public.clubs c on c.id = r.club_id
      join public.sports s on s.id = c.sport_id
      where r.user_id = $1
      order by r.created_at desc
    `,
    [user.id],
  );

  return NextResponse.json({
    requests: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      status: row.status,
      note: row.note,
      createdAt: row.created_at,
      clubName: row.club_name,
      sportName: row.sport_name,
    })),
  });
}
