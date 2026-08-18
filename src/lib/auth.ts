import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { SessionUser, User, Permissions } from "./types";

const SESSION_COOKIE = "veto_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET || "veto-ads-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function toSessionUser(user: User, perm: Permissions | undefined): SessionUser {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    permissions: {
      upload: !!perm?.can_upload,
      review: !!perm?.can_review,
      dashboard: !!perm?.can_dashboard,
      admin: !!perm?.can_admin,
    },
  };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload as { user: SessionUser }).user;
  } catch {
    return null;
  }
}

export function findUserByUsername(username: string): User | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
}

export function getPermissions(userId: string): Permissions | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM permissions WHERE user_id = ?").get(userId) as
    | Permissions
    | undefined;
}

export function firstAllowedRoute(perm: SessionUser["permissions"]): string {
  if (perm.admin) return "/admin";
  if (perm.review) return "/review";
  if (perm.dashboard) return "/dashboard";
  if (perm.upload) return "/upload";
  return "/login";
}
