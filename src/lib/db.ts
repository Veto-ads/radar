import Database from "better-sqlite3";
import path from "node:path";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const DB_PATH = path.join(process.cwd(), "data", "veto-ads.db");

declare global {
  // eslint-disable-next-line no-var
  var __veto_db__: Database.Database | undefined;
}

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      custom_role TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      can_upload INTEGER NOT NULL DEFAULT 0,
      can_review INTEGER NOT NULL DEFAULT 0,
      can_dashboard INTEGER NOT NULL DEFAULT 0,
      can_admin INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sectors (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS board_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS board_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'outdoor',
      city TEXT,
      district TEXT,
      streets TEXT,
      faces INTEGER DEFAULT 1,
      screens INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      price_duration_days INTEGER NOT NULL DEFAULT 14,
      location_url TEXT,
      image_url TEXT,
      company TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sightings (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      board_id TEXT NOT NULL REFERENCES boards(id),
      rasid_id TEXT NOT NULL REFERENCES users(id),
      video_url TEXT NOT NULL,
      captured_date TEXT NOT NULL,
      captured_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      sighting_id TEXT NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      sector TEXT NOT NULL,
      duration_seconds REAL,
      repeats_per_minute REAL,
      repeats_per_day REAL,
      frame_image_url TEXT,
      objective TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS board_assignments (
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (board_id, user_id)
    );
  `);

  const boardColumns = db.prepare("PRAGMA table_info(boards)").all() as { name: string }[];
  if (!boardColumns.some((c) => c.name === "price_duration_days")) {
    db.exec("ALTER TABLE boards ADD COLUMN price_duration_days INTEGER NOT NULL DEFAULT 14");
  }

  const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((c) => c.name === "reset_requested_at")) {
    db.exec("ALTER TABLE users ADD COLUMN reset_requested_at TEXT");
  }

  const typeCount = db.prepare("SELECT COUNT(*) as c FROM board_types").get() as { c: number };
  if (typeCount.c === 0) {
    const insertType = db.prepare("INSERT INTO board_types (id, name) VALUES (?, ?)");
    for (const name of ["يونيبول", "لوحة", "شاشة رقمية", "شاشة داخلية"]) insertType.run(randomUUID(), name);
  }
  const categoryCount = db.prepare("SELECT COUNT(*) as c FROM board_categories").get() as { c: number };
  if (categoryCount.c === 0) {
    const insertCategory = db.prepare("INSERT INTO board_categories (id, name) VALUES (?, ?)");
    for (const name of ["خارجي", "داخلي"]) insertCategory.run(randomUUID(), name);
  }

  // Older rows stored the English slugs the app used to render before board types
  // and categories became admin-editable free-text lists — bring them in line.
  const legacyTypeMap: Record<string, string> = {
    unipole: "يونيبول",
    billboard: "لوحة",
    "digital-screen": "شاشة رقمية",
    "indoor-screen": "شاشة داخلية",
  };
  const legacyCategoryMap: Record<string, string> = { outdoor: "خارجي", indoor: "داخلي" };
  const updateType = db.prepare("UPDATE boards SET type = ? WHERE type = ?");
  const updateCategory = db.prepare("UPDATE boards SET category = ? WHERE category = ?");
  for (const [oldVal, newVal] of Object.entries(legacyTypeMap)) updateType.run(newVal, oldVal);
  for (const [oldVal, newVal] of Object.entries(legacyCategoryMap)) updateCategory.run(newVal, oldVal);

  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    seed(db);
  }

  const promptRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_prompt'").get();
  if (!promptRow) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('gemini_prompt', ?)").run(
      "حلل الفيديو المرفق بدون صوت واذكر عدد الإعلانات الظاهرة في المقطع، واسم كل شركة معلنة، وقطاع كل شركة، ومدة ظهور الإعلان الواحد، وعدد مرات تكرار الإعلان في الدقيقة، وعدد مرات تكراره في اليوم، والتقط صورة من كل إعلان، واذكر اسم اللوحة الإعلانية من نوع الإعلان."
    );
  }
}

function seed(db: Database.Database) {
  const now = new Date();
  const insertUser = db.prepare(
    `INSERT INTO users (id, username, password_hash, full_name, role, status) VALUES (?,?,?,?,?,'active')`
  );
  const insertPerm = db.prepare(
    `INSERT INTO permissions (user_id, can_upload, can_review, can_dashboard, can_admin) VALUES (?,?,?,?,?)`
  );

  const admin = { id: randomUUID(), username: "admin", pass: "admin123", name: "مدير النظام", role: "admin" };
  const quality = { id: randomUUID(), username: "quality", pass: "quality123", name: "مشرف الجودة", role: "quality" };
  const rasid = { id: randomUUID(), username: "rasid", pass: "rasid123", name: "راصد ميداني", role: "rasid" };

  for (const u of [admin, quality, rasid]) {
    insertUser.run(u.id, u.username, bcrypt.hashSync(u.pass, 10), u.name, u.role);
  }
  insertPerm.run(admin.id, 1, 1, 1, 1);
  insertPerm.run(quality.id, 0, 1, 1, 0);
  insertPerm.run(rasid.id, 1, 0, 0, 0);

  const sectors = ["اتصالات", "أغذية ومشروبات", "عقارات", "سيارات", "بنوك ومال", "تجزئة", "صحة", "تعليم"];
  const insertSector = db.prepare("INSERT INTO sectors (id, name) VALUES (?, ?)");
  for (const s of sectors) insertSector.run(randomUUID(), s);

  const insertBoard = db.prepare(
    `INSERT INTO boards (id, name, type, category, city, district, streets, faces, screens, price, location_url, image_url, company, created_at)
     VALUES (@id,@name,@type,@category,@city,@district,@streets,@faces,@screens,@price,@location_url,@image_url,@company,@created_at)`
  );
  const boards = [
    { name: "لوحة طريق الملك فهد", type: "يونيبول", category: "خارجي", city: "الرياض", district: "العليا", streets: ["طريق الملك فهد"], faces: 2, screens: 0, price: 12000, location_url: "https://maps.google.com", image_url: null, company: "شركة الوسائل الخارجية" },
    { name: "شاشة برج المملكة", type: "شاشة رقمية", category: "خارجي", city: "الرياض", district: "العليا", streets: ["طريق الملك فهد", "طريق العروبة"], faces: 1, screens: 1, price: 25000, location_url: "https://maps.google.com", image_url: null, company: "فيتو للإعلان" },
    { name: "لوحة كورنيش جدة", type: "لوحة", category: "خارجي", city: "جدة", district: "الكورنيش", streets: ["طريق الكورنيش"], faces: 2, screens: 0, price: 15000, location_url: null, image_url: null, company: "شركة الوسائل الخارجية" },
    { name: "شاشة مول الرياض بارك", type: "شاشة داخلية", category: "داخلي", city: "الرياض", district: "حطين", streets: ["طريق الأمير تركي"], faces: 1, screens: 4, price: 9000, location_url: null, image_url: null, company: "فيتو للإعلان" },
  ];
  for (const b of boards) {
    insertBoard.run({
      id: randomUUID(),
      name: b.name,
      type: b.type,
      category: b.category,
      city: b.city,
      district: b.district,
      streets: JSON.stringify(b.streets),
      faces: b.faces,
      screens: b.screens,
      price: b.price,
      location_url: b.location_url,
      image_url: b.image_url,
      company: b.company,
      created_at: now.toISOString(),
    });
  }
}

export function getDb(): Database.Database {
  if (!globalThis.__veto_db__) {
    const db = new Database(DB_PATH);
    init(db);
    globalThis.__veto_db__ = db;
  }
  return globalThis.__veto_db__;
}
