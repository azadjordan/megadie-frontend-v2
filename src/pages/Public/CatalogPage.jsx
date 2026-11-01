import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { FiSearch, FiX, FiImage } from 'react-icons/fi';
import { useGetCatalogQuery, useGetCatalogEntriesQuery, useGetCatalogAvailabilityQuery } from '../../features/catalogs/catalogsApiSlice';
import { AVAILABILITY_QUERY_OPTIONS } from '../../features/products/availabilityQueryOptions';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { hasRibbonProductFilters, ribbonCatalogLocation } from '../../utils/ribbonCatalogNavigation';
import useShopScrollRestoration from '../../hooks/useShopScrollRestoration';
import ShopHeader from '../../components/shop/ShopHeader';
import RibbonCatalogSelectionPage from './RibbonCatalogSelectionPage';

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-7';
const EMPTY_ENTRIES = [];
const BUTTON = 'min-h-11 min-w-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:px-4';
const positivePage = value => /^[1-9]\d*$/.test(value || '') && Number.isSafeInteger(Number(value) * 49) ? Number(value) : 1;

function ColorTile({entry, to, state, priority, availability}) {
  const [failed, setFailed] = useState(false);
  const badgeId = `catalog-stock-${entry._id}`;
  const inStock = availability?.inStock === true;
  const badgeLabel = inStock ? 'In stock' : availability?.noStock === true ? 'No stock' : null;
  return (
    <Link to={to} state={state} className="group block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4" aria-label={`View ribbons in ${entry.code} ${entry.label}`} aria-describedby={badgeLabel ? badgeId : undefined}>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/70 transition group-hover:ring-2 group-hover:ring-violet-400">
        {failed ? (
          <span className="flex flex-col items-center gap-2 px-2 text-center text-xs text-slate-500"><FiImage aria-hidden="true" className="h-6 w-6" />Image unavailable</span>
        ) : (
          <img src={entry.imageUrl} alt="" width="256" height="256" loading={priority ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        )}
        {badgeLabel && <span id={badgeId} className={`absolute top-2 left-2 rounded-full px-2 py-1 text-[11px] font-medium leading-none ring-1 ring-inset ${inStock ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>{badgeLabel}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs tabular-nums tracking-wide text-slate-500">{entry.code}</span>
        <h3 className="break-words text-sm font-semibold leading-snug text-slate-800 group-hover:text-violet-700">{entry.label}</h3>
      </div>
    </Link>
  );
}

function Retry({message, onRetry}) {
  return <div role="alert" className="space-y-3 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><p className="text-sm text-slate-600">{message}</p><button type="button" className={BUTTON} onClick={onRetry}>Try again</button></div>;
}

function ViewAllProductsLink({search, productType = 'Ribbon'}) {
  const state = productType === 'Ribbon'
    ? {ribbonCatalogSearch:ribbonCatalogLocation(search).search}
    : undefined;
  return <Link to={`/shop?${new URLSearchParams({productType})}`} state={state} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">View All</Link>;
}

function Pages({pages, page, onChange, label}) {
  if (!pages?.length || pages.length < 2) return null;
  const previous = pages.filter(p => p < page).at(-1);
  const next = pages.find(p => p > page);
  return <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
    <button type="button" aria-label="Previous page" disabled={!previous} className={`${BUTTON} disabled:opacity-40`} onClick={() => onChange(previous)}>‹</button>
    {pages.map(p => <button key={p} type="button" aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)} className={`${BUTTON} ${p === page ? '!border-violet-200 !bg-violet-100 !text-violet-800' : 'hover:bg-violet-50'}`}>{p}</button>)}
    <button type="button" aria-label="Next page" disabled={!next} className={`${BUTTON} disabled:opacity-40`} onClick={() => onChange(next)}>›</button>
  </nav>;
}

function RibbonCatalogContent({catalog}) {
  const [params, setParams] = useSearchParams();
  const contentRef = useRef(null);
  const materials = catalog.materials || [];
  const material = params.get('material') || materials[0]?.key || '';
  const selectedMaterial = materials.find(m => m.key === material);
  const rawSearch = params.get('q') || '';
  const q = rawSearch.trim();
  const debounced = useDebouncedValue(q, 250);
  // Keep the browse page in the URL while searching so clearing restores it.
  const page = positivePage(params.get(q ? 'searchPage' : 'page'));
  const entriesQ = useGetCatalogEntriesQuery({catalogId:catalog._id,material,page,q:debounced}, {
    skip: !selectedMaterial || q !== debounced || q.length > 100,
  });
  const response = q === debounced ? entriesQ.currentData : undefined;
  const loading = q !== debounced || (!response && entriesQ.isFetching);
  const entries = response?.data || EMPTY_ENTRIES;
  const pagination = response?.pagination;
  const entryIds = useMemo(() => entries.map(entry => String(entry._id)).sort(), [entries]);
  const availabilityQ = useGetCatalogAvailabilityQuery({catalogId:catalog._id, entryIds}, {
    ...AVAILABILITY_QUERY_OPTIONS,
    skip: loading || entryIds.length === 0,
  });
  const availabilityByEntryId = useMemo(() => new Map(
    (availabilityQ.isError ? [] : availabilityQ.currentData?.data || [])
      .map(row => [String(row.entryId), row])
  ), [availabilityQ.currentData, availabilityQ.isError]);
  useShopScrollRestoration(Boolean(response) || entriesQ.isError || !selectedMaterial || q.length > 100);
  const update = (values, replace = false) => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [key,value] of Object.entries(values)) {
      if (value === null || value === '') next.delete(key); else next.set(key,String(value));
    }
    return next;
  }, {replace});
  const changePage = next => {
    update({[q ? 'searchPage' : 'page']:next});
    contentRef.current?.scrollIntoView({block:'start'});
  };
  const clearSearch = () => update({q:null,searchPage:null},true);
  const catalogLocation = ribbonCatalogLocation(params.toString());

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Ribbon material" className="inline-flex w-48 max-w-full shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-px">
        {materials.map(m => <button type="button" key={m._id} aria-pressed={material === m.key} onClick={() => update({material:m.key,page:1,q:null,searchPage:null})} className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${material === m.key ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-50'}`}>
          {m.label}
        </button>)}
      </div>
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-[1_1_24rem]">
        <div className="relative min-w-0 flex-1 sm:max-w-80">
          <label htmlFor="catalog-search" className="sr-only">Search by color name or code</label>
          <FiSearch aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="catalog-search" type="search" maxLength={100} autoComplete="off" value={rawSearch} placeholder="Search colors or code" onChange={e => update({q:e.target.value,searchPage:null},true)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-800 outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 [&::-webkit-search-cancel-button]:appearance-none" />
          {rawSearch && <button type="button" aria-label="Clear search" onClick={clearSearch} className="absolute right-0 top-0 inline-flex h-12 w-12 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500"><FiX /></button>}
        </div>
        <ViewAllProductsLink search={catalogLocation.search} />
      </div>
    </div>
    <section ref={contentRef} className="space-y-4 border-t border-slate-200/80 pt-4" style={{scrollMarginTop:'calc(var(--app-header-h, 64px) + 16px)'}} aria-label="Catalog colors" aria-busy={loading}>
      {!selectedMaterial ? <div className="rounded-xl bg-white p-5 text-sm text-slate-600">{materials.length ? 'Choose a material above to browse its colors.' : 'This catalog has no materials to display yet.'}</div>
      : q.length > 100 ? <p role="alert" className="text-sm text-slate-600">Please search with 100 characters or fewer.</p>
      : entriesQ.isError && q === debounced ? <Retry message="The colors could not load. Please try again." onRetry={entriesQ.refetch} />
      : <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="sr-only">{selectedMaterial.label} colors</h2>
            <p role="status" className="text-sm text-slate-500">{loading ? 'Loading colors…' : q ? `${pagination?.total || 0} matching colors` : `${pagination?.total || 0} colors`}</p>
            <span id="catalog-stock-note" className="text-xs text-slate-500">Stock varies by width and grade.</span>
          </div>
          {!loading && <Pages pages={pagination?.pages} page={page} onChange={changePage} label="Catalog pages" />}
        </div>
        {loading ? <div className={GRID} aria-hidden="true">{Array.from({length:14},(_,i)=><div key={i} className="space-y-3"><div className="aspect-square animate-pulse rounded-xl bg-slate-200/60" /><div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/60" /></div>)}</div>
        : entries.length ? <div className={GRID}>{entries.map((entry, index) => <ColorTile key={entry._id} entry={entry} availability={availabilityByEntryId.get(String(entry._id))} priority={index < 2} to={{pathname:`${catalogLocation.pathname}/${catalog._id}/${entry._id}`,search:catalogLocation.search}} state={hasRibbonProductFilters(entry) ? {ribbonCatalogEntry:{...entry,catalogId:catalog._id,material:selectedMaterial}} : undefined} />)}</div>
        : <div className="space-y-3 rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200"><p className="text-slate-600">{q ? 'No colors match your search.' : 'No colors on this page.'}</p><button type="button" className={BUTTON} onClick={q ? clearSearch : () => changePage(pagination?.pages[0] || 1)}>{q ? 'Clear search' : 'Go to first page'}</button></div>}
        {!loading && <Pages pages={pagination?.pages} page={page} onChange={changePage} label="Catalog pages bottom" />}
      </>}
    </section>
  </div>;
}

function CatalogBrowsePage({productType}) {
  const location = useLocation();
  const catalogQ = useGetCatalogQuery({productType});
  const catalog = catalogQ.currentData;
  const supported = catalog?.productType === 'Ribbon' && catalog?.layout === 'color-grid';
  // A missing/unsupported published catalog is a normal direct-to-products
  // route. Replace avoids sending browser Back through this lookup again.
  if (catalogQ.isSuccess && catalog !== undefined && !supported) {
    return <Navigate to={`/shop?${new URLSearchParams({productType})}`} replace />;
  }
  return <div className="space-y-5">
    <ShopHeader title={productType}
      breadcrumbs={[{label:'Home',to:'/'},{label:'Shop',to:'/shop'},{label:productType}]}
      parent={{label:'Product types',to:'/shop'}} />
    {catalogQ.isLoading || (!catalog && catalogQ.isFetching) ? <p role="status" className="text-sm text-slate-500">Loading catalog…</p>
    : catalogQ.isError ? <Retry message="The catalog could not load. Please try again." onRetry={catalogQ.refetch} />
    : !supported ? <p className="rounded-xl bg-white p-6 text-slate-600">No {productType} catalog is available.</p>
    : <RibbonCatalogContent key={catalog._id} catalog={catalog} />}
    {catalogQ.isError && <ViewAllProductsLink search={location.search} productType={productType} />}
  </div>;
}

// Browse and selection share one lazy-loaded bundle. Normal selections reuse
// filters from the catalog response; direct/new-tab links resolve on the API.
export default function CatalogPage() {
  const {entryId, productType = 'Ribbon'} = useParams();
  return entryId
    ? <RibbonCatalogSelectionPage productType={productType} />
    : <CatalogBrowsePage key={productType} productType={productType} />;
}
