// src/components/shop/filters/ChipsFilter.jsx
export default function ChipsFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
  labelByValue = null,
}) {
  const values = field?.allowedValues ?? []
  const multi = field?.multi !== false

  if (!values.length) return null

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const isActive = selected.includes(v)
          const display = (labelByValue && labelByValue[v]) || v

          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field.key, v, multi)}
              className={[
                'rounded-full px-3 py-1 text-xs ring-1 transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
                isActive
                  ? 'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100'
                  : 'bg-white/90 text-slate-600 ring-slate-200/80 hover:bg-white',
              ].join(' ')}
              title={v}
            >
              {display}
            </button>
          )
        })}
      </div>
    </div>
  )
}
