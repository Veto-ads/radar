import { getDb } from "./db";

export function nextSightingCode(): string {
  const db = getDb();
  const run = db.transaction(() => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'sighting_seq'").get() as
      | { value: string }
      | undefined;
    const next = (row ? parseInt(row.value, 10) : 0) + 1;
    if (row) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'sighting_seq'").run(String(next));
    } else {
      db.prepare("INSERT INTO settings (key, value) VALUES ('sighting_seq', ?)").run(String(next));
    }
    return next;
  });
  const seq = run();
  return `RSD-${String(seq).padStart(6, "0")}`;
}
