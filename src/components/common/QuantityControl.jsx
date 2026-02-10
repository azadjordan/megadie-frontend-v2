import { useEffect, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

const clampValue = (val, min, max) => {
  const next = Number(val);
  if (!Number.isFinite(next)) return min;
  const integer = Math.trunc(next);
  if (max != null && Number.isFinite(max)) {
    return Math.min(Math.max(integer, min), max);
  }
  return Math.max(integer, min);
};

export default function QuantityControl({
  quantity,
  setQuantity,
  min = 1,
  max,
  size = "md",
  compact = false,
  disabled = false,
  className = "",
}) {
  const numericQty = Number.isFinite(Number(quantity))
    ? Math.trunc(Number(quantity))
    : min;
  const clampedQty = clampValue(numericQty, min, max);
  const [draft, setDraft] = useState(String(clampedQty));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(clampedQty));
    }
  }, [clampedQty, isEditing]);

  const canDecrease = clampedQty > min;
  const canIncrease =
    max == null || !Number.isFinite(Number(max)) ? true : clampedQty < max;

  const sizes = {
    sm: {
      container: "h-9 rounded-lg",
      btn: "w-10",
      input: "text-xs px-2",
      inputCompact: "w-12 flex-none text-xs px-2",
      icon: "h-3.5 w-3.5",
    },
    md: {
      container: "h-11 rounded-xl",
      btn: "w-12",
      input: "text-sm px-3",
      inputCompact: "w-14 flex-none text-sm px-3",
      icon: "h-4 w-4",
    },
  };

  const sizeStyle = sizes[size] || sizes.md;
  const inputStyle = compact ? sizeStyle.inputCompact : sizeStyle.input;

  const handleDecrease = () => {
    if (disabled || !canDecrease) return;
    setIsEditing(false);
    setQuantity(clampValue(clampedQty - 1, min, max));
  };

  const handleIncrease = () => {
    if (disabled || !canIncrease) return;
    setIsEditing(false);
    setQuantity(clampValue(clampedQty + 1, min, max));
  };

  const handleChange = (event) => {
    if (disabled) return;
    const raw = event.target.value;
    const digits = raw.replace(/[^\d]/g, "");
    setDraft(digits);
    if (!digits) return;
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) return;
    setQuantity(clampValue(parsed, min, max));
  };

  const commitDraft = () => {
    if (!isEditing) return;
    if (disabled) {
      setIsEditing(false);
      return;
    }
    if (!draft) {
      setIsEditing(false);
      setQuantity(clampValue(min, min, max));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    setQuantity(clampValue(parsed, min, max));
  };

  return (
    <div
      className={[
        "inline-flex items-center overflow-hidden bg-white ring-1 ring-slate-300 shadow-sm transition",
        "focus-within:ring-2 focus-within:ring-violet-400/60",
        sizeStyle.container,
        disabled ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={disabled || !canDecrease}
        className={[
          "flex h-full items-center justify-center text-slate-600 transition",
          "active:scale-[0.98]",
          sizeStyle.btn,
          disabled || !canDecrease
            ? "cursor-default bg-slate-100 text-slate-400"
            : "cursor-pointer bg-white hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100",
        ].join(" ")}
        aria-label="Decrease quantity"
      >
        <FiMinus className={sizeStyle.icon} />
      </button>

      <input
        type="text"
        min={min}
        max={max}
        step={1}
        value={isEditing ? draft : String(clampedQty)}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        disabled={disabled}
        className={[
          "min-w-0 flex-1 text-center font-semibold text-slate-900 outline-none appearance-none",
          "border-x border-slate-300 bg-slate-50",
          "focus:bg-white",
          inputStyle,
          disabled ? "bg-slate-50 text-slate-400" : "",
        ].join(" ")}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Quantity"
      />

      <button
        type="button"
        onClick={handleIncrease}
        disabled={disabled || !canIncrease}
        className={[
          "flex h-full items-center justify-center text-slate-600 transition",
          "active:scale-[0.98]",
          sizeStyle.btn,
          disabled || !canIncrease
            ? "cursor-default bg-slate-100 text-slate-400"
            : "cursor-pointer bg-white hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100",
        ].join(" ")}
        aria-label="Increase quantity"
      >
        <FiPlus className={sizeStyle.icon} />
      </button>
    </div>
  );
}
