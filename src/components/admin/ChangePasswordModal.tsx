"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

export default function ChangePasswordModal({
  userId,
  userName,
  onClose,
  onSaved,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError((await res.json()).error || "تعذر تغيير كلمة المرور");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`تغيير كلمة المرور — ${userName}`} onClose={onClose} width={400}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="field-label">كلمة المرور الجديدة</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">تأكيد كلمة المرور</label>
          <input
            className="field-input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>}

        <button disabled={saving} onClick={save} className="btn-primary" style={{ padding: "10px 0" }}>
          {saving ? "جاري الحفظ..." : "حفظ كلمة المرور"}
        </button>
      </div>
    </Modal>
  );
}
