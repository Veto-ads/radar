"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { downloadBoardTemplate, parseBoardsFile, type ParseResult } from "@/lib/boardExcel";

export default function ImportBoardsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setError("");
    setParsed(null);
    setDone(null);
    try {
      const result = await parseBoardsFile(file);
      setParsed(result);
    } catch {
      setError("تعذر قراءة الملف — تأكد أنه بصيغة Excel صحيحة (xlsx أو csv)");
    } finally {
      setParsing(false);
    }
  }

  async function confirmImport() {
    if (!parsed || parsed.valid.length === 0) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/boards/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر الاستيراد");
        return;
      }
      setDone(data.imported);
      onImported();
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="استيراد لوحات من Excel" onClose={onClose} width={560}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            حمّل القالب أولاً لمعرفة الأعمدة المطلوبة بالترتيب الصحيح
          </p>
          <button onClick={downloadBoardTemplate} className="btn-secondary" style={{ padding: "6px 14px", whiteSpace: "nowrap" }}>
            تنزيل القالب
          </button>
        </div>

        <div>
          <label className="field-label">اختر ملف Excel</label>
          <input
            className="field-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileChange}
          />
          {fileName && (
            <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginTop: 4 }}>{fileName}</p>
          )}
        </div>

        {parsing && <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>جاري القراءة...</p>}

        {parsed && done === null && (
          <div className="flex flex-col gap-2">
            <div
              style={{
                background: "var(--green-100)",
                border: "1px solid var(--veto-green)",
                borderRadius: "var(--radius-md)",
                padding: 10,
                fontSize: "var(--fs-xs)",
                color: "var(--green-600)",
              }}
            >
              {parsed.valid.length} لوحة جاهزة للاستيراد
            </div>
            {parsed.errors.length > 0 && (
              <div
                style={{
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius-md)",
                  padding: 10,
                  fontSize: "var(--fs-caption)",
                  color: "var(--danger-500)",
                  maxHeight: 140,
                  overflowY: "auto",
                }}
              >
                <p style={{ marginBottom: 6, fontWeight: 600 }}>{parsed.errors.length} صف تم تجاهله:</p>
                {parsed.errors.map((e, i) => (
                  <p key={i}>
                    صف {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
            <button
              disabled={parsed.valid.length === 0 || importing}
              onClick={confirmImport}
              className="btn-primary"
              style={{ padding: "10px 0" }}
            >
              {importing ? "جاري الاستيراد..." : `استيراد ${parsed.valid.length} لوحة`}
            </button>
          </div>
        )}

        {done !== null && (
          <div
            style={{
              background: "var(--green-100)",
              border: "1px solid var(--veto-green)",
              borderRadius: "var(--radius-md)",
              padding: 12,
              fontSize: "var(--fs-xs)",
              color: "var(--green-600)",
            }}
          >
            تم استيراد {done} لوحة بنجاح
          </div>
        )}

        {error && <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>}
      </div>
    </Modal>
  );
}
