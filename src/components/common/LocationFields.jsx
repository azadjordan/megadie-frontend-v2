import { FiMapPin } from 'react-icons/fi';
import { locationChanged, locationOf, needsMapReview } from '../../utils/customerLocation';

export default function LocationFields({ value, onChange, disabled = false, baseLocations = [], confirmedMapLocation = false, onConfirmMap,
  customerLocation, saveDefault = false, onSaveDefault, onUseDefault, idPrefix = 'location' }) {
  const review = needsMapReview(baseLocations, value);
  const defaults = locationOf(customerLocation);
  const canUseDefault = customerLocation !== undefined && (defaults.address || defaults.googleMapsUrl) && locationChanged(defaults, value);
  let mapHref;
  try { const url = new URL(value.googleMapsUrl); if (url.protocol === 'https:' && !url.username && !url.password) mapHref = url.href; } catch { /* Invalid links are handled on save. */ }
  function change(field, next) { onConfirmMap?.(false); onChange(field, next); }
  const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 disabled:bg-slate-50';
  return <fieldset disabled={disabled} className="space-y-3">
    {canUseDefault && !disabled && <button type="button" onClick={() => { onConfirmMap?.(false); onUseDefault(); }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 underline underline-offset-4"><FiMapPin aria-hidden="true" />Use client’s default</button>}
    <div><label htmlFor={`${idPrefix}-address`} className="block text-sm text-slate-600">Address</label><textarea id={`${idPrefix}-address`} rows={2} maxLength={2000} value={value.address || ''} onChange={event => change('address', event.target.value)} className={inputClass} /></div>
    <div><label htmlFor={`${idPrefix}-map`} className="block text-sm text-slate-600">Google Maps location</label><input id={`${idPrefix}-map`} type="url" pattern="https://.*" maxLength={2048} placeholder="https://maps..." value={value.googleMapsUrl || ''} onChange={event => change('googleMapsUrl', event.target.value)} className={inputClass} /></div>
    {review && !disabled && <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
      <p>The address changed. Check that the map pin still matches.</p>
      <div className="flex flex-wrap gap-4">{mapHref && <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold underline"><FiMapPin aria-hidden="true" />Check map pin</a>}<button type="button" onClick={() => change('googleMapsUrl', '')} className="min-h-11 font-semibold underline">Clear map link</button></div>
      <label className="flex min-h-11 items-start gap-2"><input type="checkbox" required checked={confirmedMapLocation} onChange={event => onConfirmMap(event.target.checked)} className="mt-1" /><span>The map pin is correct for this address.</span></label>
    </div>}
    {onSaveDefault && !disabled && <label className="flex min-h-11 items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={saveDefault} onChange={event => { onConfirmMap?.(false); onSaveDefault(event.target.checked); }} className="mt-1" /><span>Also save this address and map for future orders<span className="mt-1 block text-xs text-slate-500">Existing orders keep their saved locations. Client contact details stay separate.</span></span></label>}
  </fieldset>;
}
