// src/components/shop/filters/SelectFilter.jsx
export default function SelectFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
}) {
  const values = field?.allowedValues ?? [];
  const multi = field?.multi !== false; // default true

  if (!values.length) return null;

  const current = multi ? selected : selected?.[0] || "";

  const handleChange = (e) => {
    const val = e.target.value;

    // For single-select, empty means clear
    if (!multi) {
      if (!val) onToggle(field.key, current, false); // toggle off current if any
      else onToggle(field.key, val, false);
      return;
    }

    // For multi-select, native <select multiple> gives selectedOptions
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (opt) => opt.value
    );

    // Instead of introducing a new "setFilter" dependency here,
    // we toggle diff one by one using onToggle (simple + consistent).
    // We compute desired set and reconcile toggles.
    const desired = new Set(selectedOptions);
    const existing = new Set(selected);

    // toggle off removed
    for (const v of existing) {
      if (!desired.has(v)) onToggle(field.key, v, true);
    }
    // toggle on added
    for (const v of desired) {
      if (!existing.has(v)) onToggle(field.key, v, true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      <select
        disabled={disabled}
        value={current}
        multiple={multi}
        onChange={handleChange}
        className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      >
        {!multi && <option value="">All</option>}
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {multi && (
        <p className="text-[11px] text-slate-500">
          Tip: Hold Ctrl/Cmd to select multiple.
        </p>
      )}
    </div>
  );
}
