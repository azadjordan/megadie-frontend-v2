import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReviewPackingStockReportMutation } from '../../features/packing/packingApiSlice';
import { needsPackingRefresh, packingDate, packingError, packingSecondary } from '../../utils/packing';

export default function AdminPackingStockReports({ orderId, task, onRefresh, refreshing, offline }) {
  const reports = task.reports || [];
  const pending = reports.filter(report => !report.checkedAt).length;
  const [expanded, setExpanded] = useState(() => pending > 0 || window.location.hash === '#stock-reports');
  const section = useRef(null);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [confirmedVersion, setConfirmedVersion] = useState(0);
  const writing = useRef(false);
  const [review, { isLoading: saving }] = useReviewPackingStockReportMutation();
  const blocked = saving || uncertain || offline || (task.reportsVersion || 0) < confirmedVersion;
  useEffect(() => {
    if (window.location.hash !== '#stock-reports') return;
    const frame = requestAnimationFrame(() => section.current?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function change(report) {
    if (writing.current || blocked) return;
    writing.current = true; setPendingId(report._id); setError('');
    try {
      const result = await review({ orderId, reportId: report._id, checked: !report.checkedAt, expectedReportsVersion: task.reportsVersion || 0 }).unwrap();
      setConfirmedVersion(result.data.reportsVersion);
    } catch (err) {
      setError(packingError(err));
      if (needsPackingRefresh(err)) setUncertain(true);
      if ([403, 404].includes(err.status)) void onRefresh().catch(() => {});
    } finally { writing.current = false; setPendingId(null); }
  }
  async function reload() {
    try { await onRefresh(); setUncertain(false); setError(''); }
    catch (err) { setError(packingError(err)); }
  }
  return <details ref={section} id="stock-reports" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)} className="scroll-mt-8 rounded-xl border border-slate-200 bg-white px-4 py-2">
    <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold"><span>Stock reports ({reports.length})</span>{pending > 0 && <span className="ml-2 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">{pending} needs checking</span>}</summary>
    {error && <p role="alert" className="my-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {uncertain && <div className="mb-3 text-sm text-amber-950"><p>Load the latest reports before another change.</p><button type="button" className={packingSecondary + ' mt-2'} disabled={saving || refreshing} onClick={reload}>{refreshing ? 'Loading…' : 'Load latest reports'}</button></div>}
    {reports.length ? <>
      <p className="border-t border-slate-100 py-3 text-xs text-slate-500">Mark checked after investigating the slot and completing any required stock correction. This records your review; stock quantities and picking progress stay separate.</p>
      <ul className="divide-y divide-slate-100 text-sm">{reports.map(report => <li key={report._id} aria-label={'Stock report ' + report.sku + ' at ' + report.slotLabel} className="space-y-2 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><p className="break-words font-semibold">{report.sku} · <Link to={'/admin/inventory/slots/' + report.slot} className="text-indigo-700 underline">{report.slotLabel}</Link></p><span className={'rounded-md px-2 py-1 text-xs font-semibold ' + (report.checkedAt ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>{report.checkedAt ? 'Checked' : 'Stock check needed'}</span></div>
        <p>Picked {report.pickedQty} of {report.requestedQty}; {report.shortQty} missing.</p>
        <p className="text-xs text-slate-500">{report.byName} · {packingDate(report.at)}</p>
        {report.note && <p className="whitespace-pre-wrap text-slate-600">{report.note}</p>}
        {report.checkedAt && <p className="text-xs text-emerald-800">Checked by {report.checkedByName || 'an admin'} · {packingDate(report.checkedAt)}</p>}
        <button type="button" className={packingSecondary} disabled={blocked} onClick={() => change(report)}>{pendingId === report._id ? 'Saving…' : report.checkedAt ? 'Reopen check' : 'Mark checked'}</button>
      </li>)}</ul>
    </> : <p className="pb-4 text-sm text-slate-500">No stock problems have been reported.</p>}
  </details>;
}
