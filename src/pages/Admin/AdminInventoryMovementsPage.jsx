import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import AdminInventoryTabs from "../../components/admin/AdminInventoryTabs";
import Pagination from "../../components/common/Pagination";
import ErrorMessage from "../../components/common/ErrorMessage";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useGetInventoryMovementsQuery } from "../../features/inventory/inventoryApiSlice";

const MOVEMENT_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "ADJUST_IN", label: "Adjust In" },
  { value: "ADJUST_OUT", label: "Adjust Out" },
  { value: "MOVE", label: "Move" },
  { value: "RESERVE", label: "Reserve" },
  { value: "RELEASE", label: "Release" },
  { value: "DEDUCT", label: "Deduct" },
];

const TYPE_LABELS = {
  ADJUST_IN: "Adjust In",
  ADJUST_OUT: "Adjust Out",
  MOVE: "Move",
  RESERVE: "Reserve",
  RELEASE: "Release",
  DEDUCT: "Deduct",
};

const TYPE_STYLES = {
  ADJUST_IN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ADJUST_OUT: "bg-rose-50 text-rose-700 ring-rose-200",
  MOVE: "bg-slate-100 text-slate-600 ring-slate-200",
  RESERVE: "bg-amber-50 text-amber-700 ring-amber-200",
  RELEASE: "bg-orange-50 text-orange-700 ring-orange-200",
  DEDUCT: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const toDateInputValue = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 10);
};

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
};

const normalizeDateFrom = (value) =>
  value ? `${value}T00:00:00.000` : "";

const normalizeDateTo = (value) =>
  value ? `${value}T23:59:59.999` : "";

const resolveTypeLabel = (type) => TYPE_LABELS[type] || type || "Unknown";

const formatQtyWithSign = (type, qty) => {
  const formatted = formatQty(qty);
  if (type === "ADJUST_IN" || type === "RESERVE") return `+${formatted}`;
  if (type === "ADJUST_OUT" || type === "RELEASE" || type === "DEDUCT") {
    return `-${formatted}`;
  }
  return formatted;
};

const resolveActor = (actor) => {
  if (!actor) return { name: "-", email: "" };
  if (typeof actor === "string") return { name: actor, email: "" };
  const name = actor?.name || actor?.email || "-";
  const email = actor?.name && actor?.email ? actor.email : "";
  return { name, email };
};

const renderSlotLink = (slot) => {
  const slotId = slot?.id || slot?._id;
  const slotLabel = slot?.label || "-";
  if (!slotId) {
    return <span className="font-semibold text-slate-900">{slotLabel}</span>;
  }
  return (
    <Link
      to={`/admin/inventory/slots/${slotId}`}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-slate-900 hover:underline"
    >
      {slotLabel}
    </Link>
  );
};

