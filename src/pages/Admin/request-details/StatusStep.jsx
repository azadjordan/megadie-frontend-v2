import StepCard from "./StepCard";
import ErrorMessage from "../../../components/common/ErrorMessage";

function StatusChoiceButton({ disabled, tone, onClick, children, selected }) {
  const tones = {
    slate: {
      idle: "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100",
      selected:
        "bg-slate-100 text-slate-700 ring-2 ring-slate-400 shadow-sm",
    },
    violet: {
      idle: "bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100",
      selected:
        "bg-violet-100 text-violet-800 ring-2 ring-violet-400 shadow-sm",
    },
    emerald: {
      idle: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
      selected:
        "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400 shadow-sm",
    },
    rose: {
      idle: "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100",
      selected:
        "bg-rose-100 text-rose-800 ring-2 ring-rose-400 shadow-sm",
    },
  };
  const toneStyles = tones[tone] || tones.slate;
  const appliedTone = selected && toneStyles.selected ? toneStyles.selected : toneStyles.idle;
  const disabledStyles = disabled
    ? selected
      ? "cursor-default pointer-events-none"
      : "cursor-default opacity-60 pointer-events-none"
    : "";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "w-full rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-inset transition sm:py-3.5",
        appliedTone,
        disabledStyles,
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={[
            "inline-flex h-4 w-4 items-center justify-center rounded-full border",
            selected ? "border-current bg-white/80" : "border-transparent",
          ].join(" ")}
        >
          {selected ? (
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l4 4L19 8" />
            </svg>
          ) : null}
        </span>
        <span>{children}</span>
      </span>
    </button>
  );
}

export default function StatusStep({
  quoteLocked,
  showAvailability,
  canSetQuoted,
  canSetConfirmed,
  onUpdateStatus,
  isBusy,
  isUpdating,
  showUpdateError,
  updateError,
  currentStatus,
}) {
  const handleSelect = (nextStatus) => {
    if (quoteLocked || isBusy) return;
    if (nextStatus === currentStatus) return;
    onUpdateStatus(nextStatus);
  };

  return (
    <StepCard
      n={6}
      title="Final Decision"
      subtitle="Select a decision to update it immediately."
      showNumber={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatusChoiceButton
            disabled={
              quoteLocked || isBusy || currentStatus === "Processing"
            }
            tone="slate"
            selected={currentStatus === "Processing"}
            onClick={() => handleSelect("Processing")}
          >
            Keep Processing
          </StatusChoiceButton>

          <StatusChoiceButton
            disabled={
              quoteLocked ||
              isBusy ||
              !canSetQuoted ||
              currentStatus === "Quoted"
            }
            tone="violet"
            selected={currentStatus === "Quoted"}
            onClick={() => handleSelect("Quoted")}
          >
            Send Prices
          </StatusChoiceButton>

          <StatusChoiceButton
            disabled={
              quoteLocked ||
              isBusy ||
              !canSetConfirmed ||
              currentStatus === "Confirmed"
            }
            tone="emerald"
            selected={currentStatus === "Confirmed"}
            onClick={() => handleSelect("Confirmed")}
          >
            Mark Confirmed
          </StatusChoiceButton>

          <StatusChoiceButton
            disabled={
              quoteLocked || isBusy || currentStatus === "Cancelled"
            }
            tone="rose"
            selected={currentStatus === "Cancelled"}
            onClick={() => handleSelect("Cancelled")}
          >
            Cancel Quote
          </StatusChoiceButton>
        </div>

        {isUpdating ? (
          <div className="text-xs text-slate-500">Updating status...</div>
        ) : null}

        {showAvailability && !canSetQuoted ? (
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <div className="text-xs font-semibold text-amber-800">
              Quoted is blocked
            </div>
            <div className="mt-1 text-xs text-amber-800/80">
              At least one item must be available. Recheck availability first.
            </div>
          </div>
        ) : null}

        {showAvailability && !canSetConfirmed ? (
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <div className="text-xs font-semibold text-amber-800">
              Confirmed is blocked
            </div>
            <div className="mt-1 text-xs text-amber-800/80">
              Cannot confirm while there is a shortage. Please confirm or update
              quantities.
            </div>
          </div>
        ) : null}
      </div>

      {showUpdateError ? (
        <div className="mt-3">
          <ErrorMessage error={updateError} />
        </div>
      ) : null}
    </StepCard>
  );
}
