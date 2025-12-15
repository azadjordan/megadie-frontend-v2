// src/components/common/Pagination.jsx
export default function Pagination({ pagination, onPageChange }) {
  if (!pagination) return null

  const { page, totalPages, hasPrev, hasNext } = pagination
  if (totalPages <= 1) return null

  const goTo = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    onPageChange(newPage)
  }

  const btnClass = (disabled) =>
    [
      'inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm transition',
      'ring-1 ring-slate-200 bg-white text-slate-700',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
      disabled
        ? 'cursor-not-allowed opacity-50'
        : 'hover:bg-slate-50 hover:ring-slate-300',
    ].join(' ')

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={!hasPrev}
        className={btnClass(!hasPrev)}
      >
        Prev
      </button>

      <span className="px-2 text-xs text-slate-400">|</span>

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={!hasNext}
        className={btnClass(!hasNext)}
      >
        Next
      </button>
    </div>
  )
}
