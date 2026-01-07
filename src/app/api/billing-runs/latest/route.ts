import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type BillingRunRow = {
  run_month: string;
  executed_at: string;
  monthly_fee: number;
  charged_count: number;
  skipped_count: number;
};

export async function GET() {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await pool.query(`
    create table if not exists public.billing_runs (
      id uuid primary key default gen_random_uuid(),
      run_month date not null unique,
      executed_at timestamptz not null default now(),
      monthly_fee numeric(12, 2) not null,
      charged_count integer not null default 0,
      skipped_count integer not null default 0
    );
  `);

  const { rows } = await pool.query<BillingRunRow>(
    `
      select run_month, executed_at, monthly_fee, charged_count, skipped_count
      from public.billing_runs
      order by executed_at desc
      limit 1
    `,
  );

  const { rows: currentRows } = await pool.query<{ exists: boolean }>(
    `
      select exists (
        select 1
        from public.billing_runs
        where run_month = date_trunc('month', now())::date
      ) as exists
    `,
  );

  const lastRun = rows[0]
    ? {
        runMonth: rows[0].run_month,
        executedAt: rows[0].executed_at,
        monthlyFee: Number(rows[0].monthly_fee),
        chargedCount: Number(rows[0].charged_count),
        skippedCount: Number(rows[0].skipped_count),
      }
    : null;

  return NextResponse.json({
    lastRun,
    currentMonthBilled: Boolean(currentRows[0]?.exists),
  });
}
