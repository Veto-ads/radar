"use client";

import { useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/types";

export default function BoardCombobox({
  value = null,
  onSelect,
}: {
  // Controlled by the parent: when it resets the board (after a successful
  // upload, for instance) the input must clear too, instead of still showing a
  // board the form no longer has selected.
  value?: Board | null;
  onSelect: (board: Board | null) => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards(d.boards || []));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const needle = query.trim().toLowerCase();
  const filtered = needle ? boards.filter((b) => b.name.toLowerCase().includes(needle)) : boards;

  // Open = searching, so the input carries the live query and starts empty;
  // closed = showing the picked board. Searching again is click-and-type, never
  // "clear the old name out first".
  const text = open ? query : value?.name || "";

  function openList() {
    if (open) return;
    setQuery("");
    setHighlight(0);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pick(b: Board) {
    close();
    onSelect(b);
  }

  function clear() {
    setQuery("");
    setHighlight(0);
    setOpen(true);
    onSelect(null);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (filtered.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + step + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" && open && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    }
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <label className="field-label">اسم اللوحة/الشاشة</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          className="field-input"
          value={text}
          placeholder="ابحث عن اللوحة..."
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          style={{ paddingInlineStart: value ? 56 : 32 }}
        />
        <button
          type="button"
          onClick={() => (open ? close() : openList())}
          aria-label="عرض اللوحات"
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
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="مسح اللوحة المختارة"
            title="مسح اللوحة المختارة"
            style={{
              position: "absolute",
              insetInlineStart: 32,
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
          {filtered.map((b, i) => (
            <button
              type="button"
              key={b.id}
              onClick={() => pick(b)}
              onMouseEnter={() => setHighlight(i)}
              className="w-full flex items-center justify-between"
              style={{
                padding: "10px 14px",
                textAlign: "start",
                borderBottom: "1px solid var(--border-default)",
                background: i === highlight ? "var(--surface-muted)" : undefined,
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
