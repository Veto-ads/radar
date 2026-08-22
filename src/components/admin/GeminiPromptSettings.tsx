"use client";

import { useEffect, useState } from "react";

export default function GeminiPromptSettings() {
  const [videoPrompt, setVideoPrompt] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/gemini-prompts")
      .then((r) => r.json())
      .then((d) => {
        setVideoPrompt(d.video_prompt || "");
        setImagePrompt(d.image_prompt || "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings/gemini-prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_prompt: videoPrompt, image_prompt: imagePrompt }),
      });
      if (!res.ok) {
        setError((await res.json()).error || "تعذر الحفظ");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 4 }}>
        تعليمات تحليل الذكاء الاصطناعي (Gemini)
      </h2>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginBottom: 16 }}>
        هذا النص يُرسَل لـ Gemini مع كل مقطع فيديو أو صورة عند الضغط على &quot;تحليل بالذكاء الاصطناعي&quot; — عدّله
        لتوجيه التحليل (مثلاً: التركيز على قطاع معيّن، أو تجاهل تفاصيل معينة).
      </p>

      <div style={{ marginBottom: 16 }}>
        <label className="field-label">تعليمات تحليل الفيديو</label>
        <textarea
          className="field-input"
          rows={5}
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="field-label">تعليمات تحليل الصورة</label>
        <textarea
          className="field-input"
          rows={5}
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
        />
        <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginTop: 4 }}>
          تُستخدَم فقط عند رفع صورة بدل فيديو في صفحة رفع مقطع
        </p>
      </div>

      {error && <p style={{ color: "var(--danger-500)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
      {saved && (
        <p style={{ color: "var(--green-600)", fontSize: 13, marginBottom: 8 }}>تم حفظ التعليمات بنجاح</p>
      )}

      <button
        onClick={save}
        disabled={saving || !videoPrompt.trim() || !imagePrompt.trim()}
        className="btn-primary"
        style={{ padding: "10px 20px" }}
      >
        {saving ? "جاري الحفظ..." : "حفظ التعليمات"}
      </button>
    </div>
  );
}
