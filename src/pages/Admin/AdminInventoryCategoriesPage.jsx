import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";
import ErrorMessage from "../../components/common/ErrorMessage";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useGetProductMetaQuery } from "../../features/products/productsApiSlice";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesAdminQuery,
} from "../../features/categories/categoriesApiSlice";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const LIMIT_OPTIONS = [25, 50, 100];

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const buildCategoryKey = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  const dashed = normalized.replace(/[^a-z0-9]+/g, "-");
  return dashed.replace(/^-+|-+$/g, "");
};

const getCategoryRowMeta = (category, state = {}) => {
  const { isDeleting, deletingId } = state;
  const statusLabel = category?.isActive === false ? "Inactive" : "Active";
  const statusClass =
    category?.isActive === false
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  const usageCount =
    typeof category?.usageCount === "number" ? category.usageCount : null;
  const usageLabel = usageCount === null ? "--" : formatQty(usageCount);
  const canDelete =
    typeof category?.canDelete === "boolean"
      ? category.canDelete
      : usageCount === 0;
  const categoryId = category?._id || category?.id;
  const isDeletingRow =
    Boolean(categoryId) &&
    isDeleting &&
    String(deletingId) === String(categoryId);
  const deleteTitle = !canDelete ? "Category is in use." : "Delete category";
  return {
    statusLabel,
    statusClass,
    usageLabel,
    canDelete,
    categoryId,
    isDeletingRow,
    deleteTitle,
  };
};

