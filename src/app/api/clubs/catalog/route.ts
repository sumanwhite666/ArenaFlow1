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
    name: string;
    sport_name: string;
  }>(
    `
      select c.id, c.name, s.name as sport_name
      from public.clubs c
      join public.sports s on s.id = c.sport_id
      order by c.name
    `,
  );

  return NextResponse.json({
    clubs: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      name: row.name,
      sportName: row.sport_name,
    })),
  });
}
