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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
                isActive
                  ? 'bg-slate-900 text-white ring-slate-900 hover:bg-slate-800'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
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
