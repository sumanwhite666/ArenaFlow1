import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type Params = { params: Promise<{ id: string }> };

const ensureSessionAccess = async (access: Awaited<ReturnType<typeof getAccessContext>>, sessionId: string, allowedRoles: string[]) => {
  if (!access) return false;
  if (access.role === "superadmin") return true;

  const { rows } = await pool.query<{ role: string }>(
    `
      select cm.role
      from public.sessions s
      join public.club_memberships cm on cm.club_id = s.club_id
      where s.id = $1 and cm.user_id = $2
    `,
    [sessionId, access.userId],
  );

  return rows[0] ? allowedRoles.includes(rows[0].role) : false;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  const allowed = await ensureSessionAccess(access, id, [
    "admin",
    "coach",
    "student",
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { rows } = await pool.query<{
    id: string;
    title: string;
    starts_at: string;
    location: string | null;
    capacity: number | null;
    qr_token: string;
    club_name: string;
    sport_name: string;
  }>(
    `
      select
        s.id,
        s.title,
        s.starts_at,
        s.location,
        s.capacity,
        s.qr_token,
        c.name as club_name,
        sp.name as sport_name
      from public.sessions s
      join public.clubs c on c.id = s.club_id
      join public.sports sp on sp.id = s.sport_id
      where s.id = $1
    `,
    [id],
  );

  const session = rows[0];
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      startsAt: session.starts_at,
      location: session.location,
      capacity: session.capacity,
      qrToken: session.qr_token,
      clubName: session.club_name,
      sportName: session.sport_name,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  const allowed = await ensureSessionAccess(access, id, ["admin", "coach"]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = body?.title?.trim();
  const startsAt = body?.startsAt;
  const location = body?.location?.trim() || null;
  const capacity = body?.capacity ?? null;

  if (!title || !startsAt) {
    return NextResponse.json(
      { error: "Title and start time are required." },
      { status: 400 },
    );
  }

  await pool.query(
    `
      update public.sessions
      set title = $1, starts_at = $2, location = $3, capacity = $4
      where id = $5
    `,
    [title, startsAt, location, capacity, id],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  const allowed = await ensureSessionAccess(access, id, ["admin", "coach"]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await pool.query(`delete from public.sessions where id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
