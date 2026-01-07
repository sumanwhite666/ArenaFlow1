# ArenaFlow

ArenaFlow is a sports club management SaaS for multi-sport, multi-club operations. It brings attendance, credit wallets, and role-based control into one modern interface.

## Quick start (Docker)

1. Copy `.env.example` to `.env`.
2. Start the full stack:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## Local development (Next.js + Docker Postgres)

1. Copy `.env.example` to `.env`.
2. Start the database:

```bash
docker compose up -d db
```

3. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

- `DATABASE_URL` is for local dev (host machine, uses `localhost`).
- `DATABASE_URL_DOCKER` is for the Docker web container (uses `db`).
- `NEXT_PUBLIC_SITE_URL` sets the QR scan base URL.

Example `.env`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
POSTGRES_USER=sportcamp
POSTGRES_PASSWORD=sportcamp
POSTGRES_DB=sportcamp
DATABASE_URL=postgresql://sportcamp:sportcamp@localhost:5432/sportcamp
DATABASE_URL_DOCKER=postgresql://sportcamp:sportcamp@db:5432/sportcamp
```

## Superadmin setup

Option A: Use the seeded test superadmin (created in Postgres).

- Email: `superadmin@arenaflow.local`
- Password: `Sportcamp123!`

Option B: Promote any user:

```sql
update public.profiles
set is_superadmin = true
where email = 'you@example.com';
```

## Billing automation (monthly + registration)

The scheduler runs daily and applies:

- Monthly fees once per month (tracked in `billing_runs`).
- Registration fees once per wallet (if no prior `registration` transaction).
  Low-balance wallets are skipped to avoid negative balances.

Run a one-off billing pass:

```bash
npm run billing:run
```

From Docker:

```bash
docker compose exec -T scheduler npm run billing:run
```

Schedule configuration (in `.env`):

- `BILLING_CRON` (default `0 2 * * *`)
- `BILLING_TZ` (default `UTC`)

## Notifications (low balance + session reminders)

The scheduler runs hourly by default and creates in-app notifications:

- Low balance alerts for admins when wallets drop below monthly fee.
- Session reminders for coaches and students 24h before start time.

Run a one-off notification pass:

```bash
npm run notifications:run
```

From Docker:

```bash
docker compose exec -T scheduler npm run notifications:run
```

Schedule configuration (in `.env`):

- `NOTIFY_CRON` (default `0 * * * *`)
- `NOTIFY_TZ` (default `UTC`)
- `NOTIFY_WINDOW_HOURS` (default `24`)

## App map

- Dashboard: `/dashboard`
- Student profile: `/dashboard/profile`
- Auth: `/login`, `/signup`
- Join requests: `/request-access`
- QR attendance: `/scan?token=...`
- Admin tools: `/dashboard/*` (sports, clubs, members, sessions, wallets, attendance, settings)
- Reports export: `/api/reports/export?days=30`

## Usage guide

### Superadmin (platform owner)

1. Sign up or log in.
2. Open `/dashboard/sports` and add sports (Football, Basketball, etc.).
3. Open `/dashboard/clubs` and add clubs under each sport.
4. Open `/dashboard/members` and assign Admins to clubs (add memberships with role `admin`).
5. Review global reports in `/dashboard/reports`.
6. Configure default fees in `/dashboard/settings`.

### Admin (club owner)

1. Log in and confirm your clubs in `/dashboard` (Access scope).
2. Open `/dashboard/members`:
   - Add coaches and students by user ID.
   - Approve join requests from `/request-access`.
3. Open `/dashboard/sessions`:
   - Create sessions and show QR for attendance.
4. Open `/dashboard/wallets`:
   - Top up student wallets (manual payments).
   - Run monthly billing (manual button or scheduler).
5. Monitor club metrics in `/dashboard/reports`.

### Coach (instructor)

1. Log in and view sessions in `/dashboard/sessions`.
2. Create sessions and share the QR for attendance.
3. Track attendance scans in `/dashboard/attendance`.

### Student (member)

1. Sign up and request access via `/request-access`.
2. Once approved, log in and view your profile at `/dashboard/profile`.
3. Scan session QR codes at `/scan?token=...`.
4. Review your attendance history and wallet balances in `/dashboard/profile`.

### Attendance workflow (QR)

1. Admin/Coach creates a session.
2. Click “Show QR” to display the QR token.
3. Student scans and checks in at `/scan?token=...`.
4. Attendance appears in `/dashboard/attendance` and the student profile.

### Wallet workflow (manual payments)

1. Admin collects payment externally.
2. Admin adds credits in `/dashboard/wallets`.
3. Monthly fees are charged via scheduler or “Run billing now.”

## Demo deployment (free tiers)

Below are quick demo-friendly setups. Free tiers have limits and may sleep when idle.

### Option A: Render (Web + Postgres + Worker)

1. Create a new Render **PostgreSQL** database.
2. Create a new **Web Service** from your GitHub repo.
3. Set build and start:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Set env vars:
   - `DATABASE_URL` = Render database URL
   - `NEXT_PUBLIC_SITE_URL` = Render web URL
5. Run schema once:
   - `psql "$DATABASE_URL" -f db/init.sql`
6. Create a **Background Worker** service:
   - Start Command: `npm run billing:scheduler`
   - Set the same env vars + `BILLING_CRON`/`NOTIFY_CRON`

### Option B: Railway (App + Postgres + Worker)

1. Create a Railway project and add **PostgreSQL**.
2. Deploy the app from GitHub.
3. Set env vars:
   - `DATABASE_URL` = Railway database URL
   - `NEXT_PUBLIC_SITE_URL` = Railway app URL
4. Run schema once:
   - `psql "$DATABASE_URL" -f db/init.sql`
5. Add a second service/worker:
   - Command: `npm run billing:scheduler`

### Option C: Fly.io (App + Postgres)

1. Install `flyctl` and authenticate.
2. Create Postgres: `fly postgres create`
3. Launch the app: `fly launch` (use the Node buildpack or Docker).
4. Set secrets:
   - `fly secrets set DATABASE_URL=...`
   - `fly secrets set NEXT_PUBLIC_SITE_URL=...`
5. Run schema:
   - `fly ssh console -C "psql \"$DATABASE_URL\" -f db/init.sql"`
6. Run scheduler:
   - Create a second Fly app or a worker process with `npm run billing:scheduler`.

### Notes for demos

- The scheduler is required for automated billing + notifications.
- You can run jobs manually for demos:
  - `npm run billing:run`
  - `npm run notifications:run`

## Notes

- Postgres schema loads from `db/init.sql` on first container start.
- Default fees live in `app_settings` (manage in `/dashboard/settings`).
- Manual payments only (top-ups + monthly charge in `/dashboard/wallets`).

## Troubleshooting

- `ECONNREFUSED 127.0.0.1:5432` inside Docker means the web container is using `DATABASE_URL` instead of `DATABASE_URL_DOCKER`.
- If the DB is reset, restart the stack to re-run `db/init.sql`:

```bash
docker compose down -v
docker compose up --build
```
