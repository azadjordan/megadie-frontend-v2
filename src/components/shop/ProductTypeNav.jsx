// src/components/shop/ProductTypeNav.jsx
export default function ProductTypeNav({
  productTypes = [],
  value,
  onChange,
  disabled = false,
  stacked = false,
}) {
  if (!productTypes || productTypes.length <= 1) return null

  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="text-sm font-semibold text-slate-900">Choose product</div>

      {/* Mobile: horizontal scroll | Desktop: vertical */}
      <div
        className={
          stacked
            ? "mt-3 flex flex-col gap-2"
            : "mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0"
        }
      >
        {productTypes.map((pt) => {
          const isActive = pt === value

          return (
            <button
              key={pt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(pt)}
              className={[
                'inline-flex items-center rounded-xl px-3 py-2 text-sm text-left transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
                stacked ? 'w-full justify-start' : 'justify-center',
                isActive
                  ? 'bg-violet-50 text-violet-700 font-semibold ring-1 ring-violet-300 hover:bg-violet-100'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              {pt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
