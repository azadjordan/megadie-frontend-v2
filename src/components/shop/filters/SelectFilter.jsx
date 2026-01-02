// src/components/shop/filters/SelectFilter.jsx
export default function SelectFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
}) {
  const values = field?.allowedValues ?? []
  const multi = field?.multi !== false
  if (!values.length) return null

  const current = multi ? selected : selected?.[0] || ''

  const handleChange = (e) => {
    const val = e.target.value

    if (!multi) {
      if (!val) onToggle(field.key, current, false)
      else onToggle(field.key, val, false)
      return
    }

    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (opt) => opt.value,
    )

    const desired = new Set(selectedOptions)
    const existing = new Set(selected)

    for (const v of existing) if (!desired.has(v)) onToggle(field.key, v, true)
    for (const v of desired) if (!existing.has(v)) onToggle(field.key, v, true)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      <select
        disabled={disabled}
        value={current}
        multiple={multi}
        onChange={handleChange}
        className={[
          'w-full rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-200 transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:ring-violet-200',
        ].join(' ')}
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
  )
}
