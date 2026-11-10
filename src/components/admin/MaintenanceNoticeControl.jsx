import { useState } from "react";
import { NOTICE_MESSAGE, NOTICE_MESSAGE_MAX_LENGTH, noticeQueryOptions, useGetAdminMaintenanceNoticeQuery, useSetMaintenanceNoticeMutation } from "../../features/siteSettings/siteSettingsApiSlice";

export default function MaintenanceNoticeControl() {
  const { data, isFetching, isError, refetch } = useGetAdminMaintenanceNoticeQuery(undefined, noticeQueryOptions);
  const [save, { isLoading }] = useSetMaintenanceNoticeMutation();
  const [isRefreshingAfterSave, setIsRefreshingAfterSave] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [feedback, setFeedback] = useState("");
  const enabled = data?.enabled === true;
  const savedMessage = data?.message || NOTICE_MESSAGE;
  const value = draft ?? savedMessage;
  const message = value.replace(/\s+/gu, " ").trim();
  const dirty = message !== savedMessage;
  const validation = !message ? "Enter a notice message." : message.length > NOTICE_MESSAGE_MAX_LENGTH ? `Use ${NOTICE_MESSAGE_MAX_LENGTH} characters or fewer.` : "";
  const busy = isLoading || isRefreshingAfterSave;
  const locked = !data || isError || busy || isFetching;

  const edit = (next) => { setDraft(next); setSaveError(""); setFeedback(""); };
  const saveChanges = async (changes) => {
    if (locked || (Object.hasOwn(changes, "message") && validation)) return;
    setSaveError("");
    setFeedback("");
    setIsRefreshingAfterSave(true);
    try {
      const result = await save(changes).unwrap();
      if (Object.hasOwn(changes, "message")) setDraft(result.message);
      let refreshed = true;
      try {
        const latest = await refetch().unwrap();
        if (Object.hasOwn(changes, "message") && latest.message === result.message) setDraft(null);
      } catch { refreshed = false; }
      const action = changes.enabled === false ? "Notice hidden. The saved message is kept for next time."
        : changes.enabled === true ? "Notice shown."
        : result.enabled ? "Visible notice message updated." : "Message saved. The notice is still hidden.";
      setFeedback(`${action}${result.enabled || changes.enabled === false ? " Open customer pages update within about 30 seconds." : ""}${refreshed ? "" : " Couldn’t refresh the current status; refresh it before making another change."}`);
    } catch (error) {
      setSaveError(error?.status === 400 ? error.data?.message || "Check the notice message." : "Couldn’t confirm the change. Your text is still here. Check the current status before trying again.");
    } finally { setIsRefreshingAfterSave(false); }
  };

  const status = isError ? "Unavailable" : !data ? "Loading…" : enabled ? "Visible" : "Hidden";
  return (
    <section aria-labelledby="maintenance-notice-title" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="maintenance-notice-title" className="text-sm font-semibold text-slate-900">Maintenance notice</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled && !isError ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>{status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Write a temporary notice for customers. Browsing and ordering remain available.</p>
      <div className="mt-4">
        <label htmlFor="maintenance-notice-message" className="block text-sm font-semibold text-slate-700">Notice message</label>
        <textarea
          id="maintenance-notice-message" rows={3} value={value} maxLength={NOTICE_MESSAGE_MAX_LENGTH}
          disabled={!data || isError || busy}
          onChange={(event) => edit(event.target.value)}
          aria-invalid={draft !== null && Boolean(validation)}
          aria-describedby="maintenance-notice-help maintenance-notice-count maintenance-notice-validation"
          className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <p id="maintenance-notice-help">{enabled ? "Saving changes updates the message customers currently see." : "Save a message for later, or show it now."}</p>
          <span id="maintenance-notice-count" className="tabular-nums">{value.length}/{NOTICE_MESSAGE_MAX_LENGTH}</span>
        </div>
        <p id="maintenance-notice-validation" className="mt-1 text-xs text-rose-700">{draft !== null ? validation : ""}</p>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-500">Preview</p>
        <div aria-label="Notice preview" className="mt-1 break-words rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{message || "Enter a message to preview it."}</div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={() => void saveChanges(enabled ? { enabled: false } : { enabled: true, message })} disabled={locked || (!enabled && Boolean(validation))}
          className="min-h-10 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {busy ? "Saving…" : enabled ? "Hide notice" : "Show notice"}
        </button>
        <button type="button" onClick={() => void saveChanges({ message })} disabled={locked || !dirty || Boolean(validation)}
          className="min-h-10 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {enabled ? "Update visible message" : "Save message"}
        </button>
        {dirty && <button type="button" onClick={() => edit(null)} disabled={busy} className="min-h-10 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Discard changes</button>}
        {value !== NOTICE_MESSAGE && <button type="button" onClick={() => edit(NOTICE_MESSAGE)} disabled={!data || isError || busy} className="min-h-10 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Use default text</button>}
      </div>
      {data?.updatedAt && <p className="mt-3 text-xs text-slate-500">Updated by {data.updatedBy || "an administrator"} · {new Date(data.updatedAt).toLocaleString()}</p>}
      {isError && <p role="alert" className="mt-3 text-sm text-rose-700">Couldn’t load the notice status. <button type="button" onClick={() => void refetch()} className="font-semibold underline">Retry</button></p>}
      {saveError && <p role="alert" className="mt-3 text-sm text-rose-700">{saveError} <button type="button" onClick={() => void refetch()} disabled={isFetching} className="font-semibold underline">Refresh status</button></p>}
      <p role="status" className="mt-2 text-xs text-slate-600">{feedback}</p>
    </section>
  );
}
