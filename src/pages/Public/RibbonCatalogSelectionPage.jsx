import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useGetCatalogEntryQuery } from '../../features/catalogs/catalogsApiSlice';
import { hasRibbonProductFilters, productTypeCatalogPath, ribbonCatalogLocation } from '../../utils/ribbonCatalogNavigation';
import ShopHeader from '../../components/shop/ShopHeader';

// Use server-provided filters already loaded by browsing. A direct/new-tab URL
// falls back to the protected API. Replace keeps browser Back on the catalog.
export default function RibbonCatalogSelectionPage({productType}) {
  const {catalogId, entryId} = useParams();
  const location = useLocation();
  const supportedType = productType === 'Ribbon';
  const catalogLocation = supportedType ? ribbonCatalogLocation(location.search) : {pathname:productTypeCatalogPath(productType), search:''};
  const candidate = location.state?.ribbonCatalogEntry;
  // Old preview history must be checked again through the published-only API.
  const cachedEntry = supportedType && candidate?.preview !== true && candidate?.catalogId === catalogId && candidate?._id === entryId && hasRibbonProductFilters(candidate) ? candidate : null;
  const entryQ = useGetCatalogEntryQuery({catalogId, entryId}, {skip:!supportedType || Boolean(cachedEntry), refetchOnMountOrArgChange:true});
  const entry = cachedEntry || entryQ.currentData;
  const filters = entry?.filters;

  if (!entry || entryQ.isError || !supportedType || !hasRibbonProductFilters(entry)) {
    const loading = supportedType && !entryQ.isError && !entry;
    const missing = entryQ.error?.status === 404;
    return <div className="space-y-6">
      <ShopHeader title={productType}
        breadcrumbs={[{label:'Home',to:'/'},{label:'Shop',to:'/shop'},{label:productType,to:catalogLocation},{label:'Options'}]}
        parent={{label:supportedType ? 'Ribbon colors' : `${productType} catalog`,to:catalogLocation}} />
      {loading ? <p role="status" className="text-sm text-slate-600">Loading ribbon options…</p> : <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
      <p role="alert" className="text-sm text-slate-600">{missing ? 'This color is no longer available in the catalog. Please choose another color.' : 'The ribbon options could not load. Please try again.'}</p>
      <div className="flex flex-wrap items-center gap-4">
        {supportedType && !missing && <button type="button" onClick={entryQ.refetch} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Try again</button>}
        <Link to={catalogLocation} className="rounded text-sm font-semibold text-violet-700 hover:underline focus-visible:ring-2 focus-visible:ring-violet-500">Back to catalog</Link>
      </div>
    </div>}
    </div>;
  }

  const params = new URLSearchParams({
    productType:filters.productType,
    categoryKeys:filters.categoryKeys,
    catalogCode:filters.catalogCode,
  });
  return <Navigate to={`/shop?${params}`} replace state={{ribbonCatalogSearch:catalogLocation.search, ribbonCatalogSelection:{code:entry.code,label:entry.label,materialKey:filters.categoryKeys,materialLabel:entry.material?.label}}} />;
}
