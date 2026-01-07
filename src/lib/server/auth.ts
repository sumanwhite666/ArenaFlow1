import { randomUUID } from "crypto";
import { cookies } from "next/headers";

import { pool } from "@/lib/db";

export const SESSION_COOKIE = "sportcamp_session";
const SESSION_TTL_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_superadmin: boolean;
  session_id: string;
};

export const getSessionId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const sessionId = await getSessionId();
  if (!sessionId) return null;

  const { rows } = await pool.query<SessionUser>(
    `
      select
        p.id,
        p.email,
        p.full_name,
        p.is_superadmin,
        s.id as session_id
      from public.user_sessions s
      join public.profiles p on p.id = s.user_id
      where s.id = $1 and s.expires_at > now()
    `,
    [sessionId],
  );

  return rows[0] ?? null;
};

export const createSession = async (userId: string) => {
  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await pool.query(
    `insert into public.user_sessions (id, user_id, expires_at)
     values ($1, $2, $3)`,
    [sessionId, userId, expiresAt],
  );

  return { sessionId, expiresAt };
};

export const clearSession = async () => {
  const sessionId = await getSessionId();
  if (!sessionId) return;
  await pool.query(`delete from public.user_sessions where id = $1`, [sessionId]);
};
