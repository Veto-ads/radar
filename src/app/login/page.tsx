"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ غير متوقع");
        return;
      }
      const perm = data.user.permissions as Record<string, boolean>;
      const target = perm.admin
        ? "/admin"
        : perm.review
          ? "/review"
          : perm.dashboard
            ? "/dashboard"
            : perm.upload
              ? "/upload"
              : "/login";
      router.push(target);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="w-full flex flex-col items-center"
        style={{ maxWidth: 400 }}
      >
        <div
          className="w-full bg-white flex flex-col items-center"
          style={{
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-pop)",
            padding: 32,
          }}
        >
          <Image
            src="/veto-ads-logo.png"
            alt="Veto Ads"
            width={160}
            height={70}
            style={{ height: 70, width: "auto", marginBottom: 24 }}
            priority
          />
          <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
            <div>
              <label className="field-label">اسم المستخدم</label>
              <input
                className="field-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="field-label">كلمة المرور</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ padding: "12px 0", fontSize: "var(--fs-body)" }}
            >
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
