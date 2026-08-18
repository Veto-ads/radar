"use client";

import { useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/types";

export default function BoardCombobox({
  onSelect,
}: {
  onSelect: (board: Board | null) => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Board | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards(d.boards || []));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = boards.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));

  function pick(b: Board) {
    setSelected(b);
    setQuery(b.name);
    setOpen(false);
    onSelect(b);
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <label className="field-label">اسم اللوحة/الشاشة</label>
      <div style={{ position: "relative" }}>
        <input
          className="field-input"
          value={query}
          placeholder="ابحث عن اللوحة..."
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== selected.name) {
              setSelected(null);
              onSelect(null);
            }
          }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            position: "absolute",
            insetInlineStart: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
          }}
        >
          ▾
        </button>
      </div>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            marginTop: 4,
            width: "100%",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: 12, color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>
              لا توجد نتائج
            </div>
          )}
          {filtered.map((b) => (
            <button
              type="button"
              key={b.id}
              onClick={() => pick(b)}
              className="w-full flex items-center justify-between"
              style={{
                padding: "10px 14px",
                textAlign: "start",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              <span style={{ fontSize: "var(--fs-body)" }}>{b.name}</span>
              <span className="chip chip-cyan">{b.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