export default function AdminInventoryCategoriesPage() {
  const [q, setQ] = useState("");
  const [productType, setProductType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    productType: "",
    label: "",
    key: "",
    isActive: true,
  });
  const [createError, setCreateError] = useState("");

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);

  const {
    data: metaData,
    isLoading: metaLoading,
    error: metaError,
  } = useGetProductMetaQuery();
  const productTypes = metaData?.productTypes ?? [];

  const queryParams = useMemo(() => {
    const params = { page, limit, includeUsage: true };
    if (debouncedSearch) params.q = debouncedSearch;
    if (productType !== "all") params.productType = productType;
    if (statusFilter !== "all") params.isActive = statusFilter === "active";
    return params;
  }, [page, limit, debouncedSearch, productType, statusFilter]);

  const {
    data: categoriesResult,
    isLoading,
    isFetching,
    error,
  } = useGetCategoriesAdminQuery(queryParams);

  const [createCategory, { isLoading: isCreating, error: createApiError }] =
    useCreateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] =
    useDeleteCategoryMutation();
  const [deletingId, setDeletingId] = useState(null);

  const categories = categoriesResult?.rows ?? [];
  const pagination = categoriesResult?.pagination ?? null;
  const totalCategories = pagination?.total ?? categories.length;

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0 };
    for (const row of categories) {
      if (row?.isActive === false) counts.inactive += 1;
      else counts.active += 1;
    }
    return counts;
  }, [categories]);

  const summaryCards = useMemo(
    () => [
      { label: "Categories", value: formatQty(totalCategories) },
      { label: "Active (page)", value: formatQty(statusCounts.active) },
      { label: "Inactive (page)", value: formatQty(statusCounts.inactive) },
    ],
    [totalCategories, statusCounts]
  );

  const openCreateModal = () => {
    const defaultType =
      productType !== "all" ? productType : productTypes[0] || "";
    setCreateForm({
      productType: defaultType,
      label: "",
      key: "",
      isActive: true,
    });
    setCreateError("");
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
    setCreateError("");
  };

  const handleCreateLabel = (value) => {
    setCreateForm((prev) => ({
      ...prev,
      label: value,
      key: buildCategoryKey(value),
    }));
    if (createError) setCreateError("");
  };

  const handleCreate = async () => {
    const label = String(createForm.label || "").trim();
    const key = String(createForm.key || "").trim();
    const type = String(createForm.productType || "").trim();

    if (!type) {
      setCreateError("Product type is required.");
      return;
    }
    if (!label) {
      setCreateError("Category label is required.");
      return;
    }
    if (!key) {
      setCreateError("Category key could not be generated from the label.");
      return;
    }

    try {
      await createCategory({
        key,
        label,
        productType: type,
        isActive: createForm.isActive,
      }).unwrap();
      setIsCreateOpen(false);
      setCreateError("");
      setPage(1);
    } catch {
      // ErrorMessage handles API errors.
    }
  };

  const friendlyApiError = (err) =>
    err?.data?.message || err?.error || err?.message || "Something went wrong.";

  const handleDeleteCategory = async (category) => {
    const categoryId = category?._id || category?.id;
    if (!categoryId) return;

    const usageCount =
      typeof category?.usageCount === "number" ? category.usageCount : null;
    const canDelete =
      typeof category?.canDelete === "boolean"
        ? category.canDelete
        : usageCount === 0;

    if (!canDelete) {
      toast.error("Category is in use and cannot be deleted.");
      return;
    }

    const label = category?.label || category?.key || "this category";
    const ok = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!ok) return;

    try {
      setDeletingId(categoryId);
      const res = await deleteCategory(categoryId).unwrap();
      toast.success(res?.message || "Category deleted.");
    } catch (err) {
      toast.error(friendlyApiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isCreateOpen) return;
    if (createForm.productType) return;
    if (!productTypes.length) return;
    const fallbackType =
      productType !== "all" ? productType : productTypes[0] || "";
    setCreateForm((prev) => ({ ...prev, productType: fallbackType }));
  }, [isCreateOpen, createForm.productType, productType, productTypes]);

  const isBusy = isLoading || isFetching;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Categories</div>
          <div className="text-sm text-slate-500">
            Manage product categories used across products.
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <FiPlus className="h-4 w-4" />
          New category
        </button>
      </div>

      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:gap-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="min-w-0 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:p-4"
          >
            <div className="text-[10px] font-semibold text-slate-500 sm:text-xs">
              {card.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 sm:mt-2 sm:text-lg">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="flex flex-col gap-3">
          <div className="grid w-full grid-cols-1 gap-3 md:items-end md:grid-cols-[1fr_200px_200px_160px]">
            <div className="flex items-end gap-2 md:contents">
              <div className="flex-1">
                <label
                  htmlFor="category-search"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Search
                </label>
                <input
                  id="category-search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by label or key"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
                aria-expanded={filtersOpen}
                aria-controls="category-filters-panel"
              >
                {filtersOpen ? "Hide filters" : "Filters"}
              </button>
            </div>

            <div
              id="category-filters-panel"
              className={[
                filtersOpen ? "grid grid-cols-2 gap-2" : "hidden",
                "md:contents",
              ].join(" ")}
            >
              <div>
                <label
                  htmlFor="category-type"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Product type
                </label>
                <select
                  id="category-type"
                  value={productType}
                  onChange={(e) => {
                    setProductType(e.target.value);
                    setPage(1);
                  }}
                  disabled={metaLoading || !productTypes.length}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
                >
                  <option value="all">All product types</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {metaError ? (
                  <div className="mt-1 text-[11px] text-rose-600">
                    Unable to load product types.
                  </div>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="category-status"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Status
                </label>
                <select
                  id="category-status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="category-limit"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Page size
                </label>
                <select
                  id="category-limit"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  {LIMIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {categories.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {totalCategories}
            </span>{" "}
            categories
            {isFetching ? <span className="ml-2">(Updating...)</span> : null}
          </div>
          {pagination ? (
            <Pagination
              pagination={pagination}
              onPageChange={(next) => setPage(next)}
              tone="violet"
            />
          ) : null}
        </div>
      </div>

      {isBusy ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Loading categories...</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">No categories found.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {categories.map((category) => {
              const row = getCategoryRowMeta(category, {
                isDeleting,
                deletingId,
              });
              return (
                <div
                  key={category._id || category.id}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {category?.label || category?.key || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {category?.key || "-"}
                      </div>
                    </div>
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset",
                        row.statusClass,
                      ].join(" ")}
                    >
                      {row.statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Product type
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        {category?.productType || "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Products
                      </div>
                      <div className="mt-1 text-xs text-slate-700 tabular-nums">
                        {row.usageLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={!row.canDelete || row.isDeletingRow}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 transition",
                        !row.canDelete || row.isDeletingRow
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50",
                      ].join(" ")}
                      title={row.deleteTitle}
                      aria-label={row.deleteTitle}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 md:block">
            <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
              <div className="col-span-4">Label</div>
              <div className="col-span-2">Key</div>
              <div className="col-span-2">Product type</div>
              <div className="col-span-1 text-right">Products</div>
              <div className="col-span-2 text-right">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {categories.map((category) => {
              const row = getCategoryRowMeta(category, {
                isDeleting,
                deletingId,
              });
              return (
                <div
                  key={category._id || category.id}
                  className="grid grid-cols-12 gap-2 border-t border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  <div className="col-span-4 font-semibold text-slate-900">
                    {category?.label || category?.key || "-"}
                  </div>
                  <div className="col-span-2 truncate text-xs text-slate-500">
                    {category?.key || "-"}
                  </div>
                  <div className="col-span-2 text-xs text-slate-600">
                    {category?.productType || "-"}
                  </div>
                  <div className="col-span-1 text-right text-xs text-slate-600 tabular-nums">
                    {row.usageLabel}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset",
                        row.statusClass,
                      ].join(" ")}
                    >
                      {row.statusLabel}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={!row.canDelete || row.isDeletingRow}
                      className={[
                        "inline-flex items-center justify-center rounded-lg p-1.5 ring-1 transition",
                        !row.canDelete || row.isDeletingRow
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50",
                      ].join(" ")}
                      title={row.deleteTitle}
                      aria-label={row.deleteTitle}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeCreateModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-create-title"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div
                  id="category-create-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Create category
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Keys are auto-generated from the label and locked.
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Product type
                </label>
                <select
                  value={createForm.productType}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      productType: e.target.value,
                    }))
                  }
                  disabled={metaLoading || !productTypes.length}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
                >
                  <option value="">Select type</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Category label
                </label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={(e) => handleCreateLabel(e.target.value)}
                  placeholder="Label"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Category key
                </label>
                <input
                  type="text"
                  value={createForm.key}
                  readOnly
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                Active
              </label>

              {createError ? (
                <div className="text-xs font-semibold text-rose-600">
                  {createError}
                </div>
              ) : null}

              {createApiError ? (
                <ErrorMessage error={createApiError} />
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    isCreating
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isCreating ? "Creating..." : "Create category"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
