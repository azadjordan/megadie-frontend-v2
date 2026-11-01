// src/pages/Public/ShopPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { FaFilter } from "react-icons/fa";

import { useGetProductsQuery } from "../../features/products/productsApiSlice";
import { useGetFilterConfigsQuery } from "../../features/filters/filterConfigsApiSlice";
import { useGetCategoriesQuery } from "../../features/categories/categoriesApiSlice";

import ErrorMessage from "../../components/common/ErrorMessage";
import ProductCard from "../../components/common/ProductCard";
import Pagination from "../../components/common/Pagination";
import ShopFilters from "../../components/shop/ShopFilters";
import ShopEntrance from "../../components/shop/ShopEntrance";
import ShopHeader from "../../components/shop/ShopHeader";

import useShopQueryState from "../../hooks/useShopQueryState";
import useShopScrollRestoration from "../../hooks/useShopScrollRestoration";
import useProductAvailability from "../../hooks/useProductAvailability";
import { ribbonCatalogLocation } from "../../utils/ribbonCatalogNavigation";

const DEFAULT_PRODUCT_TYPE = "Ribbon";
const PAGE_LIMIT = 16;
const EMPTY_ARRAY = [];
const SKELETON_CARD_COUNT = 8;

function ProductCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200/80"
    >
      <div className="h-40 w-full animate-pulse bg-slate-100" />

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-3">
        <div className="space-y-2">
          <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3.5 w-7/12 animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="mt-1 flex flex-wrap gap-1.5">
          <div className="h-5 w-14 animate-pulse rounded-full bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2 lg:flex-row lg:items-center">
          <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100 lg:w-24" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100 lg:w-24" />
        </div>
      </div>
    </article>
  );
}

function ProductGridSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
      <span className="sr-only">Loading products</span>
    </div>
  );
}

function FilterPanelSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-5 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-3.5 w-16 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-12 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="space-y-3">
        <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-9 w-10/12 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-9 w-11/12 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [params] = useSearchParams();
  const configsQ = useGetFilterConfigsQuery();
  const filterConfigs = configsQ.data ?? EMPTY_ARRAY;
  const productTypes = filterConfigs.map((config) => config.productType);
  // Preserve old Ribbon filter links that omitted the default product type.
  const hasLegacyFilters = ["categoryKeys", "categoryIds", "categoryId", "size", "sizes", "catalogCode"]
    .some((key) => params.has(key));
  const selectedType = params.get("productType") || (hasLegacyFilters ? DEFAULT_PRODUCT_TYPE : "");

  if (configsQ.isLoading) {
    return <div role="status" className="py-8 text-slate-600">Loading shop...</div>;
  }
  if (configsQ.isError) {
    return (
      <div className="space-y-4">
        <ErrorMessage message="The shop could not load. Please try again." />
        <button type="button" onClick={() => configsQ.refetch()} className="rounded-xl bg-violet-600 px-4 py-2 text-white">Try again</button>
      </div>
    );
  }
  if (!selectedType || !productTypes.includes(selectedType)) {
    return <ShopEntrance productTypes={productTypes} notice={selectedType ? "That product type is unavailable. Please choose another." : undefined} />;
  }
  return <ShopProducts key={selectedType} configsQ={configsQ} />;
}

