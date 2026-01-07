# Project Context: ArenaFlow

## Project Overview
**ArenaFlow** is a sports club management SaaS designed for multi-sport, multi-club operations. It provides features for attendance tracking (QR code based), wallet/credit management, role-based access control (Superadmin, Admin, Coach, Student), and automated billing/notifications.

### Tech Stack
- **Frontend/Framework:** Next.js 16.1.1 (App Router), React 19, Tailwind CSS v4.
- **Database:** PostgreSQL (using `pg` driver).
- **Infrastructure:** Docker, Docker Compose.
- **Backend Scripts:** Node.js scripts for scheduling and background tasks (billing, notifications).

## Architecture & Directory Structure
- **`src/app/`**: Next.js App Router pages and API routes.
- **`src/components/`**: React components.
- **`src/lib/`**: Shared utilities (`db.ts` for database pool, `auth.ts` for session management).
- **`scripts/`**: Standalone Node.js scripts (`billing.js`, `notifications.js`, `scheduler.js`). These run outside the Next.js context but connect to the same DB.
- **`db/`**: Database initialization (`init.sql`).
- **`supabase/`**: Contains schema backups or reference SQL (e.g., `schema.sql`).

## Building and Running

### Local Development (Hybrid)
Running Next.js locally while using Docker for the database.

1.  **Start Database:**
    ```bash
    docker compose up -d db
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Start Dev Server:**
    ```bash
    npm run dev
    ```
    *Access at `http://localhost:3000`*

### Full Docker Stack
Runs the App, Database, and Scheduler services.
```bash
docker compose up --build
```

### Database Seeding & Setup
- **Initial Schema:** Automatically applied from `db/init.sql` on the first Docker DB volume creation.
- **Superadmin:**
    -   **Default:** `superadmin@arenaflow.local` / `Sportcamp123!` (inserted by `db/init.sql`).
    -   **Custom Seed:**
        ```bash
        # Requires .env variables: SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NAME
        npm run seed:superadmin
        ```

### Background Tasks
-   **Billing:** `npm run billing:run` (Manual trigger)
-   **Notifications:** `npm run notifications:run` (Manual trigger)
-   **Scheduler:** `npm run billing:scheduler` (Runs cron jobs for both)

## Development Conventions

### Configuration
-   **`next.config.mjs`**: Used instead of `.ts` to avoid compilation issues with Turbopack on Windows.
-   **External Packages:** Native modules like `pg` and `bcryptjs` MUST be added to `serverExternalPackages` in `next.config.mjs` to prevent Turbopack bundling errors (specifically "junction point" errors on Windows).

### Database
-   **Connection Pooling:** Use `src/lib/db.ts`. It exports a singleton `pool` instance.
-   **Environment Variables:**
    -   `DATABASE_URL`: For local Node.js processes (host machine).
    -   `DATABASE_URL_DOCKER`: For services running inside Docker containers.

### Linting
-   **Scripts:** Files in `scripts/` use CommonJS (`require`). ESLint rules for `no-require-imports` are explicitly disabled in these files via comments.

### Docker
-   **Environment:** The `web` service in `docker-compose.yml` has `NODE_ENV: development` to ensure the dev server functions correctly.
-   **Production Build:** The `Dockerfile` sets `NODE_ENV=production` by default for optimized image builds.
