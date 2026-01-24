// src/components/shop/filters/ChipsFilter.jsx
export default function ChipsFilter({
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

      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const isActive = selected.includes(v)
          const label = (labelByValue && labelByValue[v]) || v
          const explanation =
            explanationByValue && explanationByValue[v]
              ? explanationByValue[v]
              : null

          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field.key, v, multi)}
              className={[
                'group relative p-0 text-left transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
                isActive ? 'text-violet-700' : 'text-slate-700',
              ].join(' ')}
              title={explanation ? `${label} - ${explanation}` : label}
            >
              <span className="inline-flex flex-col items-start">
                <span
                  className={[
                    'relative z-10 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-all',
                    isActive
                      ? 'bg-violet-50 text-violet-700 ring-violet-200'
                      : 'bg-white text-slate-700 ring-slate-200/80 group-hover:bg-violet-50/60 group-hover:text-violet-700 group-hover:ring-violet-200/80',
                  ].join(' ')}
                >
                  {label}
                </span>
                {explanation ? (
                  <span
                    className={[
                      'relative z-0 -mt-0.5 ml-2 inline-flex items-center rounded-b-lg rounded-tr-lg border px-2 py-0.5 text-[10px] leading-tight opacity-90 shadow-sm transition-all',
                      isActive
                        ? 'border-violet-200/80 bg-violet-50/90 text-violet-600/80'
                        : 'border-slate-200/80 bg-slate-100/80 text-slate-500/80 group-hover:border-violet-200/70 group-hover:bg-violet-50/70 group-hover:text-violet-600/80',
                    ].join(' ')}
                  >
                    {explanation}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
