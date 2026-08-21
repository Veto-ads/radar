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
  const [query, setQuery] = useState("");
  const [filterText, setFilterText] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(filterText.toLowerCase()));

  function openList() {
    setOpen(true);
    // Reopening on an already-picked value should browse the full list again,
    // not stay filtered down to just the one option whose text fills the input.
    if (options.includes(query)) setFilterText("");
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
        className="field-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setFilterText(e.target.value);
          setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
      />
      {open && filtered.length > 0 && (
        <div
          className="card"
          style={{ position: "absolute", zIndex: 20, top: "100%", marginTop: 4, width: "100%", maxHeight: 240, overflowY: "auto" }}
        >
          {filtered.map((o) => (
            <button
              type="button"
              key={o}
              onClick={() => {
                setQuery(o);
                setFilterText(o);
                setOpen(false);
                onSelect(o);
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
