import { useEffect, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

const clampValue = (value, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  if (max != null && Number.isFinite(max)) {
    return Math.min(Math.max(numeric, min), max);
  }
  return Math.max(numeric, min);
};

export default function QuantityControlRequests({
  value,
  onIncrease,
  onDecrease,
  onChangeRaw,
  onCommit,
  min = 0,
  max,
  disableDecrease = false,
  maxHit = false,
  maxHitMessage = "Max available reached!",
}) {
  const [inputValue, setInputValue] = useState(String(value ?? ""));

  useEffect(() => {
    setInputValue(String(value ?? ""));
  }, [value]);

  const handleInputChange = (event) => {
    const next = event.target.value;
    setInputValue(next);
    if (onChangeRaw) {
      if (next === "") return;
      const parsed = Number(next);
      if (!Number.isFinite(parsed)) return;
      onChangeRaw(parsed);
    }
  };

  const commitValue = (raw) => {
    const resolved = clampValue(raw, min, max);
    setInputValue(String(resolved));
    if (onCommit) {
      onCommit(resolved);
    }
  };

  return (
    <span className="relative inline-flex items-center rounded-md border border-violet-300 bg-violet-50/40 text-violet-800">
      <span className="flex flex-col items-center overflow-hidden">
        <button
          type="button"
          onClick={onIncrease}
          className="flex h-6 w-6 items-center justify-center rounded-tl-md border border-violet-200 bg-violet-100 text-violet-700 transition hover:bg-violet-200 hover:shadow-[0_1px_0_rgba(109,40,217,0.15)] sm:h-5 sm:w-5"
          aria-label="Increase quantity"
        >
          <FiPlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDecrease}
          disabled={disableDecrease}
          className="flex h-6 w-6 items-center justify-center border border-violet-200 bg-violet-100 text-violet-700 transition hover:bg-violet-200 hover:shadow-[0_1px_0_rgba(109,40,217,0.15)] disabled:cursor-default disabled:opacity-30 sm:h-5 sm:w-5"
          aria-label="Decrease quantity"
        >
          <FiMinus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={(event) => {
          const raw = event.target.value === "" ? max ?? min : event.target.value;
          commitValue(raw);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            const raw = event.currentTarget.value === "" ? max ?? min : event.currentTarget.value;
            commitValue(raw);
          }
        }}
        className="w-9 bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
        inputMode="numeric"
        aria-label="Quantity"
      />
      {maxHit ? (
        <span className="pointer-events-none absolute top-1/2 right-full z-20 mr-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 shadow-sm ring-1 ring-amber-100">
          {maxHitMessage}
        </span>
      ) : null}
    </span>
  );
}
