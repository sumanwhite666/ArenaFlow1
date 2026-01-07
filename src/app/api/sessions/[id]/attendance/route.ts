import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin" && access.role !== "coach")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (access.role !== "superadmin") {
    const { rows } = await pool.query<{ role: string }>(
      `
        select cm.role
        from public.sessions s
        join public.club_memberships cm on cm.club_id = s.club_id
        where s.id = $1 and cm.user_id = $2
      `,
      [id, access.userId],
    );
    if (!rows[0] || !["admin", "coach"].includes(rows[0].role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const { rows } = await pool.query<{
    id: string;
    status: string;
    scanned_at: string;
    student_id: string;
    student_name: string | null;
  }>(
    `
      select
        a.id,
        a.status,
        a.scanned_at,
        a.student_id,
        p.full_name as student_name
      from public.attendance a
      join public.profiles p on p.id = a.student_id
      where a.session_id = $1
      order by a.scanned_at desc
    `,
      [id],
    );

  return NextResponse.json({
    attendance: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      status: row.status,
      scannedAt: row.scanned_at,
      studentId: row.student_id,
      studentName: row.student_name,
    })),
  });
}
