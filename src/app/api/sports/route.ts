import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();
  if (!access || access.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { rows } = await pool.query<{
    id: string;
    name: string;
    club_count: string;
  }>(
    `
      select s.id, s.name, count(c.id) as club_count
      from public.sports s
      left join public.clubs c on c.sport_id = s.id
      group by s.id
      order by s.name
    `,
  );

  return NextResponse.json({
    sports: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      name: row.name,
      clubCount: Number(row.club_count ?? 0),
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
  if (!name) {
    return NextResponse.json({ error: "Sport name is required." }, { status: 400 });
  }

  const { rows } = await pool.query<{ id: string; name: string }>(
    `
      insert into public.sports (name, created_by)
      values ($1, $2)
      returning id, name
    `,
    [name, access.userId],
  );

  return NextResponse.json({ sport: rows[0] });
}
