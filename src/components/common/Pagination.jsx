export default function Pagination({
  pagination,
  onPageChange,
  variant = "full", // "full" | "compact"
  showNumbers,
  showSummary,
  tone = "neutral",
}) {
  if (!pagination) return null;

  const { page, totalPages, hasPrev, hasNext } = pagination;
  if (!totalPages || totalPages <= 1) return null;

  const isCompact = variant === "compact";
  const _showNumbers =
    typeof showNumbers === "boolean" ? showNumbers : !isCompact;
  const _showSummary =
    typeof showSummary === "boolean" ? showSummary : !isCompact;

  const clamp = (n) => Math.min(Math.max(n, 1), totalPages);

  const goTo = (newPage) => {
    const p = clamp(newPage);
    if (p === page) return;
    onPageChange(p);
  };

  const isViolet = tone === "violet";
  const focusRingClass = isViolet
    ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
    : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

  const btnClass = (disabled) =>
    [
      "inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-semibold transition",
      "border border-slate-200 bg-white text-slate-700",
      focusRingClass,
      disabled
        ? "cursor-not-allowed opacity-50"
        : "hover:bg-slate-50 hover:border-slate-300",
    ].join(" ");

  const numClass = (active) =>
    [
      "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition",
      "border",
      active
        ? isViolet
          ? "border-violet-200 bg-violet-100 text-slate-900"
          : "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
      focusRingClass,
    ].join(" ");

  const pages = (() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1]);
    const arr = [...set]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i];
      const prev = arr[i - 1];
      if (i > 0 && cur - prev > 1) out.push("...");
      out.push(cur);
    }
    return out;
  })();

  const prevButton = (
    <button
      type="button"
      onClick={() => goTo(page - 1)}
      disabled={!hasPrev}
      className={btnClass(!hasPrev)}
    >
      Prev
    </button>
  );

  const nextButton = (
    <button
      type="button"
      onClick={() => goTo(page + 1)}
      disabled={!hasNext}
      className={btnClass(!hasNext)}
    >
      Next
    </button>
  );

  const pageLabel = (
    <div className="px-1 text-xs font-semibold text-slate-600">
      Page <span className="text-slate-900">{page}</span> of{" "}
      <span className="text-slate-900">{totalPages}</span>
    </div>
  );

  const separator = <span className="text-xs text-slate-400">|</span>;

  const showCompactLabelFirst = isCompact && !_showNumbers;

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-2",
        isCompact ? "justify-start" : "",
      ].join(" ")}
    >
      {showCompactLabelFirst ? (
        <>
          {pageLabel}
          {separator}
          {prevButton}
          {nextButton}
        </>
      ) : (
        <>
          {prevButton}
          {_showNumbers ? (
            <div className="inline-flex items-center gap-1">
              {pages.map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} className="px-2 text-sm text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goTo(p)}
                    className={numClass(p === page)}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          ) : (
            pageLabel
          )}
          {nextButton}
        </>
      )}

      {_showSummary ? (
        <div className="ml-1 text-xs text-slate-500">
          Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalPages}</span>
        </div>
      ) : null}
    </div>
  );
}
