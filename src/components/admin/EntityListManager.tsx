"use client";

import { useEffect, useState } from "react";
import { exportTableToExcel } from "@/lib/exportExcel";

type Entity = { id: string; name: string };

export default function EntityListManager({
  title,
  placeholder,
  basePath,
  listKey,
  exportFileName,
}: {
  title: string;
  placeholder: string;
  basePath: string;
  listKey: string;
  // When set, the header shows an Excel export button for the current list.
  exportFileName?: string;
}) {
  const [items, setItems] = useState<Entity[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Entity | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  function load() {
    fetch(basePath)
      .then((r) => r.json())
      .then((d) => setItems(d[listKey] || []));
  }

  useEffect(load, [basePath, listKey]);

  async function add() {
    if (!newName.trim()) return;
    setError("");
    const res = await fetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setNewName("");
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`${basePath}/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("هل تريد الحذف؟")) return;
    await fetch(`${basePath}/${id}`, { method: "DELETE" });
    load();
  }

  // An item being edited stays visible even if the search no longer matches it.
  const needle = search.trim().toLowerCase();
  const visibleItems = needle
    ? items.filter((s) => s.name.toLowerCase().includes(needle) || editing?.id === s.id)
    : items;

  function doExport() {
    if (!exportFileName) return;
    exportTableToExcel(
      exportFileName,
      ["#", "الاسم"],
      items.map((s, i) => [i + 1, s.name])
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>{title}</h2>
        {exportFileName && (
          <button
            onClick={doExport}
            disabled={items.length === 0}
            className="btn-primary"
            style={{ padding: "8px 14px" }}
          >
            تصدير Excel
          </button>
        )}
      </div>

      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        <input
          className="field-input"
          placeholder={placeholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add} className="btn-primary" style={{ padding: "8px 20px" }}>
          إضافة
        </button>
      </div>
      {error && <p style={{ color: "var(--danger-500)", fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          className="field-input"
          placeholder="بحث في القائمة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={search ? { paddingInlineStart: 32 } : undefined}
        />
        {search && (
          <button
            type="button"
            aria-label="مسح البحث"
            title="مسح البحث"
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              insetInlineStart: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleItems.map((s) =>
          editing?.id === s.id ? (
            <div key={s.id} className="flex gap-1 items-center">
              <input
                className="field-input"
                style={{ width: 140 }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
              <button onClick={saveEdit} className="btn-primary" style={{ padding: "6px 10px" }}>
                حفظ
              </button>
              <button onClick={() => setEditing(null)} className="btn-secondary" style={{ padding: "6px 10px" }}>
                إلغاء
              </button>
            </div>
          ) : (
            <div key={s.id} className="chip chip-cyan" style={{ padding: "8px 14px", gap: 8 }}>
              <span>{s.name}</span>
              <button
                onClick={() => {
                  setEditing(s);
                  setEditName(s.name);
                }}
              >
                ✎
              </button>
              <button onClick={() => remove(s.id)} style={{ color: "var(--danger-500)" }}>
                ×
              </button>
            </div>
          )
        )}
        {needle && visibleItems.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>لا توجد نتائج</p>
        )}
      </div>
    </div>
  );
}
