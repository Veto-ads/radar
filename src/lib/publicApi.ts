import { NextResponse } from "next/server";
import { extractApiKey, verifyApiKey } from "./apiKeys";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
};

export function corsJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function requireApiKey(request: Request): boolean {
  return verifyApiKey(extractApiKey(request));
}

// `new URL(request.url).origin` reflects the address Next.js's own server
// is bound to (localhost:3000 behind the nginx reverse proxy here), not the
// public hostname — neither the Host nor X-Forwarded-Host header changes
// that. SITE_URL is the reliable source for building absolute (non-
// localhost) URLs in public API responses; falls back to the request's own
// origin so this still works untouched in local dev.
export function getPublicOrigin(request: Request): string {
  return process.env.SITE_URL || new URL(request.url).origin;
}
