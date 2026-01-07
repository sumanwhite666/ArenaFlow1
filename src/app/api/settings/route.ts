import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getAccessContext } from "@/lib/server/access";

export async function GET() {
  const access = await getAccessContext();
  if (!access || (access.role !== "superadmin" && access.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { rows } = await pool.query<{
    id: string;
    registration_fee: number;
    monthly_fee: number;
  }>(
    `
      select id, registration_fee, monthly_fee
      from public.app_settings
      order by created_at asc
      limit 1
    `,
  );

  return NextResponse.json({ settings: rows[0] ?? null });
}

export async function PATCH(request: Request) {
  const access = await getAccessContext();
  if (!access || access.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const registrationFee = Number(body?.registrationFee);
  const monthlyFee = Number(body?.monthlyFee);

  if (Number.isNaN(registrationFee) || Number.isNaN(monthlyFee)) {
    return NextResponse.json({ error: "Invalid fees." }, { status: 400 });
  }

  const { rows } = await pool.query<{ id: string; registration_fee: number; monthly_fee: number }>(
    `
      update public.app_settings
      set registration_fee = $1,
          monthly_fee = $2
      where singleton = true
      returning id, registration_fee, monthly_fee
    `,
    [registrationFee, monthlyFee],
  );

  return NextResponse.json({ settings: rows[0] });
}
