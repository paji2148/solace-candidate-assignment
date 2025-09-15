// src/app/api/advocates/[id]/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import db from "../../../../db";
import { advocates } from "../../../../db/schema";
import type { Advocate } from "../../../types/advocate";

export const dynamic = "force-dynamic";

type Row = typeof advocates.$inferSelect;
type ApiError = { error: string };

const toDto = (row: Row): Advocate => ({
  id: row.id,
  firstName: row.firstName,
  lastName: row.lastName,
  city: row.city,
  degree: row.degree,
  specialties: (row.specialties ?? []) as string[],
  yearsOfExperience: row.yearsOfExperience,
  phoneNumber: row.phoneNumber,
});

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  // keep within 32-bit signed int (Postgres int)
  return Number.isFinite(n) && n > 0 && n <= 2147483647 ? n : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (id == null) {
    return NextResponse.json<ApiError>({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(advocates)
      .where(eq(advocates.id, id))
      .limit(1)
      .execute(); // important for clean TS types

    const row = rows[0];
    if (!row) {
      return NextResponse.json<ApiError>({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json<Advocate>(toDto(row), { status: 200 });
  } catch {
    return NextResponse.json<ApiError>({ error: "Internal server error" }, { status: 500 });
  }
}
