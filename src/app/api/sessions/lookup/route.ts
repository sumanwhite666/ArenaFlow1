import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 });
  }

  const { rows } = await pool.query<{
    id: string;
    title: string;
    club_name: string;
    sport_name: string;
  }>(
    `
      select
        s.id,
        s.title,
        c.name as club_name,
        sp.name as sport_name
      from public.sessions s
      join public.clubs c on c.id = s.club_id
      join public.sports sp on sp.id = s.sport_id
      where s.qr_token = $1
    `,
    [token],
  );

  const session = rows[0];
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      clubName: session.club_name,
      sportName: session.sport_name,
    },
  });
}
