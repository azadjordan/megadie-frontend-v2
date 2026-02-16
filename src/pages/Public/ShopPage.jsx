// src/pages/Public/ShopPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { FaFilter } from "react-icons/fa";

import { useGetProductsQuery } from "../../features/products/productsApiSlice";
import { useGetFilterConfigsQuery } from "../../features/filters/filterConfigsApiSlice";
import { useGetCategoriesQuery } from "../../features/categories/categoriesApiSlice";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import ProductCard from "../../components/common/ProductCard";
import Pagination from "../../components/common/Pagination";
import ShopFilters from "../../components/shop/ShopFilters";
import ProductTypeNav from "../../components/shop/ProductTypeNav";

import useShopQueryState from "../../hooks/useShopQueryState";

const DEFAULT_PRODUCT_TYPE = "Ribbon";
const PAGE_LIMIT = 16;

export default function ShopPage() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    productType,
    setProductType,
    filters,
    toggleFilterValue,
    clearAllFilters,
    setPage,
    productsQueryParams,
  } = useShopQueryState({
    defaultProductType: DEFAULT_PRODUCT_TYPE,
    defaultLimit: PAGE_LIMIT,
  });

  // 1) Filter configs
  const configsQ = useGetFilterConfigsQuery();
  const filterConfigs = configsQ.data ?? [];

  const productTypes = useMemo(
    () => filterConfigs.map((c) => c.productType),
    [filterConfigs]
  );

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

  const categories = categoriesQ.data ?? [];

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

  // 3) Products
  const shouldSkipProducts =
    configsQ.isLoading ||
    configsQ.isError ||
    (needsCategories && (categoriesQ.isLoading || categoriesQ.isError));

  const productsQ = useGetProductsQuery(
    { ...productsQueryParams, featuredFirst: true },
    { skip: shouldSkipProducts }
  );

  const products = productsQ.data?.products ?? [];
  const pagination = productsQ.data?.pagination ?? null;

  const scrollKey = `shop-scroll:${location.pathname}${location.search}`;
  const hasRestoredScroll = useRef(false);

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
      if (n === 0) return "Showing 0 items";
      return `Showing 1 to ${n} of ${n} item${n !== 1 ? "s" : ""}`;
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? productsQueryParams?.limit ?? PAGE_LIMIT;
    const total = pagination.total ?? 0;

    if (total === 0) return "Showing 0 items";

    const start = (page - 1) * limit + 1;
    const end = Math.min(start + products.length - 1, total);
    return `Showing ${start} to ${end} of ${total} item${
      total !== 1 ? "s" : ""
    }`;
  }, [pagination, products.length, productsQueryParams?.limit]);

  useEffect(() => {
    return () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY || 0));
    };
  }, [scrollKey]);

  useEffect(() => {
    if (!filtersOpen) return;

    const handleKey = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (hasRestoredScroll.current) return;
    if (navigationType !== "POP") return;
    if (productsQ.isLoading || productsQ.isFetching) return;

    const raw = sessionStorage.getItem(scrollKey);
    const y = raw ? parseInt(raw, 10) : 0;

    if (Number.isFinite(y)) {
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
    }

    hasRestoredScroll.current = true;
  }, [
    navigationType,
    productsQ.isLoading,
    productsQ.isFetching,
    products.length,
    scrollKey,
  ]);

  // ---- Early returns (kept predictable) ----
  if (configsQ.isLoading || (needsCategories && categoriesQ.isLoading)) {
    return <Loader />;
  }

  if (configsQ.isError) {
    const msg =
      configsQ.error?.data?.message ||
      configsQ.error?.error ||
      "Failed to load filter configurations.";
    return <ErrorMessage message={msg} />;
  }

  if (needsCategories && categoriesQ.isError) {
    const msg =
      categoriesQ.error?.data?.message ||
      categoriesQ.error?.error ||
      "Failed to load categories.";
    return <ErrorMessage message={msg} />;
  }

  if (productsQ.isLoading) return <Loader />;

  if (productsQ.isError) {
    const msg =
      productsQ.error?.data?.message ||
      productsQ.error?.error ||
      "Failed to load products from server.";
    return <ErrorMessage message={msg} />;
  }

  return (
    <div className="space-y-5 pt-8 lg:pt-0">
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="fixed left-4 z-[60] inline-flex items-center gap-2 rounded-lg bg-violet-50/80 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200/70 shadow-sm shadow-violet-200/30 backdrop-blur lg:hidden"
        style={{ top: "calc(var(--app-header-h, 64px) + 0.75rem)" }}
      >
        <FaFilter className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-violet-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            className="absolute inset-2 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">
                Filters
                {activeFilterCount > 0 ? (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4">
              <ProductTypeNav
                productTypes={productTypes}
                value={productType}
                onChange={(v) => {
                  setPage(1);
                  setProductType(v);
                }}
                disabled={productsQ.isFetching}
                stacked
              />

              {activeFilterConfig ? (
                <ShopFilters
                  config={activeFilterConfig}
                  selectedFilters={filters}
                  onToggle={toggleFilterValue}
                  disabled={productsQ.isFetching}
                  valueLabelMaps={{ categoryKeys: categoryLabelByKey }}
                  onClearAll={clearAllFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              ) : (
                <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
                  <p className="text-sm text-slate-500">
                    No filters available.
                  </p>
                </div>
              )}
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Filters + product types (left rail) */}
        <aside className="hidden space-y-4 lg:col-span-3 lg:block">
          <div className="space-y-4 lg:sticky lg:top-16 lg:self-start">
            <ProductTypeNav
              productTypes={productTypes}
              value={productType}
              onChange={(v) => {
                // keep page stable / avoid stale results
                setPage(1);
                setProductType(v);
              }}
              disabled={productsQ.isFetching}
            />

            {activeFilterConfig ? (
              <ShopFilters
                config={activeFilterConfig}
                selectedFilters={filters}
                onToggle={toggleFilterValue}
                disabled={productsQ.isFetching}
                valueLabelMaps={{ categoryKeys: categoryLabelByKey }}
                onClearAll={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
              />
            ) : (
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
                <p className="text-sm text-slate-500">No filters available.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Results */}
        <section className="space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="whitespace-nowrap text-xs text-slate-500">
              {showingText}
            </span>
            {pagination ? (
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                variant="compact"
                showSummary={false}
                showNumbers={false}
                tone="violet"
              />
            ) : null}
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl bg-white/90 p-4 text-sm text-slate-500 ring-1 ring-slate-200/80">
              No products available for this selection.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p._id || p.id} product={p} />
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Pagination
              variant="full"
              pagination={pagination}
              onPageChange={setPage}
              tone="violet"
            />
          </div>

          {productsQ.isFetching && !productsQ.isLoading ? (
            <p className="text-[11px] text-right text-slate-400">
              Updating products...
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
