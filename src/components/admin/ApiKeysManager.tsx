"use client";

import { useEffect, useState } from "react";

type ApiKey = {
  id: string;
  label: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: number;
};

const ENDPOINTS = [
  { path: "/api/public/v1/dashboard", params: "from, to, category" },
  { path: "/api/public/v1/spending", params: "from, to" },
  { path: "/api/public/v1/company", params: "name, from, to" },
  { path: "/api/public/v1/sector", params: "name, from, to" },
  { path: "/api/public/v1/board-type", params: "type, sector" },
];

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  function load() {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []));
  }

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, []);

  async function create() {
    if (!label.trim()) {
      setError("اسم/وصف المفتاح مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إنشاء المفتاح");
        return;
      }
      setNewKey(data.key);
      setLabel("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleRevoke(key: ApiKey) {
    await fetch(`/api/api-keys/${key.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoked: key.revoked ? 0 : 1 }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا المفتاح نهائياً؟ أي موقع يستخدمه سيتوقف عن العمل فوراً.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 4 }}>
        مفاتيح API — ربط الإحصائيات بمواقع أخرى
      </h2>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginBottom: 16 }}>
        أنشئ مفتاحاً واستخدمه من أي موقع خارجي لجلب الإحصائيات مباشرة (قراءة فقط)
      </p>

      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        <input
          className="field-input"
          placeholder="وصف المفتاح (مثال: موقع الشركة الرئيسي)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <button onClick={create} disabled={saving} className="btn-primary" style={{ padding: "8px 20px" }}>
          {saving ? "جاري الإنشاء..." : "إنشاء مفتاح"}
        </button>
      </div>
      {error && <p style={{ color: "var(--danger-500)", fontSize: 13, marginBottom: 8 }}>{error}</p>}

      {newKey && (
        <div
          style={{
            background: "var(--green-100)",
            border: "1px solid var(--veto-green)",
            borderRadius: "var(--radius-md)",
            padding: 14,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--green-600)", marginBottom: 8 }}>
            انسخ هذا المفتاح الآن — لن يظهر مرة أخرى
          </p>
          <code
            style={{
              display: "block",
              background: "white",
              padding: 10,
              borderRadius: 6,
              fontSize: "var(--fs-xs)",
              wordBreak: "break-all",
            }}
          >
            {newKey}
          </code>
          <button
            onClick={() => setNewKey(null)}
            className="btn-secondary"
            style={{ padding: "6px 14px", marginTop: 8 }}
          >
            تم النسخ، إخفاء
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)" }}>
              {["الوصف", "المفتاح", "أُنشئ في", "آخر استخدام", "الحالة", ""].map((h) => (
                <th key={h} style={{ padding: 10, textAlign: "start", color: "var(--text-heading)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                <td style={{ padding: 10 }}>{k.label}</td>
                <td style={{ padding: 10, fontFamily: "monospace" }}>{k.key_prefix}…</td>
                <td style={{ padding: 10 }}>{k.created_at?.slice(0, 10)}</td>
                <td style={{ padding: 10 }}>{k.last_used_at?.slice(0, 16).replace("T", " ") || "لم يُستخدم بعد"}</td>
                <td style={{ padding: 10 }}>
                  <button
                    onClick={() => toggleRevoke(k)}
                    className={k.revoked ? "chip" : "chip chip-green"}
                    style={k.revoked ? { background: "var(--grey-150)", color: "var(--text-muted)" } : {}}
                  >
                    {k.revoked ? "مُعطَّل" : "فعّال"}
                  </button>
                </td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => remove(k.id)} className="btn-danger" style={{ fontSize: "var(--fs-caption)" }}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                  لا توجد مفاتيح بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: "var(--surface-muted)", borderRadius: "var(--radius-md)", padding: 14 }}>
        <p style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--text-heading)", marginBottom: 8 }}>
          طريقة الاستخدام من موقع خارجي
        </p>
        <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginBottom: 8 }}>
          أرسل طلب GET مع ترويسة <code>Authorization: Bearer &lt;المفتاح&gt;</code>
        </p>
        <pre
          style={{
            fontSize: "var(--fs-caption)",
            background: "white",
            padding: 10,
            borderRadius: 6,
            overflowX: "auto",
            marginBottom: 12,
          }}
        >
{`fetch("${origin}/api/public/v1/dashboard?from=2026-01-01&to=2026-12-31&category=all", {
  headers: { Authorization: "Bearer <المفتاح>" }
}).then(r => r.json())`}
        </pre>
        <p style={{ fontSize: "var(--fs-caption)", fontWeight: 600, color: "var(--text-heading)", marginBottom: 6 }}>
          نقاط النهاية المتاحة
        </p>
        <ul style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
          {ENDPOINTS.map((e) => (
            <li key={e.path}>
              <code>{e.path}</code> — المعاملات: {e.params}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
