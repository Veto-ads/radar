import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const company = searchParams.get("company")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sector = searchParams.get("sector")?.trim();

  const db = getDb();
  const clauses = ["s.status = 'analyzed'"];
  const params: Record<string, unknown> = {};

  if (q) {
    clauses.push("(a.company_name LIKE @q OR s.code LIKE @q OR b.name LIKE @q)");
    params.q = `%${q}%`;
  }
  if (company) {
    clauses.push("a.company_name = @company");
    params.company = company;
  }
  if (sector) {
    clauses.push("a.sector = @sector");
    params.sector = sector;
  }
  if (from) {
    clauses.push("s.captured_date >= @from");
    params.from = from;
  }
  if (to) {
    clauses.push("s.captured_date <= @to");
    params.to = to;
  }

  const rows = db
    .prepare(
      `SELECT a.*, s.code as sighting_code, s.captured_date, s.captured_time, s.board_id,
              b.name as board_name, b.category as board_category, b.streets as board_streets, b.city as board_city
       FROM ads a
       JOIN sightings s ON s.id = a.sighting_id
       JOIN boards b ON b.id = s.board_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY s.captured_date DESC, s.captured_time DESC`
    )
    .all(params);

  return NextResponse.json({
    ads: rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { ...row, board_streets: JSON.parse((row.board_streets as string) || "[]") };
    }),
  });
}
