// src/app/api/advocates/route.ts
import { NextResponse } from "next/server";
import db from "../../../db";
import { advocates } from "../../../db/schema";
import { ilike, or, sql } from "drizzle-orm";
import type { Advocate, AdvocatesResponse } from "../../types/advocate";

type AdvocateRow = typeof advocates.$inferSelect;

const MAX_PAGE_SIZE = 100;

function toDto(row: AdvocateRow): Advocate {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    city: row.city,
    degree: row.degree,
    specialties: (row.specialties ?? []) as string[],
    yearsOfExperience: row.yearsOfExperience,
    phoneNumber: row.phoneNumber,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = clamp(Number(searchParams.get("page") ?? 1), 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clamp(Number(searchParams.get("pageSize") ?? 10), 1, MAX_PAGE_SIZE);
    const q = (searchParams.get("q") ?? "").trim();
    const offset = (page - 1) * pageSize;

    // Build filters
    let filter:
      | ReturnType<typeof or>
      | ReturnType<typeof ilike>
      | ReturnType<typeof sql>
      | undefined;

    if (q.length > 0) {
      const like = `%${q}%`;
      const isDigits = /^\d+$/.test(q);

      const parts = [
        ilike(advocates.firstName, like),
        ilike(advocates.lastName, like),
        ilike(advocates.city, like),
        ilike(advocates.degree, like),
        // broad match on jsonb specialties
        sql`${advocates.specialties}::text ILIKE ${like}`,
      ] as const;

      const phonePart = isDigits ? sql`${advocates.phoneNumber}::text LIKE ${like}` : null;

      filter = phonePart ? or(...parts, phonePart) : or(...parts);
    }

    // Count (PG count(*) returns bigint → cast for TS)
    let countQ = db
      .select({ count: sql<number>`CAST(count(*) AS int)` })
      .from(advocates);
    if (filter) countQ = countQ.where(filter);
    const [{ count }] = await countQ.execute();
    const total = Number(count ?? 0);

    // Page
    let listQ = db.select().from(advocates);
    if (filter) listQ = listQ.where(filter);
    const rows = await listQ.orderBy(advocates.id).limit(pageSize).offset(offset).execute();

    const data: Advocate[] = rows.map(toDto);

    const payload: AdvocatesResponse = {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        q,
      },
    };

    return NextResponse.json<AdvocatesResponse>(payload);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
