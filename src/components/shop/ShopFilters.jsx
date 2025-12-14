// src/components/shop/ShopFilters.jsx
import ChipsFilter from "./filters/ChipsFilter";
import SearchFilter from "./filters/SearchFilter";
import SelectFilter from "./filters/SelectFilter";
import CheckboxFilter from "./filters/CheckboxFilter";

export default function ShopFilters({
  config,
  selectedFilters = {},
  onToggle,
  disabled = false,
  valueLabelMaps = {},
  onClearAll,
  hasActiveFilters = false,
}) {
  if (!config) return null;

  const fields = (config.fields || [])
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  if (fields.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">No filters available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>

        {hasActiveFilters && typeof onClearAll === "function" && (
          <button
            type="button"
            disabled={disabled}
            onClick={onClearAll}
            className={[
              "rounded-full px-3 py-1 text-xs transition",
              "ring-1 ring-slate-200 bg-white text-slate-700",
              disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
            ].join(" ")}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Fields */}
      {fields.map((field) => {
        const selected = selectedFilters[field.key] || [];
        const labelByValue = valueLabelMaps[field.key];

        switch (field.ui) {
          case "search":
            return (
              <SearchFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
              />
            );

          case "select":
            return (
              <SelectFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
              />
            );

          case "checkbox":
            return (
              <CheckboxFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
              />
            );

          case "chips":
          default:
            return (
              <ChipsFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
                labelByValue={labelByValue}
              />
            );
        }
      })}
    </div>
  );
}
