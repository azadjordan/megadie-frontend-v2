// src/components/shop/ShopFilters.jsx
import ChipsFilter from './filters/ChipsFilter'
import SearchFilter from './filters/SearchFilter'
import SelectFilter from './filters/SelectFilter'
import CheckboxFilter from './filters/CheckboxFilter'

export default function ShopFilters({
  config,
  selectedFilters = {},
  onToggle,
  disabled = false,
  valueLabelMaps = {},
  onClearAll,
  hasActiveFilters = false,
}) {
  if (!config) return null
  const canClearFilters =
    hasActiveFilters && !disabled && typeof onClearAll === 'function'

  const fields = (config.fields || [])
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))

  if (fields.length === 0) {
    return (
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
        <p className="text-sm text-slate-500">No filters available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>

        {typeof onClearAll === 'function' && (
          <button
            type="button"
            disabled={!canClearFilters}
            onClick={canClearFilters ? onClearAll : undefined}
            className={[
              'rounded-md px-2 py-1 text-xs font-semibold transition',
              canClearFilters
                ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                : 'cursor-not-allowed text-slate-300 hover:bg-transparent',
            ].join(' ')}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Fields */}
      {fields.map((field) => {
        const selected = selectedFilters[field.key] || []
        const externalLabels = valueLabelMaps[field.key] || {}
        const configLabels =
          field?.allowedValueLabels instanceof Map
            ? Object.fromEntries(field.allowedValueLabels)
            : field?.allowedValueLabels || {}
        const configExplanations =
          field?.allowedValueExplanations instanceof Map
            ? Object.fromEntries(field.allowedValueExplanations)
            : field?.allowedValueExplanations || {}
        const labelByValue = { ...externalLabels, ...configLabels }
        const explanationByValue = configExplanations

        switch (field.ui) {
          case 'search':
            return (
              <SearchFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
                labelByValue={labelByValue}
                explanationByValue={explanationByValue}
              />
            )

          case 'select':
            return (
              <SelectFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
                labelByValue={labelByValue}
                explanationByValue={explanationByValue}
              />
            )

          case 'checkbox':
            return (
              <CheckboxFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
                labelByValue={labelByValue}
                explanationByValue={explanationByValue}
              />
            )

          case 'chips':
          default:
            return (
              <ChipsFilter
                key={field.key}
                field={field}
                selected={selected}
                onToggle={onToggle}
                disabled={disabled}
                labelByValue={labelByValue}
                explanationByValue={explanationByValue}
              />
            )
        }
      })}
    </div>
  )
}
