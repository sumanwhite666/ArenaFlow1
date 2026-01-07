import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

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
      join public.club_memberships cm
        on cm.club_id = w.club_id
       and cm.user_id = $1
       and cm.role = 'admin'
    `;
  }

  const { rows } = await pool.query<{
    id: string;
    balance: number;
    club_id: string;
    club_name: string;
    student_id: string;
    student_name: string | null;
  }>(
    `
      select
        w.id,
        w.balance,
        w.club_id,
        c.name as club_name,
        w.student_id,
        p.full_name as student_name
      from public.wallets w
      join public.clubs c on c.id = w.club_id
      join public.profiles p on p.id = w.student_id
      ${filterClause}
      order by w.created_at desc
    `,
    params,
  );

  return NextResponse.json({
    wallets: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      balance: Number(row.balance),
      clubId: row.club_id,
      clubName: row.club_name,
      studentId: row.student_id,
      studentName: row.student_name,
    })),
  });
}