function ShopProducts({ configsQ }) {
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    productType,
    filters,
    toggleFilterValue,
    clearAllFilters,
    setPage,
    productsQueryParams,
  } = useShopQueryState({
    defaultProductType: DEFAULT_PRODUCT_TYPE,
    defaultLimit: PAGE_LIMIT,
  });
  const resultsRef = useRef(null);
  const filterDialogRef = useRef(null);
  const filterCloseRef = useRef(null);
  const singleCode = filters.catalogCode?.length === 1 ? filters.catalogCode[0] : null;
  const singleMaterial = filters.categoryKeys?.length === 1 ? filters.categoryKeys[0] : null;
  const fromCatalog = typeof location.state?.ribbonCatalogSearch === "string";
  const catalogReturn = productType === "Ribbon" && fromCatalog
    ? ribbonCatalogLocation(location.state.ribbonCatalogSearch)
    : null;
  const savedSelection = location.state?.ribbonCatalogSelection;
  const selectedColor = productType === "Ribbon" && singleCode &&
    savedSelection?.code === singleCode && savedSelection?.materialKey === singleMaterial
    ? savedSelection : null;
  const title = singleCode ? selectedColor?.label ? `${singleCode} · ${selectedColor.label}` : `Code ${singleCode}` : productType;
  const breadcrumbs = [{label:'Home',to:'/'}, {label:'Shop',to:'/shop'},
    ...(catalogReturn ? [{label:'Ribbon',to:catalogReturn}, {label:singleCode ? title : 'Products'}] : [{label:productType}])];

  // 1) Filter configs
  const filterConfigs = configsQ.data ?? EMPTY_ARRAY;

  const activeFilterConfig = useMemo(
    () => filterConfigs.find((c) => c.productType === productType) || null,
    [filterConfigs, productType]
  );

  // 2) Categories only if config uses categoryKeys
  const needsCategories = !!activeFilterConfig?.fields?.some(
    (f) => f.key === "categoryKeys"
  );

  const categoriesQ = useGetCategoriesQuery(
    needsCategories
      ? { productType, isActive: true, limit: 200, page: 1 }
      : undefined,
    { skip: !needsCategories }
  );

  const categories = categoriesQ.data ?? EMPTY_ARRAY;

  // Map category key -> label (and only for allowed values if provided)
  const categoryLabelByKey = useMemo(() => {
    if (!needsCategories) return {};

    const allowed =
      activeFilterConfig?.fields?.find((f) => f.key === "categoryKeys")
        ?.allowedValues ?? [];
    const allowedSet = new Set(allowed);

    const map = {};
    for (const c of categories) {
      if (!c?.key) continue;
      if (allowedSet.size && !allowedSet.has(c.key)) continue;
      map[c.key] = c.label || c.key;
    }
    return map;
  }, [needsCategories, categories, activeFilterConfig]);
  const materialLabel = selectedColor?.materialLabel || categoryLabelByKey[singleMaterial];
  const description = materialLabel
    ? `${materialLabel}${productType === 'Ribbon' ? ' ribbon' : ` · ${productType}`}`
    : singleCode ? productType : undefined;

  // 3) Products
  const productsQ = useGetProductsQuery({
    ...productsQueryParams,
    featuredFirst: true,
    includeAvailability: false,
  });

  const rawProducts = productsQ.currentData?.products ?? EMPTY_ARRAY;
  const pagination = productsQ.currentData?.pagination ?? null;
  const loadingProducts = productsQ.isLoading || (!productsQ.currentData && productsQ.isFetching);
  const hasMultiplePages = Number(pagination?.totalPages) > 1;
  const productIds = useMemo(
    () =>
      rawProducts
        .map((product) => product?._id || product?.id)
        .filter(Boolean)
        .map(String),
    [rawProducts]
  );
  const { availabilityByProductId } = useProductAvailability(productIds);
  const products = useMemo(
    () =>
      rawProducts.map((product) => {
        const productId = String(product?._id || product?.id || "");
        const availabilityRow = productId
          ? availabilityByProductId.get(productId)
          : null;

        if (!availabilityRow) {
          return { ...product, availability: null };
        }

        return {
          ...product,
          isAvailable: availabilityRow.isAvailable,
          availability: availabilityRow.availability,
        };
      }),
    [rawProducts, availabilityByProductId]
  );

  useShopScrollRestoration(Boolean(productsQ.currentData) || productsQ.isError);

  const hasActiveFilters =
    Object.values(filters || {}).some((arr) => Array.isArray(arr) && arr.length);
  const activeFilterCount = useMemo(
    () =>
      Object.values(filters || {}).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      ),
    [filters]
  );

  const showingText = useMemo(() => {
    if (!pagination) {
      const n = products.length;
      return `${n} option${n !== 1 ? 's' : ''}`;
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? productsQueryParams?.limit ?? PAGE_LIMIT;
    const total = pagination.total ?? 0;

    if (total === 0) return '0 options';
    if (products.length === 0) return `0 of ${total} options`;
    if (total <= limit) return `${total} option${total !== 1 ? 's' : ''}`;

    const start = (page - 1) * limit + 1;
    const end = Math.min(start + products.length - 1, total);
    return `${start}–${end} of ${total} options`;
  }, [pagination, products.length, productsQueryParams?.limit]);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    requestAnimationFrame(() => {
      const node = resultsRef.current;
      if (!node) return;

      const styles = window.getComputedStyle(document.documentElement);
      const headerHeight =
        parseFloat(styles.getPropertyValue("--app-header-h")) || 64;
      const top =
        node.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    });
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const opener = document.activeElement;
    filterCloseRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
      if (event.key !== "Tab") return;
      const controls = filterDialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]');
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [filtersOpen]);

  const renderFilterNotice = (message) => (
    <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );

  const renderFilterControls = () => {
    if (configsQ.isLoading) {
      return <FilterPanelSkeleton />;
    }

    if (configsQ.isError) {
      return renderFilterNotice("Filters could not load.");
    }

    return (
      <>
        {activeFilterConfig ? (
          <ShopFilters
            config={activeFilterConfig}
            selectedFilters={filters}
            onToggle={toggleFilterValue}
            valueLabelMaps={{ categoryKeys: categoryLabelByKey }}
            onClearAll={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
          />
        ) : (
          renderFilterNotice("No filters available.")
        )}

        {needsCategories && categoriesQ.isError
          ? renderFilterNotice("Some category labels could not load.")
          : null}
      </>
    );
  };

  return (
    <div className="space-y-3">
      <ShopHeader title={title} description={description} breadcrumbs={breadcrumbs}
        parent={{label:catalogReturn ? 'Ribbon colors' : 'Product types',to:catalogReturn || '/shop'}} />

      {filtersOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            ref={filterDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-filter-title"
            className="absolute inset-2 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
              <div id="shop-filter-title" className="text-sm font-semibold text-slate-900">
                Filters
                {activeFilterCount > 0 ? (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
              <button
                ref={filterCloseRef}
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4">
              {renderFilterControls()}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Show Products
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={resultsRef} className="space-y-3">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-3 lg:col-span-9 lg:col-start-4">
            <button type="button" onClick={() => setFiltersOpen(true)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 lg:hidden">
              <FaFilter aria-hidden="true" className="h-4 w-4" />Filters
              {activeFilterCount > 0 && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs">{activeFilterCount}</span>}
            </button>
            <span role="status" className="text-sm text-slate-500">
              {loadingProducts ? 'Loading options…' : productsQ.isError ? 'Options unavailable' : showingText}
            </span>
            {!loadingProducts && hasMultiplePages ? (
              <div className="w-full sm:ml-auto sm:w-auto">
                <div className="sm:hidden">
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    variant="compact"
                    showSummary={false}
                    showNumbers={false}
                    showPageLabel
                    compactLabelPosition="middle"
                    density="comfortable"
                    tone="violet"
                  />
                </div>
                <div className="hidden sm:block">
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    variant="full"
                    showSummary={false}
                    density="comfortable"
                    tone="violet"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Filters and product cards share the same starting edge. */}
          <aside className="hidden space-y-4 lg:col-span-3 lg:block">
            <div className="space-y-4 lg:sticky lg:top-16 lg:self-start">
              {renderFilterControls()}
            </div>
          </aside>

          <section className="space-y-4 lg:col-span-9">
            {productsQ.isError ? (
              <div className="space-y-3">
                <ErrorMessage message="Products could not load. Please try again." />
                <button type="button" onClick={() => productsQ.refetch()} className="rounded-xl bg-violet-600 px-4 py-2 text-white">Try again</button>
              </div>
            ) : loadingProducts ? (
              <ProductGridSkeleton />
            ) : products.length === 0 ? (
              <div className="rounded-2xl bg-white/90 p-4 text-sm text-slate-500 ring-1 ring-slate-200/80">
                No products available for this selection.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p, index) => (
                  <ProductCard key={p._id || p.id} product={p} priority={index < 2} />
                ))}
              </div>
            )}

            {!loadingProducts && hasMultiplePages ? (
              <div className="flex justify-center">
                <Pagination
                  variant="full"
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  showSummary={false}
                  density="comfortable"
                  tone="violet"
                />
              </div>
            ) : null}

            {productsQ.isFetching && !productsQ.isLoading ? (
              <p className="text-[11px] text-right text-slate-400">
                Updating products...
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
