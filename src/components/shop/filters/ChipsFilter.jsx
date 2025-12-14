// src/components/shop/filters/ChipsFilter.jsx
export default function ChipsFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
  labelByValue = null, // ✅ NEW
}) {
  const values = field?.allowedValues ?? [];
  const multi = field?.multi !== false; // default true

  if (!values.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const isActive = selected.includes(v);
          const display = (labelByValue && labelByValue[v]) || v; // ✅ label fallback

          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field.key, v, multi)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition",
                disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}
              title={v} // nice: still shows key on hover
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}
