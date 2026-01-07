import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

type MonthlyResult = {
  ran: boolean;
  reason?: string;
  charged?: number;
  skipped?: number;
  monthlyFee?: number;
  runMonth?: string;
};

type RegistrationResult = {
  ran: boolean;
  reason?: string;
  charged?: number;
  skipped?: number;
  registrationFee?: number;
};

const ensureBillingSchema = async () => {
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
};

const runMonthlyBilling = async (): Promise<MonthlyResult> => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows: feeRows } = await client.query<{ monthly_fee: number }>(
      `
        select monthly_fee
        from public.app_settings
        where singleton = true
        limit 1
      `,
    );
    const monthlyFee = Number(feeRows[0]?.monthly_fee ?? 0);
    if (!monthlyFee || monthlyFee <= 0) {
      await client.query("rollback");
      return { ran: false, reason: "Monthly fee not configured." };
    }

    const { rows: runRows } = await client.query<{ id: string }>(
      `
        insert into public.billing_runs (run_month, monthly_fee)
        values (date_trunc('month', now())::date, $1)
        on conflict (run_month) do nothing
        returning id
      `,
      [monthlyFee],
    );

    if (runRows.length === 0) {
      await client.query("rollback");
      return { ran: false, reason: "Monthly fee already charged." };
    }

    const { rows: totalRows } = await client.query<{ total: number }>(
      `select count(*)::int as total from public.wallets`,
    );
    const { rows: eligibleRows } = await client.query<{ eligible: number }>(
      `
        select count(*)::int as eligible
        from public.wallets
        where balance >= $1
      `,
      [monthlyFee],
    );

    const billingNote = `Monthly fee ${new Date()
      .toISOString()
      .slice(0, 7)}`;

    const insertResult = await client.query(
      `
        insert into public.wallet_transactions (wallet_id, amount, reason, note)
        select w.id, -$1, 'monthly', $2
        from public.wallets w
        where w.balance >= $1
      `,
      [monthlyFee, billingNote],
    );

    const charged = insertResult.rowCount ?? 0;
    const total = totalRows[0]?.total ?? 0;
    const eligible = eligibleRows[0]?.eligible ?? 0;
    const skipped = Math.max(0, total - eligible);

    await client.query(
      `
        update public.billing_runs
        set charged_count = $1,
            skipped_count = $2
        where run_month = date_trunc('month', now())::date
      `,
      [charged, skipped],
    );

    await client.query("commit");
    return {
      ran: true,
      charged,
      skipped,
      monthlyFee,
      runMonth: new Date().toISOString().slice(0, 7),
    };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
};

const runRegistrationFees = async (): Promise<RegistrationResult> => {
  const { rows: feeRows } = await pool.query<{ registration_fee: number }>(
    `
      select registration_fee
      from public.app_settings
      where singleton = true
      limit 1
    `,
  );
  const registrationFee = Number(feeRows[0]?.registration_fee ?? 0);
  if (!registrationFee || registrationFee <= 0) {
    return { ran: false, reason: "Registration fee not configured." };
  }

  const { rows: totalRows } = await pool.query<{ total: number }>(
    `
      select count(*)::int as total
      from public.wallets w
      where not exists (
        select 1
        from public.wallet_transactions t
        where t.wallet_id = w.id
          and t.reason = 'registration'
      )
    `,
  );

  const { rows: eligibleRows } = await pool.query<{ eligible: number }>(
    `
      select count(*)::int as eligible
      from public.wallets w
      where w.balance >= $1
        and not exists (
          select 1
          from public.wallet_transactions t
          where t.wallet_id = w.id
            and t.reason = 'registration'
        )
    `,
    [registrationFee],
  );

  const insertResult = await pool.query(
    `
      insert into public.wallet_transactions (wallet_id, amount, reason, note)
      select w.id, -$1, 'registration', 'Registration fee'
      from public.wallets w
      where w.balance >= $1
        and not exists (
          select 1
          from public.wallet_transactions t
          where t.wallet_id = w.id
            and t.reason = 'registration'
        )
    `,
    [registrationFee],
  );

  const charged = insertResult.rowCount ?? 0;
  const total = totalRows[0]?.total ?? 0;
  const eligible = eligibleRows[0]?.eligible ?? 0;
  const skipped = Math.max(0, total - eligible);

  return {
    ran: true,
    charged,
    skipped,
    registrationFee,
  };
};

export async function POST() {
  const access = await getAccessContext();
  if (!access || access.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await ensureBillingSchema();

  const monthly = await runMonthlyBilling();
  const registration = await runRegistrationFees();

  return NextResponse.json({ monthly, registration });
}
