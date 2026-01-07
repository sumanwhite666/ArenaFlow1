import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
};

const ensureNotificationsSchema = async () => {
  await pool.query(`
    create table if not exists public.notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.profiles on delete cascade,
      club_id uuid references public.clubs on delete cascade,
      type text not null,
      title text not null,
      body text,
      dedupe_key text unique,
      created_at timestamptz not null default now(),
      read_at timestamptz
    );

    create index if not exists notifications_user_created_idx
      on public.notifications (user_id, created_at desc);
  `);
};

export async function GET(request: Request) {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureNotificationsSchema();

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "10");
  const unreadOnly = searchParams.get("unread") === "1";
  const typeFilter = searchParams.get("type");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 5), 50)
    : 10;

  const conditions = ["user_id = $1"];
  const params: Array<string | number> = [access.userId];

  if (unreadOnly) {
    conditions.push("read_at is null");
  }

  if (typeFilter) {
    params.push(typeFilter);
    conditions.push(`type = $${params.length}`);
  }

  params.push(limit);

  const { rows } = await pool.query<NotificationRow>(
    `
      select id, type, title, body, created_at, read_at
      from public.notifications
      where ${conditions.join(" and ")}
      order by created_at desc
      limit $${params.length}
    `,
    params,
  );

  const { rows: unreadRows } = await pool.query<{ count: number }>(
    `
      select count(*)::int as count
      from public.notifications
      where user_id = $1 and read_at is null
    `,
    [access.userId],
  );

  return NextResponse.json({
    notifications: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      readAt: row.read_at,
    })),
    unreadCount: unreadRows[0]?.count ?? 0,
  });
}

export async function PATCH(request: Request) {
  const access = await getAccessContext();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureNotificationsSchema();

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids : null;
  const markAll = body?.all === true;

  if (!markAll && (!ids || ids.length === 0)) {
    return NextResponse.json({ error: "No notifications selected." }, { status: 400 });
  }

  const query = markAll
    ? `
        update public.notifications
        set read_at = now()
        where user_id = $1 and read_at is null
      `
    : `
        update public.notifications
        set read_at = now()
        where user_id = $1
          and id = any($2::uuid[])
      `;

  const params = markAll ? [access.userId] : [access.userId, ids];

  const result = await pool.query(query, params);

  return NextResponse.json({ updated: result.rowCount ?? 0 });
}
