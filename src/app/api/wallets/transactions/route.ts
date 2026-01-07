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
    amount: number;
    reason: string;
    created_at: string;
    wallet_id: string;
    club_name: string;
    student_name: string | null;
  }>(
    `
      select
        t.id,
        t.amount,
        t.reason,
        t.created_at,
        t.wallet_id,
        c.name as club_name,
        p.full_name as student_name
      from public.wallet_transactions t
      join public.wallets w on w.id = t.wallet_id
      join public.clubs c on c.id = w.club_id
      join public.profiles p on p.id = w.student_id
      ${filterClause}
      order by t.created_at desc
      limit 10
    `,
    params,
  );

  return NextResponse.json({
    transactions: rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      amount: Number(row.amount),
      reason: row.reason,
      createdAt: row.created_at,
      walletId: row.wallet_id,
      clubName: row.club_name,
      studentName: row.student_name,
    })),
  });
}

export async function POST(request: Request) {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const walletId = body?.walletId;
  const amount = Number(body?.amount);
  const reason = body?.reason;
  const note = body?.note?.trim() || null;

  if (!walletId || Number.isNaN(amount) || !reason) {
    return NextResponse.json(
      { error: "Wallet, amount, and reason are required." },
      { status: 400 },
    );
  }

  if (access.role === "admin") {
    const { rows } = await pool.query<{ club_id: string }>(
      `select club_id from public.wallets where id = $1`,
      [walletId],
    );
    const clubId = rows[0]?.club_id;
    if (!clubId) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
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

  const { rows } = await pool.query<{ id: string }>(
    `
      insert into public.wallet_transactions (wallet_id, amount, reason, note, created_by)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [walletId, amount, reason, note, access.userId],
  );

  return NextResponse.json({ transactionId: rows[0]?.id });
}
