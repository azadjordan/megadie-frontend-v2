export default function Pagination({ pagination, onPageChange }) {
  if (!pagination) return null

  const { page, totalPages, hasPrev, hasNext, total } = pagination

  if (totalPages <= 1) {
    // no need to render pagination for single page
    return (
      <p className="text-xs text-slate-500">
        Showing {total} item{total !== 1 && 's'}.
      </p>
    )
  }

  const goTo = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    onPageChange(newPage)
  }

  return (
    <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Page {page} of {totalPages} · {total} item{total !== 1 && 's'}
      </p>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={!hasPrev}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-2">|</span>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={!hasNext}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
