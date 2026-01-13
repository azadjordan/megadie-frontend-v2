// src/components/shop/filters/SearchFilter.jsx
import { useMemo, useRef, useState } from 'react'

export default function SearchFilter({
  field,
  selected = [],
  onToggle,
  disabled = false,
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
    if (q) list = list.filter((v) => v.toLowerCase().includes(q))

    return list.slice(0, 50)
  }, [values, query, selected])

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
    <div className="space-y-2">
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
          {selected.map((v) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(field.key, v, multi)}
              className={[
                'rounded-full px-3 py-1 text-xs ring-1 transition',
                'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
              title="Remove"
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {openResults && (
        <div className="max-h-40 overflow-auto rounded-xl bg-white/95 shadow-sm ring-1 ring-slate-200/80">
          {filteredValues.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No matching results
            </div>
          ) : (
            filteredValues.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(v)}
                className={[
                  'block w-full px-3 py-2 text-left text-sm transition',
                  disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'text-slate-700 hover:bg-violet-50',
                ].join(' ')}
              >
                {v}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
