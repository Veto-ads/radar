"use client";

import { useEffect, useRef, useState } from "react";

// Unlike SearchSelect, the input's own text IS the bound value — typing a name
// that doesn't exist yet (a new company/sector) is a valid, common case here,
// not an error state. Suggestions are just a fast way to reuse an existing one.
export default function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(value.toLowerCase()));

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
        className="field-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div
          className="card"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            marginTop: 4,
            width: "100%",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {filtered.map((o) => (
            <button
              type="button"
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="w-full"
              style={{ padding: "8px 14px", textAlign: "start", fontSize: "var(--fs-xs)" }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
