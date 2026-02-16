// src/components/shop/filters/SearchFilter.jsx
import { useMemo, useRef, useState } from 'react'

export default function SearchFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
  labelByValue = null,
  explanationByValue = null,
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const blurTimeoutRef = useRef(null)

  const values = field?.allowedValues ?? []
  const multi = field?.multi !== false
  const hasSelection = selected.length > 0

  const filteredValues = useMemo(() => {
    let list = values

    if (selected.length > 0) {
      const selectedSet = new Set(selected)
      list = list.filter((v) => !selectedSet.has(v))
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((v) => {
        const label = labelByValue ? labelByValue[v] : ''
        const explanation = explanationByValue ? explanationByValue[v] : ''
        const haystack = `${v} ${label} ${explanation}`.toLowerCase()
        return haystack.includes(q)
      })
    }

    return list
  }, [values, query, selected, labelByValue, explanationByValue])

  if (!values.length) return null

  const openResults = isOpen || query.trim().length > 0

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsOpen(true)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setIsOpen(false), 120)
  }

  const handleSelect = (value) => {
    onToggle(field.key, value, multi)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="relative space-y-2">
      <div className="text-sm font-medium text-slate-900">{field.label}</div>

      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={`Search ${field.label.toLowerCase()}`}
        className={[
          'w-full rounded-xl px-3 py-2 text-sm ring-1 transition',
          hasSelection
            ? 'bg-violet-50 text-slate-900 ring-violet-200'
            : 'bg-white/90 text-slate-700 ring-slate-200/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:ring-violet-200',
        ].join(' ')}
      />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((v) => {
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
                  'group relative p-0 text-left text-xs transition',
                  'text-violet-700',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                  disabled ? 'cursor-not-allowed opacity-60' : '',
                ].join(' ')}
                title="Remove"
              >
                <span className="inline-flex flex-col items-start">
                  <span className="relative z-10 inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold leading-tight text-violet-700 ring-1 ring-violet-200 transition-all group-hover:bg-violet-100/70 group-hover:ring-violet-200/80">
                    {label}
                  </span>
                  {explanation ? (
                    <span className="relative z-0 -mt-0.5 ml-2 inline-flex items-center rounded-b-lg rounded-tr-lg border border-violet-200/80 bg-violet-50/90 px-2 py-0.5 text-[10px] leading-tight text-violet-600/80 opacity-90 shadow-sm transition-all group-hover:bg-violet-100/70">
                      {explanation}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Results dropdown */}
      {openResults && (
        <div className="absolute top-full left-0 right-0 z-20 max-h-52 overflow-y-auto rounded-xl bg-white/95 shadow-lg ring-1 ring-slate-200/80">
          {filteredValues.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No matching results
            </div>
          ) : (
            filteredValues.map((v) => {
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(v)}
                  className={[
                    'block w-full px-3 py-2 text-left transition',
                    disabled
                      ? 'cursor-not-allowed opacity-60'
                      : 'text-slate-700 hover:bg-violet-50',
                  ].join(' ')}
                >
                  <div className="text-sm">{label}</div>
                  {explanation ? (
                    <div className="text-[11px] text-slate-500">
                      {explanation}
                    </div>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
