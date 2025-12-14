// src/components/shop/ProductTypeSwitcher.jsx
export default function ProductTypeSwitcher({
  productTypes = [],
  value,
  onChange,
  disabled = false,
}) {
  if (!productTypes || productTypes.length <= 1) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex min-w-max items-center gap-2">
        {productTypes.map((pt) => {
          const isActive = pt === value;

          return (
            <button
              key={pt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(pt)}
              className={[
                // tab-like pills (lighter + more navigation)
                "rounded-full border px-4 py-1.5 text-sm transition whitespace-nowrap",
                disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50",
                isActive
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200",
              ].join(" ")}
            >
              {pt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
