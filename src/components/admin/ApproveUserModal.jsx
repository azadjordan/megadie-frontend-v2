import ErrorMessage from "../common/ErrorMessage";

const MAX_ADMIN_NOTE_LENGTH = 2000;

function modalLabel(id) {
  return `approve-user-${id}`;
}

export default function ApproveUserModal({
  open,
  user,
  note,
  onNoteChange,
  onClose,
  onSubmit,
  isSaving,
  error,
}) {
  if (!open) return null;

  const userLabel = user?.name || user?.email || "this user";
  const noteValue = String(note || "");
  const remaining = MAX_ADMIN_NOTE_LENGTH - noteValue.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalLabel("title")}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id={modalLabel("title")}
              className="text-sm font-semibold text-slate-900"
            >
              Approve user
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Add an internal note for {userLabel}.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-4">
          <label
            htmlFor={modalLabel("note")}
            className="mb-1 block text-xs font-semibold text-slate-600"
          >
            Internal note
          </label>
          <textarea
            id={modalLabel("note")}
            rows={5}
            maxLength={MAX_ADMIN_NOTE_LENGTH}
            value={noteValue}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Referred by Sarah, verified by phone, approved for beta access..."
            className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
          <div className="mt-1 text-right text-[11px] text-slate-400">
            {remaining} characters left
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSaving}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                isSaving
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-500",
              ].join(" ")}
            >
              {isSaving ? "Approving..." : "Approve user"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Cancel
            </button>
          </div>

          {error ? (
            <div className="mt-3">
              <ErrorMessage error={error} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
