import { randomBytes, randomUUID, createHash } from "node:crypto";
import { getDb } from "./db";

const KEY_PREFIX = "veto_";

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function createApiKey(label: string, createdBy: string): { id: string; plaintext: string } {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${KEY_PREFIX}${secret}`;
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    `INSERT INTO api_keys (id, label, key_prefix, key_hash, created_by) VALUES (?, ?, ?, ?, ?)`
  ).run(id, label, plaintext.slice(0, 12), hashKey(plaintext), createdBy);
  return { id, plaintext };
}

export function verifyApiKey(plaintext: string | null): boolean {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX)) return false;
  const db = getDb();
  const row = db
    .prepare("SELECT id, revoked FROM api_keys WHERE key_hash = ?")
    .get(hashKey(plaintext)) as { id: string; revoked: number } | undefined;
  if (!row || row.revoked) return false;
  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
  return true;
}

export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-api-key");
}
