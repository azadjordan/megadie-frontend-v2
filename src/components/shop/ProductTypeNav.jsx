// src/components/shop/ProductTypeNav.jsx
export default function ProductTypeNav({
  productTypes = [],
  value,
  onChange,
  disabled = false,
}) {
  if (!productTypes || productTypes.length <= 1) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">Choose product</div>

      {/* Mobile: horizontal scroll | Desktop: vertical */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
        {productTypes.map((pt) => {
          const isActive = pt === value

          return (
            <button
              key={pt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(pt)}
              className={[
                'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-left transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
                isActive
                  ? 'bg-slate-900 text-white ring-1 ring-slate-900 hover:bg-slate-800'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
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
