import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

const allowedRolesFor = (role: string) =>
  role === "superadmin" ? ["admin", "coach", "student"] : ["coach", "student"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (!role) {
    return NextResponse.json({ error: "Role is required." }, { status: 400 });
  }

  if (!allowedRolesFor(access.role).includes(role)) {
    return NextResponse.json({ error: "Role not allowed." }, { status: 403 });
  }

  if (access.role === "admin") {
    const { rows } = await pool.query<{ club_id: string }>(
      `select club_id from public.club_memberships where id = $1`,
      [id],
    );
    const clubId = rows[0]?.club_id;
    if (!clubId) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }

    const { rows: adminRows } = await pool.query<{ role: string }>(
      `
        select role
        from public.club_memberships
        where user_id = $1 and club_id = $2
      `,
      [access.userId, clubId],
    );
    if (!adminRows[0] || adminRows[0].role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  await pool.query(
    `update public.club_memberships set role = $1 where id = $2`,
    [role, id],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (access.role === "admin") {
    const { rows } = await pool.query<{ club_id: string }>(
      `select club_id from public.club_memberships where id = $1`,
      [id],
    );
    const clubId = rows[0]?.club_id;
    if (!clubId) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }

    const { rows: adminRows } = await pool.query<{ role: string }>(
      `
        select role
        from public.club_memberships
        where user_id = $1 and club_id = $2
      `,
      [access.userId, clubId],
    );
    if (!adminRows[0] || adminRows[0].role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  await pool.query(`delete from public.club_memberships where id = $1`, [id]);

  return NextResponse.json({ ok: true });
}
