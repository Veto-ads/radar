import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRetryStatus } from "@/lib/gemini";

export async function GET(_request: Request, context: RouteContext<"/api/sightings/[id]/analyze-status">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  return NextResponse.json({ status: getRetryStatus(id) || null });
}
