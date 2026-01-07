import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { SESSION_COOKIE, createSession } from "@/lib/server/auth";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email ? normalizeEmail(body.email) : "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const { rows } = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    full_name: string | null;
    is_superadmin: boolean;
  }>(
    `
      select id, email, password_hash, full_name, is_superadmin
      from public.profiles
      where email = $1
    `,
    [email],
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const { sessionId, expiresAt } = await createSession(user.id);

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_superadmin: user.is_superadmin,
    },
  });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
