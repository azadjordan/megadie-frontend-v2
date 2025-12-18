// src/components/common/Pagination.jsx
export default function Pagination({ pagination, onPageChange }) {
  if (!pagination) return null

  const { page, totalPages, hasPrev, hasNext } = pagination
  if (!totalPages || totalPages <= 1) return null

  const clamp = (n) => Math.min(Math.max(n, 1), totalPages)

  const goTo = (newPage) => {
    const p = clamp(newPage)
    if (p === page) return
    onPageChange(p)
  }

  const btnClass = (disabled) =>
    [
      'inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition',
      'ring-1 ring-slate-200 bg-white text-slate-700',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
      disabled
        ? 'cursor-not-allowed opacity-50'
        : 'hover:bg-slate-50 hover:ring-slate-300',
    ].join(' ')

  const numClass = (active) =>
    [
      'inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition',
      'ring-1 ring-slate-200',
      active
        ? 'bg-slate-900 text-white ring-slate-900'
        : 'bg-white text-slate-700 hover:bg-slate-50 hover:ring-slate-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
    ].join(' ')

  // show: 1 ... (page-1) page (page+1) ... totalPages (max 5 numbers)
  const pages = (() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1])
    const arr = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

    const out = []
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i]
      const prev = arr[i - 1]
      if (i > 0 && cur - prev > 1) out.push('…')
      out.push(cur)
    }
    return out
  })()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={!hasPrev}
        className={btnClass(!hasPrev)}
      >
        Prev
      </button>

      <div className="inline-flex items-center gap-1">
        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`dots-${idx}`} className="px-2 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              className={numClass(p === page)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={!hasNext}
        className={btnClass(!hasNext)}
      >
        Next
      </button>

      <div className="ml-1 text-xs text-slate-500">
        Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalPages}</span>
      </div>
    </div>
  )
}
