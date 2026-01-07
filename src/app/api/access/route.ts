import { NextResponse } from "next/server";

import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();

  if (!access) {
    return NextResponse.json({ status: "signed-out" }, { status: 200 });
  }

  if (!access.isSuperadmin && access.clubs.length === 0) {
    return NextResponse.json({
      status: "no-membership",
      userId: access.userId,
      userLabel: access.userLabel,
    });
  }

  return NextResponse.json({
    status: "allowed",
    role: access.role,
    clubs: access.clubs,
    userId: access.userId,
    userLabel: access.userLabel,
  });
}
