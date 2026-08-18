"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

const ROLES = [
  { value: "rasid", label: "راصد ميداني" },
  { value: "quality", label: "مشرف جودة" },
  { value: "admin", label: "آدمن" },
  { value: "partner", label: "شريك" },
  { value: "custom", label: "دور مخصص" },
];

export default function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("rasid");
  const [customRole, setCustomRole] = useState("");
  const [perms, setPerms] = useState({ can_upload: false, can_review: false, can_dashboard: false, can_admin: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!username.trim() || !password || !fullName.trim()) {
      setError("جميع الحقول مطلوبة");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          full_name: fullName.trim(),
          role: role === "custom" ? "custom" : role,
          custom_role: role === "custom" ? customRole.trim() : null,
          ...perms,
        }),
      });
      if (!res.ok) {
        setError((await res.json()).error || "تعذر إنشاء المستخدم");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="إضافة مستخدم" onClose={onClose} width={480}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="field-label">الاسم الكامل</label>
          <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">اسم المستخدم</label>
            <input className="field-input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="field-label">كلمة المرور</label>
            <input className="field-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="field-label">الدور</label>
          <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {role === "custom" && (
          <div>
            <label className="field-label">اسم الدور المخصص</label>
            <input className="field-input" value={customRole} onChange={(e) => setCustomRole(e.target.value)} />
          </div>
        )}

        <div>
          <label className="field-label">الصلاحيات</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["can_upload", "رفع"],
              ["can_review", "مراجعة"],
              ["can_dashboard", "إحصائيات"],
              ["can_admin", "آدمن"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2" style={{ fontSize: "var(--fs-xs)" }}>
                <input
                  type="checkbox"
                  checked={perms[key as keyof typeof perms]}
                  onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>}

        <button disabled={saving} onClick={save} className="btn-primary" style={{ padding: "10px 0" }}>
          {saving ? "جاري الحفظ..." : "إنشاء المستخدم"}
        </button>
      </div>
    </Modal>
  );
}
