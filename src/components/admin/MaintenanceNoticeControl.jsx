import { useState } from "react";
import { NOTICE_MESSAGE, noticeQueryOptions, useGetAdminMaintenanceNoticeQuery, useSetMaintenanceNoticeMutation } from "../../features/siteSettings/siteSettingsApiSlice";

export default function MaintenanceNoticeControl() {
  const { data, isFetching, isError, refetch } = useGetAdminMaintenanceNoticeQuery(undefined, noticeQueryOptions);
  const [save, { isLoading }] = useSetMaintenanceNoticeMutation();
  const [saveError, setSaveError] = useState("");
  const [feedback, setFeedback] = useState("");
  const enabled = data?.enabled === true;

  const toggle = async () => {
    setSaveError("");
    setFeedback("");
    try {
      const result = await save(!enabled).unwrap();
      setFeedback(result.enabled ? "Notice shown. Open customer pages update within about 30 seconds." : "Notice hidden. Open customer pages update within about 30 seconds.");
    } catch {
      setSaveError("Couldn’t confirm the change. Check the current status before trying again.");
    }
  };

  const status = isError ? "Unavailable" : !data ? "Loading…" : enabled ? "Visible" : "Hidden";
  return (
    <section aria-labelledby="maintenance-notice-title" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="maintenance-notice-title" className="text-sm font-semibold text-slate-900">Maintenance notice</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled && !isError ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>{status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Show a temporary notice to customers. Browsing and ordering remain available.</p>
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{data?.message || NOTICE_MESSAGE}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={toggle} disabled={!data || isError || isLoading || isFetching}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {isLoading ? "Saving…" : enabled ? "Hide notice" : "Show notice"}
        </button>
        {data?.updatedAt && <p className="text-xs text-slate-500">Updated by {data.updatedBy || "an administrator"} · {new Date(data.updatedAt).toLocaleString()}</p>}
      </div>
      {isError && <p role="alert" className="mt-3 text-sm text-rose-700">Couldn’t load the notice status. <button type="button" onClick={refetch} className="font-semibold underline">Retry</button></p>}
      {saveError && <p role="alert" className="mt-3 text-sm text-rose-700">{saveError}</p>}
      <p role="status" className="mt-2 text-xs text-slate-600">{feedback}</p>
    </section>
  );
}
