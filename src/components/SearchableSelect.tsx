"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel = "الكل",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedLabel = value ? options.find((o) => o.value === value)?.label || value : "";
  const needle = query.trim().toLowerCase();
  const filtered = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

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

  function pick(v: string) {
    onChange(v);
    close();
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
      pick(filtered[highlight].value);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="field-input"
        placeholder={placeholder}
        // Open = searching (the box holds the live query and starts empty, so a
        // new search never has to be typed on top of the previous pick);
        // closed = showing what is selected.
        value={open ? query : selectedLabel}
        onFocus={openList}
        onClick={openList}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        style={value ? { paddingInlineStart: 32 } : undefined}
      />
      {value && (
        <button
          type="button"
          aria-label="مسح الفلتر"
          title="مسح الفلتر"
          onClick={() => {
            onChange("");
            setQuery("");
            setHighlight(0);
            setOpen(true);
            inputRef.current?.focus();
          }}
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
          style={{
            position: "absolute",
            top: "100%",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            zIndex: 20,
            background: "var(--surface-white)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            maxHeight: 240,
            overflowY: "auto",
            marginTop: 4,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            onClick={() => pick("")}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "var(--fs-caption)",
            }}
          >
            {allLabel}
          </div>
          {filtered.map((o, i) => (
            <div
              key={o.value}
              onClick={() => pick(o.value)}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "var(--fs-caption)",
                background:
                  i === highlight || o.value === value ? "var(--surface-muted)" : undefined,
                fontWeight: o.value === value ? 700 : undefined,
              }}
            >
              {o.label}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
              لا نتائج
            </div>
          )}
        </div>
      )}
    </div>
  );
}
