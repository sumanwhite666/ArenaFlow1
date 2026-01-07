import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function POST() {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { rows: feeRows } = await pool.query<{ monthly_fee: number }>(
    `
      select monthly_fee
      from public.app_settings
      order by created_at asc
      limit 1
    `,
  );
  const monthlyFee = Number(feeRows[0]?.monthly_fee ?? 0);
  if (!monthlyFee || monthlyFee <= 0) {
    return NextResponse.json(
      { error: "Monthly fee not configured." },
      { status: 400 },
    );
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

  const { rows } = await pool.query<{ id: string }>(
    `
      select w.id
      from public.wallets w
      ${filterClause}
    `,
    params,
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "No wallets available." }, { status: 400 });
  }

  const values: string[] = [];
  const inserts: Array<string | number> = [];

  rows.forEach((wallet: (typeof rows)[number], index: number) => {
    const offset = index * 5;
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    inserts.push(wallet.id, -monthlyFee, "monthly", "Monthly fee", access.userId);
  });

  await pool.query(
    `
      insert into public.wallet_transactions (wallet_id, amount, reason, note, created_by)
      values ${values.join(", ")}
    `,
    inserts,
  );

  return NextResponse.json({ ok: true, billed: rows.length });
}
