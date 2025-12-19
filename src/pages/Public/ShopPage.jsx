// src/pages/Public/ShopPage.jsx
import { useMemo } from "react";

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
const PAGE_LIMIT = 48;

export default function ShopPage() {
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

  const productsQ = useGetProductsQuery(productsQueryParams, {
    skip: shouldSkipProducts,
  });

  const products = productsQ.data?.products ?? [];
  const pagination = productsQ.data?.pagination ?? null;

  const hasActiveFilters =
    Object.values(filters || {}).some((arr) => Array.isArray(arr) && arr.length);

  const showingText = useMemo(() => {
    if (!pagination) {
      const n = products.length;
      if (n === 0) return "Showing 0 items";
      return `Showing 1 – ${n} of ${n} item${n !== 1 ? "s" : ""}`;
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? productsQueryParams?.limit ?? PAGE_LIMIT;
    const total = pagination.total ?? 0;

    if (total === 0) return "Showing 0 items";

    const start = (page - 1) * limit + 1;
    const end = Math.min(start + products.length - 1, total);
    return `Showing ${start} – ${end} of ${total} item${total !== 1 ? "s" : ""}`;
  }, [pagination, products.length, productsQueryParams?.limit]);

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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left rail: product type nav + filters */}
        <aside className="space-y-4 lg:col-span-3">
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
            <div className="lg:sticky lg:top-16">
              <ShopFilters
                config={activeFilterConfig}
                selectedFilters={filters}
                onToggle={toggleFilterValue}
                disabled={productsQ.isFetching}
                valueLabelMaps={{ categoryKeys: categoryLabelByKey }}
                onClearAll={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          ) : (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">No filters available.</p>
            </div>
          )}
        </aside>

        {/* Results */}
        <section className="space-y-4 lg:col-span-9">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="whitespace-nowrap">{showingText}</span>
            {pagination ? (
              <span className="whitespace-nowrap">
                Page {pagination.page} / {pagination.totalPages}
              </span>
            ) : null}
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-slate-500">
              No products available for this selection.
            </p>
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
            />
          </div>

          {productsQ.isFetching && !productsQ.isLoading ? (
            <p className="text-[11px] text-right text-slate-400">
              Updating products…
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
