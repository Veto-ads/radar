import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface-muted)" }}>
      <AppHeader session={session} />
      <main className="flex-1 w-full mx-auto p-6" style={{ maxWidth: "var(--content-max)" }}>
        {children}
      </main>
    </div>
  );
}
