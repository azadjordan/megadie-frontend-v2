// src/components/shop/filters/CheckboxFilter.jsx
export default function CheckboxFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
  labelByValue = null,
  explanationByValue = null,
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
          const label = (labelByValue && labelByValue[v]) || v
          const explanation =
            explanationByValue && explanationByValue[v]
              ? explanationByValue[v]
              : null

          return (
            <label
              key={v}
              className={[
                'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm ring-1 ring-transparent transition',
                checked
                  ? 'bg-violet-50 text-violet-700 ring-violet-200'
                  : 'bg-white/70 text-slate-700 hover:bg-white',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
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
              <span className="flex flex-col leading-tight">
                <span
                  className={checked ? 'text-violet-700' : 'text-slate-700'}
                >
                  {label}
                </span>
                {explanation ? (
                  <span className="text-[11px] text-slate-500">
                    {explanation}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
