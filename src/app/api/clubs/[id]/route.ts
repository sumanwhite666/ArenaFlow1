import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
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
      update public.clubs
      set name = $1, sport_id = $2
      where id = $3
      returning id, name, sport_id
    `,
    [name, sportId, id],
  );

  return NextResponse.json({ club: rows[0] });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  if (!access || access.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await pool.query(`delete from public.clubs where id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
