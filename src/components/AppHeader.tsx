"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";

const TABS: { href: string; label: string; perm: keyof SessionUser["permissions"] }[] = [
  { href: "/upload", label: "رفع مقطع", perm: "upload" },
  { href: "/review", label: "مراجعة الرصد", perm: "review" },
  { href: "/dashboard", label: "لوحة الإحصائيات", perm: "dashboard" },
  { href: "/admin", label: "الإدارة", perm: "admin" },
];

export default function AppHeader({ session }: { session: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="w-full flex items-center justify-between px-6 sticky top-0 z-30"
      style={{
        height: 72,
        background: "var(--surface-white)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center gap-8">
        <Image src="/veto-ads-logo.png" alt="Veto Ads" width={120} height={50} style={{ height: 50, width: "auto" }} />
        <nav className="flex items-center gap-2">
          {TABS.filter((t) => session.permissions[t.perm]).map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className="chip"
                style={{
                  padding: "8px 16px",
                  fontSize: "var(--fs-body)",
                  fontWeight: active ? 600 : 400,
                  background: active ? "var(--veto-green)" : "transparent",
                  color: active ? "var(--text-on-dark)" : "var(--text-heading)",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span style={{ fontSize: "var(--fs-body)", color: "var(--text-heading)" }}>
          {session.full_name}
        </span>
        <button onClick={logout} className="btn-danger" style={{ fontSize: "var(--fs-xs)" }}>
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}
