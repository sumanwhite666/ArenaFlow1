import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

const allowedRolesFor = (role: string) =>
  role === "superadmin" ? ["admin", "coach", "student"] : ["coach", "student"];

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
        on cm_admin.club_id = cm.club_id
       and cm_admin.user_id = $1
       and cm_admin.role = 'admin'
    `;
  }

  const { rows } = await pool.query<{
    id: string;
    role: "admin" | "coach" | "student";
    user_id: string;
    club_id: string;
    club_name: string;
    sport_name: string;
    user_name: string | null;
  }>(
    `
      select
        cm.id,
        cm.role,
        cm.user_id,
        cm.club_id,
        c.name as club_name,
        s.name as sport_name,
        p.full_name as user_name
      from public.club_memberships cm
      join public.clubs c on c.id = cm.club_id
      join public.sports s on s.id = c.sport_id
      join public.profiles p on p.id = cm.user_id
      ${filterClause}
      order by cm.created_at desc
    `,
    params,
  );

  return NextResponse.json({
    memberships: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      role: row.role,
      userId: row.user_id,
      clubId: row.club_id,
      clubName: row.club_name,
      sportName: row.sport_name,
      userName: row.user_name,
    })),
  });
}

export async function POST(request: Request) {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const clubId = body?.clubId;
  const userId = body?.userId;
  const role = body?.role;

  if (!clubId || !userId || !role) {
    return NextResponse.json(
      { error: "Club, user, and role are required." },
      { status: 400 },
    );
  }

  if (!allowedRolesFor(access.role).includes(role)) {
    return NextResponse.json({ error: "Role not allowed." }, { status: 403 });
  }

  if (access.role === "admin") {
    const { rows } = await pool.query<{ role: string }>(
      `
        select role
        from public.club_memberships
        where user_id = $1 and club_id = $2
      `,
      [access.userId, clubId],
    );
    if (!rows[0] || rows[0].role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const { rows } = await pool.query<{ id: string }>(
    `
      insert into public.club_memberships (club_id, user_id, role)
      values ($1, $2, $3)
      returning id
    `,
    [clubId, userId, role],
  );

  return NextResponse.json({ membershipId: rows[0]?.id });
}
