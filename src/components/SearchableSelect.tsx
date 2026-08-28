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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedLabel = value ? options.find((o) => o.value === value)?.label || value : "";
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        className="field-input"
        placeholder={placeholder}
        value={open ? query : selectedLabel}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
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
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "var(--fs-caption)",
            }}
          >
            {allLabel}
          </div>
          {filtered.map((o) => (
            <div
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                setQuery("");
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "var(--fs-caption)",
                background: o.value === value ? "var(--surface-muted)" : undefined,
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
