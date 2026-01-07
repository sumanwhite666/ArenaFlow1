import { getAccessContext } from "@/lib/server/access";
import { pool } from "@/lib/db";

const csvEscape = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return new Response("Forbidden.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(daysParam, 7), 365)
    : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const params: Array<string | Date> = [since];
  let membershipJoin = "";

  if (access.role !== "superadmin") {
    params.push(access.userId);
    const idx = params.length;
    membershipJoin = `
      join public.club_memberships cm
        on cm.club_id = s.club_id
       and cm.user_id = $${idx}
       and cm.role = 'admin'
    `;
  }

  const { rows } = await pool.query<{
    id: string;
    title: string;
    starts_at: string;
    club_name: string;
    sport_name: string;
    coach_name: string | null;
    attendance_count: number;
  }>(
    `
      select
        s.id,
        s.title,
        s.starts_at,
        c.name as club_name,
        sp.name as sport_name,
        p.full_name as coach_name,
        count(a.id)::int as attendance_count
      from public.sessions s
      join public.clubs c on c.id = s.club_id
      join public.sports sp on sp.id = s.sport_id
      left join public.profiles p on p.id = s.coach_id
      ${membershipJoin}
      left join public.attendance a on a.session_id = s.id
      where s.starts_at >= $1
      group by s.id, c.name, sp.name, p.full_name
      order by s.starts_at desc
    `,
    params,
  );

  const header = [
    "Session ID",
    "Title",
    "Sport",
    "Club",
    "Coach",
    "Starts At",
    "Attendance Count",
  ];

  const lines = rows.map((row: (typeof rows)[number]) =>
    [
      row.id,
      row.title,
      row.sport_name,
      row.club_name,
      row.coach_name || "Unassigned",
      row.starts_at,
      row.attendance_count ?? 0,
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header.map(csvEscape).join(","), ...lines].join("\n");
  const filename = `reports-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
