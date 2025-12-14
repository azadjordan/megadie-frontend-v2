// src/components/shop/filters/SearchFilter.jsx
import { useMemo, useRef, useState } from "react";

export default function SearchFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef(null);

  const values = field?.allowedValues ?? [];
  const multi = field?.multi !== false;

  const filteredValues = useMemo(() => {
    let list = values;

    if (selected.length > 0) {
      const selectedSet = new Set(selected);
      list = list.filter((v) => !selectedSet.has(v));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((v) => v.toLowerCase().includes(q));
    }

    return list.slice(0, 50);
  }, [values, query, selected]);

  if (!values.length) return null;

  const openResults = isOpen || query.trim().length > 0;

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  const handleSelect = (value) => {
    onToggle(field.key, value, multi);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      {/* Search input */}
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={`Search ${field.label.toLowerCase()}…`}
        className={[
          "w-full rounded-md px-3 py-2 text-sm outline-none transition",
          "bg-white ring-1 ring-slate-200",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:ring-slate-300",
          "focus:ring-2 focus:ring-slate-300",
        ].join(" ")}
      />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((v) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field.key, v, multi)}
              className={[
                "rounded-full px-3 py-1 text-xs text-white transition",
                "bg-slate-900",
                disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-800",
              ].join(" ")}
              title="Remove"
            >
              {v} ×
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {openResults && (
        <div className="max-h-40 overflow-auto rounded-md bg-white shadow-sm ring-1 ring-slate-200">
          {filteredValues.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No matching results
            </div>
          ) : (
            filteredValues.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => handleSelect(v)}
                className={[
                  "block w-full px-3 py-2 text-left text-sm transition",
                  "text-slate-700 hover:bg-slate-50",
                  disabled ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {v}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
