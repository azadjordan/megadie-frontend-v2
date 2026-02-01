import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

import ErrorMessage from "../../components/common/ErrorMessage";
import { useGetProductMetaQuery } from "../../features/products/productsApiSlice";
import {
  useCreateFilterConfigMutation,
  useDeleteFilterConfigMutation,
  useGetFilterConfigsQuery,
} from "../../features/filters/filterConfigsApiSlice";

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatDate = (iso) => {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return String(iso);
  }
};

const formatFieldLabel = (field) => {
  const label = field?.label || field?.key || "Field";
  const type = field?.type || "text";
  return `${label} (${type})`;
};

const getFilterConfigRowMeta = (config, state = {}) => {
  const { deletingType, isDeleting } = state;
  const fields = Array.isArray(config?.fields) ? config.fields : [];
  const fieldCount = fields.length;
  const previewFields = fields.slice(0, 3);
  const remaining = Math.max(fieldCount - previewFields.length, 0);
  const isDeletingRow = isDeleting && deletingType === config?.productType;
  const sortValue = Number.isFinite(Number(config?.sort))
    ? Number(config.sort)
    : 0;
  return {
    fields,
    fieldCount,
    previewFields,
    remaining,
    isDeletingRow,
    sortValue,
  };
};

const friendlyApiError = (err) =>
  err?.data?.message || err?.error || err?.message || "Something went wrong.";

