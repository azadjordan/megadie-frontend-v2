// src/pages/Public/ShopPage.jsx
import { useMemo } from "react";
import { useGetProductsQuery } from "../../features/products/productsApiSlice";
import { useGetFilterConfigsQuery } from "../../features/filters/filterConfigsApiSlice";
import { useGetCategoriesQuery } from "../../features/categories/categoriesApiSlice";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import ProductCard from "../../components/common/ProductCard";
import Pagination from "../../components/common/Pagination";
import useShopQueryState from "../../hooks/useShopQueryState";
import ShopFilters from "../../components/shop/ShopFilters";
import ProductTypeSwitcher from "../../components/shop/ProductTypeSwitcher";

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

  // Filter configs
  const {
    data: filterConfigs = [],
    isLoading: isLoadingConfigs,
    isError: isErrorConfigs,
    error: errorConfigs,
  } = useGetFilterConfigsQuery();

  const productTypes = useMemo(
    () => filterConfigs.map((c) => c.productType),
    [filterConfigs]
  );

  const activeFilterConfig = useMemo(
    () => filterConfigs.find((c) => c.productType === productType) || null,
    [filterConfigs, productType]
  );

  // Categories (for categoryKeys label mapping)
  const needsCategories = useMemo(
    () => !!activeFilterConfig?.fields?.some((f) => f.key === "categoryKeys"),
    [activeFilterConfig]
  );

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: errorCategories,
  } = useGetCategoriesQuery(
    needsCategories
      ? { productType, isActive: true, limit: 200, page: 1 }
      : undefined,
    { skip: !needsCategories }
  );

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

  // Products
  const {
    data,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: errorProducts,
    isFetching,
  } = useGetProductsQuery(productsQueryParams, {
    skip:
      isLoadingConfigs ||
      isErrorConfigs ||
      (needsCategories && (isLoadingCategories || isErrorCategories)),
  });

  const products = data?.products ?? [];
  const pagination = data?.pagination ?? null;

  // Derived (must be before returns)
  const totalItems = pagination?.total ?? products.length;

  const hasActiveFilters = useMemo(
    () =>
      Object.values(filters || {}).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      ),
    [filters]
  );

  const handlePageChange = (newPage) => setPage(newPage);

  // Safe early returns
  if (isLoadingConfigs || (needsCategories && isLoadingCategories)) {
    return <Loader />;
  }

  if (isErrorConfigs) {
    const msg =
      errorConfigs?.data?.message ||
      errorConfigs?.error ||
      "Failed to load filter configurations.";
    return <ErrorMessage message={msg} />;
  }

  if (needsCategories && isErrorCategories) {
    const msg =
      errorCategories?.data?.message ||
      errorCategories?.error ||
      "Failed to load categories.";
    return <ErrorMessage message={msg} />;
  }

  if (isLoadingProducts) return <Loader />;

  if (isErrorProducts) {
    const msg =
      errorProducts?.data?.message ||
      errorProducts?.error ||
      "Failed to load products from server.";
    return <ErrorMessage message={msg} />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Filters */}
        <aside className="lg:col-span-3">
          {activeFilterConfig ? (
            <div className="lg:sticky lg:top-4">
              <ShopFilters
                config={activeFilterConfig}
                selectedFilters={filters}
                onToggle={toggleFilterValue}
                disabled={isFetching}
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
        <section className="lg:col-span-9 space-y-4">
          {/* Top bar: tabs on the left, meta on the far right */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ProductTypeSwitcher
              productTypes={productTypes}
              value={productType}
              onChange={setProductType}
              disabled={isFetching}
            />

            <div className="flex items-center gap-3 text-xs text-slate-500 sm:justify-end">
              <span className="whitespace-nowrap">
                {totalItems} item{totalItems !== 1 && "s"}
              </span>

              {pagination && (
                <span className="whitespace-nowrap">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
              )}
            </div>
          </div>

          {/* Products grid */}
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

          {/* Pagination */}
          <div className="flex justify-end">
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>

          {isFetching && !isLoadingProducts && (
            <p className="text-[11px] text-right text-slate-400">
              Updating products…
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
