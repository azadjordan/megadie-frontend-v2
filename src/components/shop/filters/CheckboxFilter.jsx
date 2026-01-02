// src/components/shop/filters/CheckboxFilter.jsx
export default function CheckboxFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
}) {
  const values = field?.allowedValues ?? []
  const multi = field?.multi !== false

  if (!values.length) return null

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      <div className="space-y-2">
        {values.map((v) => {
          const checked = selected.includes(v)

          return (
            <label
              key={v}
              className={[
                'flex items-center gap-2 text-sm',
                disabled ? 'opacity-60' : 'cursor-pointer',
              ].join(' ')}
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={checked}
                onChange={() => onToggle(field.key, v, multi)}
                className={[
                  'h-4 w-4 rounded border-slate-300 text-violet-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                ].join(' ')}
              />
              <span className="text-slate-700">{v}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
