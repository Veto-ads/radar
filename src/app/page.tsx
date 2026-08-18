import { redirect } from "next/navigation";
import { getSession, firstAllowedRoute } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(firstAllowedRoute(session.permissions));
}