export default function AdminFilterConfigsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    productType: "",
    sort: "0",
  });
  const [createError, setCreateError] = useState("");
  const [deletingType, setDeletingType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const {
    data: configsData,
    isLoading,
    isFetching,
    error,
  } = useGetFilterConfigsQuery();

  const {
    data: metaData,
    isLoading: metaLoading,
    error: metaError,
  } = useGetProductMetaQuery();

  const [createFilterConfig, { isLoading: isCreating, error: createApiError }] =
    useCreateFilterConfigMutation();
  const [deleteFilterConfig, { isLoading: isDeleting }] =
    useDeleteFilterConfigMutation();

  const configs = configsData ?? [];
  const productTypes = metaData?.productTypes ?? [];

  const configuredTypes = useMemo(
    () => new Set(configs.map((cfg) => cfg.productType)),
    [configs]
  );
  const missingTypes = useMemo(
    () => productTypes.filter((type) => !configuredTypes.has(type)),
    [productTypes, configuredTypes]
  );

  const summaryCards = useMemo(
    () => [
      { label: "Configs", value: formatQty(configs.length) },
      {
        label: "Product types",
        value: metaLoading || metaError ? "--" : formatQty(productTypes.length),
      },
      {
        label: "Missing configs",
        value:
          metaLoading || metaError ? "--" : formatQty(missingTypes.length),
      },
    ],
    [configs.length, metaLoading, metaError, productTypes.length, missingTypes.length]
  );

  const openCreateModal = () => {
    setCreateForm({
      productType: missingTypes[0] || "",
      sort: "0",
    });
    setCreateError("");
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
    setCreateError("");
  };

  const handleCreate = async () => {
    const productType = String(createForm.productType || "").trim();
    if (!productType) {
      setCreateError("Product type is required.");
      return;
    }

    const sortRaw = String(createForm.sort ?? "").trim();
    const sortValue = sortRaw === "" ? undefined : Number(sortRaw);
    if (sortRaw !== "" && !Number.isFinite(sortValue)) {
      setCreateError("Sort must be a number.");
      return;
    }

    try {
      await createFilterConfig({
        productType,
        ...(typeof sortValue !== "undefined" ? { sort: sortValue } : {}),
      }).unwrap();
      toast.success("Filter config created.");
      setIsCreateOpen(false);
      setCreateError("");
    } catch {
      // ErrorMessage handles API errors.
    }
  };

  const openDeleteModal = (config) => {
    setDeleteTarget(config || null);
    setDeleteConfirmText("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteConfirmText("");
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    const productType = deleteTarget?.productType;
    if (!productType) {
      setDeleteError("Missing product type.");
      return;
    }
    if (deleteConfirmText.trim() !== productType) {
      setDeleteError(`Type "${productType}" to confirm.`);
      return;
    }

    try {
      setDeleteError("");
      setDeletingType(productType);
      const res = await deleteFilterConfig(productType).unwrap();
      toast.success(res?.message || "Filter config deleted.");
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } catch (err) {
      const message = friendlyApiError(err);
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeletingType("");
    }
  };

  const isBusy = isLoading || isFetching;
  const hasMissing = !metaLoading && !metaError && missingTypes.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">
            Filter Configs
          </div>
          <div className="text-sm text-slate-500">
            Manage the shop filter layout per product type.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFetching ? (
            <div className="text-xs font-semibold text-slate-400">
              Refreshing...
            </div>
          ) : null}
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!hasMissing}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition",
              hasMissing
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "cursor-not-allowed bg-slate-200 text-slate-400",
            ].join(" ")}
          >
            <FiPlus className="h-4 w-4" />
            New config
          </button>
        </div>
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

      {metaError ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <ErrorMessage error={metaError} />
        </div>
      ) : null}

      {isBusy ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Loading filter configs...</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">No filter configs found.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {configs.map((config) => {
              const row = getFilterConfigRowMeta(config, {
                deletingType,
                isDeleting,
              });
              return (
                <div
                  key={config._id || config.productType}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {config?.productType || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Sort: {row.sortValue}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Updated {formatDate(config?.updatedAt)}
                    </div>
                  </div>

                  <div className="mt-3">
                    {row.fieldCount ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {formatQty(row.fieldCount)} fields
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {row.previewFields.map((field) => (
                            <span
                              key={field.key || field.label}
                              className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                            >
                              {formatFieldLabel(field)}
                            </span>
                          ))}
                          {row.remaining > 0 ? (
                            <span className="text-[10px] text-slate-400">
                              +{formatQty(row.remaining)} more
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        No fields yet.
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/filter-configs/${encodeURIComponent(
                        config?.productType || ""
                      )}/edit`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                      title="Edit filter config"
                      aria-label="Edit filter config"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(config)}
                      disabled={row.isDeletingRow}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 transition",
                        row.isDeletingRow
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50",
                      ].join(" ")}
                      title="Delete filter config"
                      aria-label="Delete filter config"
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
              <div className="col-span-3">Product type</div>
              <div className="col-span-1 text-right">Sort</div>
              <div className="col-span-5">Fields</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {configs.map((config) => {
              const row = getFilterConfigRowMeta(config, {
                deletingType,
                isDeleting,
              });

              return (
                <div
                  key={config._id || config.productType}
                  className="grid grid-cols-12 gap-2 border-t border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  <div className="col-span-3 font-semibold text-slate-900">
                    {config?.productType || "-"}
                  </div>
                  <div className="col-span-1 text-right text-xs text-slate-600 tabular-nums">
                    {row.sortValue}
                  </div>
                  <div className="col-span-5">
                    {row.fieldCount ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {formatQty(row.fieldCount)} fields
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {row.previewFields.map((field) => (
                            <span
                              key={field.key || field.label}
                              className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                            >
                              {formatFieldLabel(field)}
                            </span>
                          ))}
                          {row.remaining > 0 ? (
                            <span className="text-[10px] text-slate-400">
                              +{formatQty(row.remaining)} more
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        No fields yet.
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-xs text-slate-600">
                    {formatDate(config?.updatedAt)}
                  </div>
                  <div className="col-span-1 flex justify-end gap-2">
                    <Link
                      to={`/admin/filter-configs/${encodeURIComponent(
                        config?.productType || ""
                      )}/edit`}
                      className="inline-flex items-center justify-center rounded-lg bg-white p-1.5 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                      title="Edit filter config"
                      aria-label="Edit filter config"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(config)}
                      disabled={row.isDeletingRow}
                      className={[
                        "inline-flex items-center justify-center rounded-lg p-1.5 ring-1 transition",
                        row.isDeletingRow
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50",
                      ].join(" ")}
                      title="Delete filter config"
                      aria-label="Delete filter config"
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

      {!metaLoading && !metaError && missingTypes.length ? (
        <div className="text-xs text-slate-500">
          Missing configs: {missingTypes.join(", ")}.
        </div>
      ) : null}

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeCreateModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-config-create-title"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div
                  id="filter-config-create-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Create filter config
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Start with an empty config and add fields later.
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
                  disabled={metaLoading || !missingTypes.length}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
                >
                  {missingTypes.length ? (
                    missingTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))
                  ) : (
                    <option value="">No missing product types</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Sort order
                </label>
                <input
                  type="number"
                  value={createForm.sort}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      sort: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                <div className="mt-1 text-[11px] text-slate-400">
                  Lower numbers show first in the shop filters.
                </div>
              </div>

              {createError ? (
                <div className="text-xs font-semibold text-rose-600">
                  {createError}
                </div>
              ) : null}

              {createApiError ? <ErrorMessage error={createApiError} /> : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating || !missingTypes.length}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    isCreating || !missingTypes.length
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isCreating ? "Creating..." : "Create config"}
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

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-config-delete-title"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div
                  id="filter-config-delete-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Delete filter config
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  This action cannot be undone.
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                You are about to delete the filter config for{" "}
                <span className="font-semibold">
                  {deleteTarget?.productType || "Unknown"}
                </span>
                .
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Type{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteTarget?.productType || ""}
                  </span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => {
                    setDeleteConfirmText(e.target.value);
                    setDeleteError("");
                  }}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  placeholder="Enter product type"
                />
              </div>

              {deleteError ? (
                <div className="text-xs font-semibold text-rose-600">
                  {deleteError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={
                    isDeleting ||
                    !deleteTarget?.productType ||
                    deleteConfirmText.trim() !== deleteTarget.productType
                  }
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    isDeleting
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-rose-600 hover:bg-rose-700",
                  ].join(" ")}
                >
                  {isDeleting ? "Deleting..." : "Delete config"}
                </button>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
