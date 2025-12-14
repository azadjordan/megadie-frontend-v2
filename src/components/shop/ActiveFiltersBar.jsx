// src/components/shop/ActiveFiltersBar.jsx
export default function ActiveFiltersBar({
  selectedFilters = {},
  onRemoveValue,   // (key, value) => void
  onClearAll,      // () => void
  disabled = false,
}) {
  const entries = Object.entries(selectedFilters || {}).flatMap(([key, values]) =>
    (values || []).map((v) => ({ key, value: v }))
  );

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-slate-900">Active filters</div>

        <button
          type="button"
          disabled={disabled}
          onClick={onClearAll}
          className={[
            "self-start rounded-md border px-3 py-1 text-xs transition sm:self-auto",
            disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
          ].join(" ")}
        >
          Clear all
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(({ key, value }) => (
          <button
            key={`${key}:${value}`}
            type="button"
            disabled={disabled}
            onClick={() => onRemoveValue(key, value)}
            className={[
              "inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-slate-700 transition",
              disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
            ].join(" ")}
            title="Remove filter"
          >
            <span className="text-slate-500">{key}:</span>
            <span className="font-medium text-slate-900">{value}</span>
            <span className="text-slate-400">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
