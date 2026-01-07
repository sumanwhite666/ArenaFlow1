import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { SESSION_COOKIE, createSession } from "@/lib/server/auth";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email ? normalizeEmail(body.email) : "";
  const password = body?.password ?? "";
  const fullName = body?.fullName ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const { rows: existing } = await pool.query(
      `select id from public.profiles where email = $1`,
      [email],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 10);
    const { rows } = await pool.query<{
      id: string;
      email: string;
      full_name: string | null;
      is_superadmin: boolean;
    }>(
      `
      insert into public.profiles (email, password_hash, full_name)
      values ($1, $2, $3)
      returning id, email, full_name, is_superadmin
    `,
      [email, passwordHash, fullName || null],
    );

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
    }

    const { sessionId, expiresAt } = await createSession(user.id);

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
