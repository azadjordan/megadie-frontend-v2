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

export default function AdminPriceRulesPage() {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetPriceRulesQuery();

  const [createPriceRule, { isLoading: isCreating, error: createError }] =
    useCreatePriceRuleMutation();
  const [updatePriceRule, { isLoading: isUpdating, error: updateError }] =
    useUpdatePriceRuleMutation();
  const [deletePriceRule, { isLoading: isDeleting, error: deleteError }] =
    useDeletePriceRuleMutation();

  const [newCode, setNewCode] = useState("");
  const [newPriceStr, setNewPriceStr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editPriceStr, setEditPriceStr] = useState("");

  const rules = useMemo(() => data?.data || [], [data]);
  const isBusy = isCreating || isUpdating || isDeleting;

  useEffect(() => {
    if (editId && !rules.some((rule) => rule._id === editId)) {
      setEditId(null);
      setEditPriceStr("");
    }
  }, [editId, rules]);

  const newPrice = parsePrice(newPriceStr);
  const canAdd = newCode.trim().length > 0 && newPrice != null && !isCreating;

  const actionError = createError || updateError || deleteError;

  const onAddRule = async () => {
    if (!canAdd) return;
    try {
      await createPriceRule({
        code: newCode.trim(),
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
  };

  const onCancelEdit = () => {
    setEditId(null);
    setEditPriceStr("");
  };

  const onSaveEdit = async (rule) => {
    const price = parsePrice(editPriceStr);
    if (!rule?._id || price == null) return;
    try {
      await updatePriceRule({ id: rule._id, defaultPrice: price }).unwrap();
      setEditId(null);
      setEditPriceStr("");
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
        {isFetching ? (
          <div className="text-xs font-semibold text-slate-400">
            Refreshing...
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs font-semibold text-slate-700">Add rule</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder="RULE-CODE"
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
          Codes are stored in uppercase and must be unique.
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
            No price rules yet
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Create a rule to start assigning prices.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rule code</th>
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

                  return (
                    <tr key={rule._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                        {rule.code}
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
                              disabled={isBusy || editPrice == null}
                              className={[
                                "rounded-lg px-2.5 py-1 text-xs font-semibold",
                                isBusy || editPrice == null
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
