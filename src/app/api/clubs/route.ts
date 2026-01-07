import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();
  if (
    !access ||
    (access.role !== "superadmin" &&
      access.role !== "admin" &&
      access.role !== "coach")
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (access.role === "superadmin") {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      sport_id: string;
      sport_name: string;
    }>(
      `
        select c.id, c.name, c.sport_id, s.name as sport_name
        from public.clubs c
        join public.sports s on s.id = c.sport_id
        order by c.name
      `,
    );

    return NextResponse.json({
      clubs: rows.map((row: (typeof rows)[number]) => ({
        id: row.id,
        name: row.name,
        sportId: row.sport_id,
        sportName: row.sport_name,
      })),
    });
  }

  const { rows } = await pool.query<{
    id: string;
    name: string;
    sport_id: string;
    sport_name: string;
  }>(
    `
      select c.id, c.name, c.sport_id, s.name as sport_name
      from public.clubs c
      join public.sports s on s.id = c.sport_id
      join public.club_memberships cm
        on cm.club_id = c.id
       and cm.user_id = $1
       and cm.role in ('admin', 'coach')
      order by c.name
    `,
    [access.userId],
  );

  return NextResponse.json({
    clubs: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      name: row.name,
      sportId: row.sport_id,
      sportName: row.sport_name,
    })),
  });
}

export async function POST(request: Request) {
  const access = await getAccessContext();
  if (!access || access.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const sportId = body?.sportId;
  if (!name || !sportId) {
    return NextResponse.json(
      { error: "Club name and sport are required." },
      { status: 400 },
    );
  }

  const { rows } = await pool.query<{ id: string; name: string; sport_id: string }>(
    `
      insert into public.clubs (name, sport_id, created_by)
      values ($1, $2, $3)
      returning id, name, sport_id
    `,
    [name, sportId, access.userId],
  );

  return NextResponse.json({ club: rows[0] });
}
