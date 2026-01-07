import { NextResponse } from "next/server";

import { SESSION_COOKIE, clearSession } from "@/lib/server/auth";

export async function POST() {
  await clearSession();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