export default function AdminInventoryMovementsPage() {
  const defaultRange = getDefaultDateRange();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(defaultRange.start);
  const [dateTo, setDateTo] = useState(defaultRange.end);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (typeFilter !== "all") params.type = typeFilter;
    if (debouncedSearch) params.q = debouncedSearch;
    if (dateFrom) params.dateFrom = normalizeDateFrom(dateFrom);
    if (dateTo) params.dateTo = normalizeDateTo(dateTo);
    return params;
  }, [page, limit, typeFilter, debouncedSearch, dateFrom, dateTo]);

  const {
    data: movementsResult,
    isLoading,
    isFetching,
    error,
  } = useGetInventoryMovementsQuery(queryParams);

  const movements = Array.isArray(movementsResult?.rows)
    ? movementsResult.rows
    : [];
  const pagination = movementsResult?.pagination ?? null;
  const totalMovements = pagination?.total ?? movements.length;

  const typeCounts = useMemo(() => {
    const counts = {
      ADJUST_IN: 0,
      ADJUST_OUT: 0,
      MOVE: 0,
      RESERVE: 0,
      RELEASE: 0,
      DEDUCT: 0,
    };
    for (const row of movements) {
      const key = row?.type;
      if (counts[key] !== undefined) counts[key] += 1;
    }
    return counts;
  }, [movements]);

  const outCount =
    typeCounts.ADJUST_OUT + typeCounts.RELEASE + typeCounts.DEDUCT;

  const summaryCards = useMemo(
    () => [
      { label: "Movements", value: formatQty(totalMovements) },
      { label: "Adjust In (page)", value: formatQty(typeCounts.ADJUST_IN) },
      { label: "Adjust Out (page)", value: formatQty(outCount) },
      { label: "Reserve (page)", value: formatQty(typeCounts.RESERVE) },
    ],
    [totalMovements, typeCounts, outCount]
  );

  const resetFilters = () => {
    const nextRange = getDefaultDateRange();
    setQ("");
    setTypeFilter("all");
    setDateFrom(nextRange.start);
    setDateTo(nextRange.end);
    setPage(1);
    setLimit(25);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Inventory</div>
          <div className="text-sm text-slate-500">
            Track stock by product, slot, and allocations.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <div className="text-xs font-semibold text-slate-500">
              {card.label}
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="flex flex-col gap-3">
          <AdminInventoryTabs />

          <div className="grid w-full grid-cols-1 gap-3 md:items-end md:grid-cols-[1fr_200px_170px_170px_160px_auto]">
            <div>
              <label
                htmlFor="movement-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="movement-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Product, slot, order, actor..."
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor="movement-type"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Movement type
              </label>
              <select
                id="movement-type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                {MOVEMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="movement-date-from"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                From
              </label>
              <input
                id="movement-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor="movement-date-to"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                To
              </label>
              <input
                id="movement-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor="movement-limit"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Per page
              </label>
              <select
                id="movement-limit"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value) || 25);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={resetFilters}
              >
                <FiRefreshCw
                  className="mr-1 h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {movements.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {totalMovements}
            </span>{" "}
            movements
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
            {!isDebouncing && isFetching ? (
              <span className="ml-2">(Refreshing...)</span>
            ) : null}
          </div>
          {pagination ? (
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              variant="compact"
            />
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Loading movements...
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Fetching movement ledger.
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : movements.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No movements found
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters to see results.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 w-[220px]">Product</th>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {movements.map((row) => {
                  const type = row?.type || "";
                  const productName = row?.product?.name || "Unknown product";
                  const productSku = row?.product?.sku || "";
                  const slotLabel = row?.slot?.label || "-";
                  const fromSlot = row?.fromSlot;
                  const toSlot = row?.toSlot;
                  const order = row?.order || {};
                  const orderId = order?.id || order?._id || "";
                  const orderNumber = order?.orderNumber || orderId || "-";
                  const { name: actorName, email: actorEmail } = resolveActor(
                    row?.actor
                  );
                  const note = row?.note || "-";
                  const eventAt = row?.eventAt || row?.createdAt;
                  return (
                    <tr key={row?.id || `${type}-${orderNumber}-${productSku}`}>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                            TYPE_STYLES[type] || TYPE_STYLES.MOVE,
                          ].join(" ")}
                        >
                          {resolveTypeLabel(type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQtyWithSign(type, row?.qty)}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div
                          className="truncate font-semibold text-slate-900"
                          title={productName}
                        >
                          {productName}
                        </div>
                        {productSku ? (
                          <div className="truncate text-xs text-slate-500">
                            SKU {productSku}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {type === "MOVE" ? (
                          <div className="text-sm text-slate-900">
                            {renderSlotLink(fromSlot)}
                            <span className="mx-2 text-xs text-slate-400">-&gt;</span>
                            {renderSlotLink(toSlot)}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-900">
                            {slotLabel !== "-" ? renderSlotLink(row?.slot) : "-"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {orderId ? (
                          <Link
                            to={`/admin/orders/${orderId}?tab=stock`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            {orderNumber}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {orderNumber}
                          </span>
                        )}
                        {order?.status ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {order.status}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {actorName}
                        </div>
                        {actorEmail ? (
                          <div className="text-xs text-slate-500">
                            {actorEmail}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDateTime(eventAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {note}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: Movements record every inventory change, including reservations and
        deductions.
      </div>
    </div>
  );
}



