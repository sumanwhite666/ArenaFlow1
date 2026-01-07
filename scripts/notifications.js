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

const ensureNotificationsSchema = async (client) => {
  await client.query(`
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

const runLowBalanceAlerts = async (client) => {
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
    return { ran: false, reason: "Monthly fee not configured." };
  }

  const { rowCount } = await client.query(
    `
      insert into public.notifications (user_id, club_id, type, title, body, dedupe_key)
      select
        cm.user_id,
        w.club_id,
        'low_balance',
        'Low balance alert',
        concat(
          coalesce(p.full_name, 'Student'),
          ' balance RM ',
          w.balance::text,
          ' is below monthly fee RM ',
          $1::text,
          ' for ',
          c.name
        ),
        concat('low_balance:', w.id, ':', cm.user_id, ':', current_date::text)
      from public.wallets w
      join public.profiles p on p.id = w.student_id
      join public.clubs c on c.id = w.club_id
      join public.club_memberships cm
        on cm.club_id = w.club_id
       and cm.role = 'admin'
      where w.balance < $1
      on conflict (dedupe_key) do nothing
    `,
    [monthlyFee],
  );

  return { ran: true, created: rowCount ?? 0 };
};

const runSessionReminders = async (client) => {
  const windowHours = Number(process.env.NOTIFY_WINDOW_HOURS ?? "24");
  const hours = Number.isFinite(windowHours)
    ? Math.min(Math.max(windowHours, 1), 168)
    : 24;

  const { rowCount } = await client.query(
    `
      insert into public.notifications (user_id, club_id, type, title, body, dedupe_key)
      select
        cm.user_id,
        s.club_id,
        'session_reminder',
        'Session reminder',
        concat(
          s.title,
          ' starts at ',
          to_char(s.starts_at, 'Mon DD, HH24:MI')
        ),
        concat('session_reminder:', s.id, ':', cm.user_id)
      from public.sessions s
      join public.club_memberships cm
        on cm.club_id = s.club_id
       and cm.role in ('coach', 'student')
      where s.starts_at >= now()
        and s.starts_at <= now() + ($1 || ' hours')::interval
      on conflict (dedupe_key) do nothing
    `,
    [hours],
  );

  return { ran: true, created: rowCount ?? 0, windowHours: hours };
};

const runNotificationsCycle = async () => {
  await waitForDatabase();
  const client = await pool.connect();
  try {
    await ensureNotificationsSchema(client);
    const lowBalance = await runLowBalanceAlerts(client);
    const reminders = await runSessionReminders(client);
    return { lowBalance, reminders };
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  runNotificationsCycle,
  waitForDatabase,
};
