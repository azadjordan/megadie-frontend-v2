// src/pages/Public/ShopPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { FaFilter } from "react-icons/fa";

import {
  useGetProductsAvailabilityQuery,
  useGetProductsQuery,
} from "../../features/products/productsApiSlice";
import { useGetFilterConfigsQuery } from "../../features/filters/filterConfigsApiSlice";
import { useGetCategoriesQuery } from "../../features/categories/categoriesApiSlice";

import ErrorMessage from "../../components/common/ErrorMessage";
import ProductCard from "../../components/common/ProductCard";
import Pagination from "../../components/common/Pagination";
import ShopFilters from "../../components/shop/ShopFilters";
import ProductTypeNav from "../../components/shop/ProductTypeNav";

import useShopQueryState from "../../hooks/useShopQueryState";

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
  const filterConfigs = configsQ.data ?? EMPTY_ARRAY;

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

  // 3) Products
  const productsQ = useGetProductsQuery({
    ...productsQueryParams,
    featuredFirst: true,
    includeAvailability: false,
  });

  const rawProducts = productsQ.data?.products ?? EMPTY_ARRAY;
  const pagination = productsQ.data?.pagination ?? null;
  const productIds = useMemo(
    () =>
      rawProducts
        .map((product) => product?._id || product?.id)
        .filter(Boolean)
        .map(String),
    [rawProducts]
  );
  const availabilityQ = useGetProductsAvailabilityQuery(productIds, {
    skip: productIds.length === 0,
  });
  const availabilityRows = availabilityQ.currentData ?? EMPTY_ARRAY;
  const availabilityByProductId = useMemo(
    () =>
      new Map(
        availabilityRows
          .filter((row) => row?.productId)
          .map((row) => [String(row.productId), row])
      ),
    [availabilityRows]
  );
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

  const renderFilterNotice = (message) => (
    <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );

  const renderFilterControls = ({ stacked = false } = {}) => {
    if (configsQ.isLoading) {
      return <FilterPanelSkeleton />;
    }

    if (configsQ.isError) {
      return renderFilterNotice("Filters could not load.");
    }

    return (
      <>
        <ProductTypeNav
          productTypes={productTypes}
          value={productType}
          onChange={(v) => {
            setProductType(v);
          }}
          stacked={stacked}
        />

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
              {renderFilterControls({ stacked: true })}
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
            {renderFilterControls()}
          </div>
        </aside>

        {/* Results */}
        <section className="space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {productsQ.isLoading ? (
              <span
                aria-hidden="true"
                className="h-3.5 w-32 animate-pulse rounded-full bg-slate-200"
              />
            ) : (
              <span className="whitespace-nowrap text-xs text-slate-500">
                {showingText}
              </span>
            )}
            {!productsQ.isLoading && pagination ? (
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

          {productsQ.isLoading ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
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

          {!productsQ.isLoading ? (
            <div className="flex justify-end">
              <Pagination
                variant="full"
                pagination={pagination}
                onPageChange={setPage}
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
  );
}
