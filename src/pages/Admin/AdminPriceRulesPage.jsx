import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useGetPriceRulesQuery,
  useCreatePriceRuleMutation,
  useUpdatePriceRuleMutation,
  useDeletePriceRuleMutation,
} from "../../features/priceRules/priceRulesApiSlice";
import { useGetProductMetaQuery } from "../../features/products/productsApiSlice";

const parsePrice = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
};

const getUsageTotals = (usage) => {
  if (!usage) return 0;
  return (
    Number(usage.products || 0) +
    Number(usage.userPrices || 0) +
    Number(usage.quoteItems || 0)
  );
};

const normalizeRuleCode = (value) =>
  String(value || "").toUpperCase().replace(/\s*\|\s*/g, "|");

export default function AdminPriceRulesPage() {
  const [filterProductType, setFilterProductType] = useState("");
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetPriceRulesQuery(
    filterProductType ? { productType: filterProductType } : undefined
  );
  const {
    data: metaData,
    isLoading: metaLoading,
    error: metaError,
  } = useGetProductMetaQuery();

  const [createPriceRule, { isLoading: isCreating, error: createError }] =
    useCreatePriceRuleMutation();
  const [updatePriceRule, { isLoading: isUpdating, error: updateError }] =
    useUpdatePriceRuleMutation();
  const [deletePriceRule, { isLoading: isDeleting, error: deleteError }] =
    useDeletePriceRuleMutation();

  const [newCode, setNewCode] = useState("");
  const [newProductType, setNewProductType] = useState("");
  const [newPriceStr, setNewPriceStr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editPriceStr, setEditPriceStr] = useState("");
  const [editProductType, setEditProductType] = useState("");

  const productTypes = metaData?.productTypes ?? [];
  const rules = useMemo(() => data?.data || [], [data]);
  const isBusy = isCreating || isUpdating || isDeleting;

  useEffect(() => {
    if (editId && !rules.some((rule) => rule._id === editId)) {
      setEditId(null);
      setEditPriceStr("");
      setEditProductType("");
    }
  }, [editId, rules]);

  const newPrice = parsePrice(newPriceStr);
  const canAdd =
    newCode.trim().length > 0 &&
    newProductType &&
    newPrice != null &&
    !isCreating;

  const actionError = createError || updateError || deleteError;

  const onAddRule = async () => {
    if (!canAdd) return;
    try {
      await createPriceRule({
        code: normalizeRuleCode(newCode).trim(),
        productType: newProductType,
        defaultPrice: newPrice,
      }).unwrap();
      setNewCode("");
      setNewPriceStr("");
      toast.success("Price rule created.");
    } catch {
      // ErrorMessage handles it
    }
  };

  const onStartEdit = (rule) => {
    if (!rule?._id) return;
    setEditId(rule._id);
    setEditPriceStr(String(rule.defaultPrice ?? ""));
    setEditProductType(rule.productType || "");
  };

  const onCancelEdit = () => {
    setEditId(null);
    setEditPriceStr("");
    setEditProductType("");
  };

  const onSaveEdit = async (rule) => {
    const price = parsePrice(editPriceStr);
    const productType = String(editProductType || rule.productType || "").trim();
    if (!rule?._id || price == null || !productType) return;
    try {
      await updatePriceRule({
        id: rule._id,
        defaultPrice: price,
        productType,
      }).unwrap();
      setEditId(null);
      setEditPriceStr("");
      setEditProductType("");
      toast.success("Default price updated.");
    } catch {
      // ErrorMessage handles it
    }
  };

  const onDeleteRule = async (rule) => {
    if (!rule?._id) return;
    const usageTotal = getUsageTotals(rule.usage);
    if (usageTotal > 0) {
      toast.error("This rule is in use and cannot be deleted.");
      return;
    }
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm("Delete this price rule?");
    if (!ok) return;
    try {
      await deletePriceRule({ id: rule._id }).unwrap();
      toast.success("Price rule deleted.");
    } catch {
      // ErrorMessage handles it
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">
            Pricing Rules
          </div>
          <div className="text-sm text-slate-500">
            Manage the shared price rules and default prices used across users
            and quotes.
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs font-semibold text-slate-700">Add rule</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={newProductType}
            onChange={(e) => setNewProductType(e.target.value)}
            disabled={isBusy || metaLoading}
            className="min-w-[180px] rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
          >
            <option value="">Select product type</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(normalizeRuleCode(e.target.value))}
            placeholder="RIB|GRO|25MM|A+|100YD-ROLL"
            className="min-w-[220px] rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            disabled={isBusy}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={newPriceStr}
            onChange={(e) => setNewPriceStr(e.target.value)}
            placeholder="0.00"
            className="w-28 rounded-xl bg-white px-3 py-2 text-xs text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            disabled={isBusy}
          />
          <button
            type="button"
            onClick={onAddRule}
            disabled={!canAdd}
            className={[
              "rounded-xl px-3 py-2 text-xs font-semibold text-white",
              canAdd
                ? "bg-slate-900 hover:bg-slate-800"
                : "cursor-not-allowed bg-slate-300",
            ].join(" ")}
          >
            Add Rule
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Use "|" between parts; dashes are allowed inside parts (e.g., 48PC-PACK).
        </div>
        {metaError ? (
          <div className="mt-2 text-xs text-rose-600">
            Unable to load product types.
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:items-end">
          <div>
            <label
              htmlFor="price-rule-filter-type"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Product type
            </label>
            <select
              id="price-rule-filter-type"
              value={filterProductType}
              onChange={(e) => setFilterProductType(e.target.value)}
              disabled={metaLoading || productTypes.length === 0}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
            >
              <option value="">All product types</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2 text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {rules.length}
              </span>{" "}
              rule{rules.length === 1 ? "" : "s"}
            </div>
            {isFetching ? (
              <div className="font-semibold text-slate-400">Refreshing...</div>
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            {filterProductType
              ? "No price rules for this product type"
              : "No price rules yet"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {filterProductType
              ? "Choose another product type or create a new rule."
              : "Create a rule to start assigning prices."}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rule code</th>
                  <th className="px-4 py-3">Product type</th>
                  <th className="px-4 py-3">Default price</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rules.map((rule) => {
                  const isEditing = editId === rule._id;
                  const editPrice = parsePrice(editPriceStr);
                  const usage = rule.usage || {};
                  const usageTotal = getUsageTotals(usage);
                  const ruleProductType = rule.productType || "";
                  const isLegacyProductType =
                    ruleProductType && !productTypes.includes(ruleProductType);

                  return (
                    <tr key={rule._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                        {rule.code}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {isEditing ? (
                          <select
                            value={editProductType}
                            onChange={(e) => setEditProductType(e.target.value)}
                            className="w-full min-w-[160px] rounded-xl bg-white px-2 py-1.5 text-xs text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                          >
                            <option value="">Select product type</option>
                            {editProductType &&
                            !productTypes.includes(editProductType) ? (
                              <option value={editProductType}>
                                Legacy: {editProductType}
                              </option>
                            ) : null}
                            {productTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        ) : ruleProductType ? (
                          <span>
                            {isLegacyProductType
                              ? `Legacy: ${ruleProductType}`
                              : ruleProductType}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPriceStr}
                            onChange={(e) => setEditPriceStr(e.target.value)}
                            className="w-24 rounded-xl bg-white px-2 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                          />
                        ) : (
                          <span className="tabular-nums text-slate-900">
                            {Number(rule.defaultPrice).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>
                          Products:{" "}
                          <span className="font-semibold text-slate-900">
                            {usage.products || 0}
                          </span>
                        </div>
                        <div>
                          User prices:{" "}
                          <span className="font-semibold text-slate-900">
                            {usage.userPrices || 0}
                          </span>
                        </div>
                        <div>
                          Quote items:{" "}
                          <span className="font-semibold text-slate-900">
                            {usage.quoteItems || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSaveEdit(rule)}
                              disabled={isBusy || editPrice == null || !editProductType}
                              className={[
                                "rounded-lg px-2.5 py-1 text-xs font-semibold",
                                isBusy || editPrice == null || !editProductType
                                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                                  : "bg-slate-900 text-white hover:bg-slate-800",
                              ].join(" ")}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              disabled={isBusy}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onStartEdit(rule)}
                              disabled={isBusy}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRule(rule)}
                              disabled={isBusy || usageTotal > 0}
                              className={[
                                "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                                usageTotal > 0
                                  ? "cursor-not-allowed border-slate-200 text-slate-300"
                                  : "border-rose-200 text-rose-600 hover:bg-rose-50",
                              ].join(" ")}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actionError ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <ErrorMessage error={actionError} />
        </div>
      ) : null}
    </div>
  );
}
