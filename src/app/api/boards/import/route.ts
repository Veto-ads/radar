import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.permissions.admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "لا توجد صفوف لاستيرادها" }, { status: 400 });
  }

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO boards (id, name, type, category, city, district, streets, faces, screens, price, price_duration_days, location_url, image_url, company)
     VALUES (@id,@name,@type,@category,@city,@district,@streets,@faces,@screens,@price,@price_duration_days,@location_url,@image_url,@company)`
  );

  const tx = db.transaction((items: typeof rows) => {
    let count = 0;
    for (const row of items) {
      insert.run({
        id: randomUUID(),
        name: row.name,
        type: row.type,
        category: row.category,
        city: row.city || null,
        district: row.district || null,
        streets: JSON.stringify(row.streets || []),
        faces: row.faces || 1,
        screens: row.screens || 0,
        price: row.price || 0,
        price_duration_days: row.price_duration_days || 14,
        location_url: row.location_url || null,
        image_url: row.image_url || null,
        company: row.company || null,
      });
      count++;
    }
    return count;
  });

  const imported = tx(rows);
  return NextResponse.json({ imported });
}
