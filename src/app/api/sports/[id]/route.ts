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
  if (!name) {
    return NextResponse.json({ error: "Sport name is required." }, { status: 400 });
  }

  const { rows } = await pool.query<{ id: string; name: string }>(
    `
      update public.sports
      set name = $1
      where id = $2
      returning id, name
    `,
    [name, id],
  );

  return NextResponse.json({ sport: rows[0] });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  if (!access || access.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await pool.query(`delete from public.sports where id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
