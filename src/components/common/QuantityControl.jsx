import { FiMinus, FiPlus } from "react-icons/fi";

const clampValue = (val, min, max) => {
  const next = Number(val);
  if (!Number.isFinite(next)) return min;
  if (max != null && Number.isFinite(max)) {
    return Math.min(Math.max(next, min), max);
  }
  return Math.max(next, min);
};

export default function QuantityControl({
  quantity,
  setQuantity,
  min = 1,
  max,
  size = "md",
  compact = false,
  disabled = false,
}) {
  const numericQty = Number.isFinite(Number(quantity)) ? Number(quantity) : min;
  const clampedQty = clampValue(numericQty, min, max);
  const canDecrease = clampedQty > min;
  const canIncrease =
    max == null || !Number.isFinite(Number(max)) ? true : clampedQty < max;

  const sizes = {
    sm: {
      btn: "h-8 w-8",
      input: compact ? "h-8 w-10 text-xs" : "h-8 w-12 text-xs",
      icon: "h-3 w-3",
    },
    md: {
      btn: "h-9 w-9",
      input: compact ? "h-9 w-12 text-sm" : "h-9 w-14 text-sm",
      icon: "h-3.5 w-3.5",
    },
  };

  const sizeStyle = sizes[size] || sizes.md;

  const handleDecrease = () => {
    if (disabled || !canDecrease) return;
    setQuantity(clampValue(clampedQty - 1, min, max));
  };

  const handleIncrease = () => {
    if (disabled || !canIncrease) return;
    setQuantity(clampValue(clampedQty + 1, min, max));
  };

  const handleChange = (event) => {
    const raw = event.target.value;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    setQuantity(clampValue(parsed, min, max));
  };

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={handleDecrease}
        disabled={disabled || !canDecrease}
        className={[
          "inline-flex items-center justify-center text-slate-600 transition",
          sizeStyle.btn,
          disabled || !canDecrease
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "bg-white hover:bg-slate-50",
        ].join(" ")}
        aria-label="Decrease quantity"
      >
        <FiMinus className={sizeStyle.icon} />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        value={clampedQty}
        onChange={handleChange}
        disabled={disabled}
        className={[
          "text-center font-semibold text-slate-900 outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0",
          "border-x border-slate-200 bg-white",
          sizeStyle.input,
          disabled ? "bg-slate-100 text-slate-400" : "",
        ].join(" ")}
        inputMode="numeric"
        aria-label="Quantity"
      />

      <button
        type="button"
        onClick={handleIncrease}
        disabled={disabled || !canIncrease}
        className={[
          "inline-flex items-center justify-center text-slate-600 transition",
          sizeStyle.btn,
          disabled || !canIncrease
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "bg-white hover:bg-slate-50",
        ].join(" ")}
        aria-label="Increase quantity"
      >
        <FiPlus className={sizeStyle.icon} />
      </button>
    </div>
  );
}
