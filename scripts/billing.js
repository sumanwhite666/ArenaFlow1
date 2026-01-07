/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
require("dotenv").config();

const connectionString =
  process.env.DATABASE_URL_DOCKER || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DATABASE_URL_DOCKER must be set.");
}

const pool = new Pool({ connectionString });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForDatabase = async (attempts = 10, delayMs = 2000) => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query("select 1");
      return true;
    } catch (err) {
      if (i === attempts - 1) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
  return false;
};

const ensureBillingSchema = async (client) => {
  await client.query(`
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

const runMonthlyBilling = async (client) => {
  await client.query("begin");
  try {
    const { rows: feeRows } = await client.query(
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

    const { rows: runRows } = await client.query(
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

    const { rows: totalRows } = await client.query(
      `select count(*)::int as total from public.wallets`,
    );
    const { rows: eligibleRows } = await client.query(
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
    return { ran: true, charged, skipped };
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
};

const runRegistrationFees = async (client) => {
  const { rows: feeRows } = await client.query(
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

  const { rows: totalRows } = await client.query(
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

  const { rows: eligibleRows } = await client.query(
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

  const insertResult = await client.query(
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
  };
};

const runBillingCycle = async () => {
  await waitForDatabase();
  const client = await pool.connect();
  try {
    await ensureBillingSchema(client);
    const monthly = await runMonthlyBilling(client);
    const registration = await runRegistrationFees(client);
    return { monthly, registration };
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  runBillingCycle,
  waitForDatabase,
};
