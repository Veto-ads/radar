"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

export default function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!username.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      setMessage(data.message || "تم إرسال الطلب");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="نسيت الرقم السري؟" onClose={onClose} width={380}>
      <div className="flex flex-col gap-3">
        {message ? (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-body)" }}>{message}</p>
        ) : (
          <>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
              أدخل اسم المستخدم، وسيصل طلب إعادة تعيين كلمة المرور إلى مدير النظام لتنفيذه.
            </p>
            <div>
              <label className="field-label">اسم المستخدم</label>
              <input
                className="field-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <button disabled={sending || !username.trim()} onClick={send} className="btn-primary" style={{ padding: "10px 0" }}>
              {sending ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
