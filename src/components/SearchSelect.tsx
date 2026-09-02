"use client";

import { useEffect, useRef, useState } from "react";

export default function SearchSelect({
  options,
  placeholder,
  onSelect,
}: {
  options: string[];
  placeholder: string;
  onSelect: (value: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const needle = query.trim().toLowerCase();
  const filtered = needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;

  // While the list is open the input holds the live search text and starts
  // empty, so a second search is just "click and type" — never "erase the
  // previous pick first" (typing on top of it matched nothing and looked like
  // the search had died until the page was reloaded). While closed the input
  // shows what is actually selected.
  const text = open ? query : selected;

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

  function pick(option: string) {
    setSelected(option);
    close();
    onSelect(option);
  }

  function clear() {
    setSelected("");
    setQuery("");
    setHighlight(0);
    setOpen(true);
    onSelect("");
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
      <input
        ref={inputRef}
        className="field-input"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
        onKeyDown={onKeyDown}
        style={selected ? { paddingInlineStart: 32 } : undefined}
      />
      {selected && (
        <button
          type="button"
          onClick={clear}
          aria-label="مسح البحث"
          title="مسح البحث"
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
      {open && (
        <div
          className="card"
          style={{ position: "absolute", zIndex: 20, top: "100%", marginTop: 4, width: "100%", maxHeight: 240, overflowY: "auto" }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>
              لا توجد نتائج
            </div>
          )}
          {filtered.map((o, i) => (
            <button
              type="button"
              key={o}
              onClick={() => pick(o)}
              onMouseEnter={() => setHighlight(i)}
              className="w-full"
              style={{
                padding: "8px 14px",
                textAlign: "start",
                fontSize: "var(--fs-xs)",
                background: i === highlight ? "var(--surface-muted)" : undefined,
                fontWeight: o === selected ? 700 : undefined,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
