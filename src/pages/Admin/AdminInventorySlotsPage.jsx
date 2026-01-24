import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import Pagination from "../../components/common/Pagination";
import AdminInventoryTabs from "../../components/admin/AdminInventoryTabs";
import {
  useGetSlotsQuery,
  useGetSlotSummaryQuery,
  useRebuildSlotOccupancyMutation,
} from "../../features/slots/slotsApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const SLOT_STORE_TABS = [
  { label: "All stores", value: "all" },
  { label: "AE1", value: "AE1" },
  { label: "AE2", value: "AE2" },
];

const SLOT_STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatNumber = (value, maxDigits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(n);
};

const formatSummaryValue = (value) =>
  typeof value === "number" ? formatQty(value) : "--";

const formatDate = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const SLOT_SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Fullness (high)", value: "fillPercent:desc" },
  { label: "Fullness (low)", value: "fillPercent:asc" },
  { label: "Occupied CBM (high)", value: "occupiedCbm:desc" },
  { label: "Occupied CBM (low)", value: "occupiedCbm:asc" },
];

export default function AdminInventorySlotsPage() {
  const [q, setQ] = useState("");
  const [slotStore, setSlotStore] = useState("all");
  const [slotUnit, setSlotUnit] = useState("all");
  const [slotSort, setSlotSort] = useState("default");
  const [slotPage, setSlotPage] = useState(1);
  const [slotLimit, setSlotLimit] = useState(25);
  const [occupancyMessage, setOccupancyMessage] = useState("");
  const [occupancyError, setOccupancyError] = useState("");

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const slotParams = useMemo(() => {
    const params = { page: slotPage, limit: slotLimit };
    if (debouncedSearch) params.q = debouncedSearch;
    if (slotStore !== "all") params.store = slotStore;
    if (slotUnit !== "all") params.unit = slotUnit;
    if (slotSort !== "default") {
      const [sortField, sortOrder] = slotSort.split(":");
      if (sortField) params.sort = sortField;
      if (sortOrder) params.order = sortOrder;
    }
    return params;
  }, [debouncedSearch, slotStore, slotUnit, slotSort, slotPage, slotLimit]);

  const slotSummaryParams = useMemo(() => {
    const params = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (slotStore !== "all") params.store = slotStore;
    if (slotUnit !== "all") params.unit = slotUnit;
    return params;
  }, [debouncedSearch, slotStore, slotUnit]);

  const {
    data: slotsListData,
    isLoading: slotsListLoading,
    isFetching: slotsListFetching,
    error: slotsListError,
  } = useGetSlotsQuery(slotParams);
  const { data: slotSummaryData } = useGetSlotSummaryQuery(slotSummaryParams);
  const [rebuildSlotOccupancy, { isLoading: rebuildingOccupancy }] =
    useRebuildSlotOccupancyMutation();

  const slotRows = slotsListData?.rows ?? [];
  const slotPagination = slotsListData?.pagination ?? null;
  const slotLoading = slotsListLoading || slotsListFetching;
  const slotError = slotsListError;
  const slotErrorMessage =
    slotError?.data?.message || slotError?.error || "Unable to load slots.";
  const slotTotal = slotPagination?.total ?? slotRows.length;
  const slotSummary = slotSummaryData || null;
  const slotSummaryTotal =
    typeof slotSummary?.totalSlots === "number" ? slotSummary.totalSlots : null;
  const slotSummaryInactive =
    typeof slotSummary?.inactiveSlots === "number"
      ? slotSummary.inactiveSlots
      : null;
  const slotSummaryStores =
    typeof slotSummary?.storesCount === "number"
      ? slotSummary.storesCount
      : Array.isArray(slotSummary?.stores)
      ? slotSummary.stores.length
      : null;

  const slotStoreOptions = useMemo(() => {
    const summaryStores = Array.isArray(slotSummary?.stores)
      ? slotSummary.stores
      : [];
    const normalized = summaryStores
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set(normalized));
    const fallback = SLOT_STORE_TABS.filter((opt) => opt.value !== "all").map(
      (opt) => opt.value
    );
    const stores = unique.length ? unique : fallback;
    return [
      { label: "All stores", value: "all" },
      ...stores.map((value) => ({ label: value, value })),
    ];
  }, [slotSummary]);

  const slotUnitOptions = useMemo(() => {
    const summaryUnits = Array.isArray(slotSummary?.units)
      ? slotSummary.units
      : [];
    const normalized = summaryUnits
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set(normalized));
    return [
      { label: "All units", value: "all" },
      ...unique.map((value) => ({ label: value, value })),
    ];
  }, [slotSummary]);

  const filteredRows = slotRows;
  const sortedRows = slotRows;

  const summaryCards = useMemo(
    () => [
      {
        label: "Slots",
        value: formatSummaryValue(slotSummaryTotal ?? slotTotal),
      },
      { label: "Inactive", value: formatSummaryValue(slotSummaryInactive) },
      { label: "Stores", value: formatSummaryValue(slotSummaryStores) },
    ],
    [slotSummaryTotal, slotSummaryInactive, slotSummaryStores, slotTotal]
  );

  const resetFilters = () => {
    setQ("");
    setSlotStore("all");
    setSlotUnit("all");
    setSlotSort("default");
    setSlotPage(1);
    setSlotLimit(25);
  };

  const handleRebuildOccupancy = async () => {
    setOccupancyMessage("");
    setOccupancyError("");
    try {
      const params = slotStore !== "all" ? { store: slotStore } : undefined;
      const response = await rebuildSlotOccupancy(params).unwrap();
      const updated = response?.data?.updated ?? 0;
      const targetStore = response?.data?.store || "all stores";
      setOccupancyMessage(
        `Rebuilt occupancy for ${targetStore} (${updated} slots).`
      );
    } catch (err) {
      setOccupancyError(
        err?.data?.message || err?.error || "Unable to rebuild occupancy."
      );
    }
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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

          <div className="grid w-full grid-cols-1 gap-3 md:items-end md:grid-cols-[1fr_170px_170px_180px_160px_auto]">
            <div>
              <label
                htmlFor="inventory-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="inventory-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSlotPage(1);
                }}
                placeholder="Search slot or store..."
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-store"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Store
              </label>
              <select
                id="inventory-store"
                value={slotStore}
                onChange={(e) => {
                  setSlotStore(e.target.value);
                  setSlotPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                {slotStoreOptions.map((store) => (
                  <option key={store.value} value={store.value}>
                    {store.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="inventory-unit"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Unit
              </label>
              <select
                id="inventory-unit"
                value={slotUnit}
                onChange={(e) => {
                  setSlotUnit(e.target.value);
                  setSlotPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                {slotUnitOptions.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="inventory-slot-sort"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Sort
              </label>
              <select
                id="inventory-slot-sort"
                value={slotSort}
                onChange={(e) => {
                  setSlotSort(e.target.value);
                  setSlotPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                {SLOT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="inventory-slot-limit"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Per page
              </label>
              <select
                id="inventory-slot-limit"
                value={slotLimit}
                onChange={(e) => {
                  setSlotLimit(Number(e.target.value) || 50);
                  setSlotPage(1);
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
              {filteredRows.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{slotTotal}</span>{" "}
            slots
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
          </div>
          {slotPagination ? (
            <Pagination
              pagination={slotPagination}
              onPageChange={setSlotPage}
              variant="compact"
            />
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              Occupancy rebuild
            </div>
            <div className="text-xs text-slate-500">
              Use this after deploying occupancy tracking or if CBM data changes
              and the percentages look incorrect.{" "}
              {slotStore !== "all"
                ? `Runs for ${slotStore} only. Clear Store filter to rebuild all.`
                : "Runs for all stores."}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRebuildOccupancy}
            disabled={rebuildingOccupancy}
            className={[
              "rounded-xl px-3 py-2 text-xs font-semibold transition",
              rebuildingOccupancy
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-slate-900 text-white hover:bg-slate-800",
            ].join(" ")}
          >
            {rebuildingOccupancy ? "Rebuilding..." : "Rebuild occupancy"}
          </button>
        </div>
        {occupancyMessage ? (
          <div className="mt-2 text-xs font-semibold text-emerald-700">
            {occupancyMessage}
          </div>
        ) : null}
        {occupancyError ? (
          <div className="mt-2 text-xs font-semibold text-rose-600">
            {occupancyError}
          </div>
        ) : null}
      </div>

      {slotLoading ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Loading slots...
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Fetching latest slot list.
          </div>
        </div>
      ) : slotError ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Unable to load slots
          </div>
          <div className="mt-1 text-sm text-slate-500">{slotErrorMessage}</div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No slots found
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
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Occupancy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => {
                  const slotId = row._id || row.id || row.label;
                  const slotLabel = row.label || "Unknown slot";
                  const unitLabel = row.unit || "-";
                  const positionLabel = row.position ?? "-";
                  const slotStatus =
                    row.isActive === false ? "Inactive" : "Active";
                  const capacityCbm = Number(row.cbm) || 0;
                  const occupiedCbm =
                    typeof row.occupiedCbm === "number" ? row.occupiedCbm : 0;
                  const fillPercent =
                    typeof row.fillPercent === "number"
                      ? row.fillPercent
                      : capacityCbm > 0
                      ? (occupiedCbm / capacityCbm) * 100
                      : 0;
                  const safeFillPercent = Number.isFinite(fillPercent)
                    ? fillPercent
                    : 0;
                  const displayPercent = Math.max(0, safeFillPercent);
                  const barPercent = Math.min(100, displayPercent);
                  const isOverCapacity = displayPercent > 100;
                  return (
                    <tr key={slotId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {slotLabel}
                        </div>
                        <div className="text-xs text-slate-500">
                          Unit {unitLabel} / Pos {positionLabel}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex w-40 flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              {formatNumber(occupiedCbm)} /{" "}
                              {formatNumber(capacityCbm)} CBM
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={[
                                  "font-semibold",
                                  isOverCapacity
                                    ? "text-rose-600"
                                    : "text-slate-700",
                                ].join(" ")}
                              >
                                {Math.round(displayPercent)}%
                              </span>
                              {isOverCapacity ? (
                                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                                  Over
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className={[
                                "h-2 rounded-full",
                                isOverCapacity
                                  ? "bg-rose-500"
                                  : "bg-emerald-500",
                              ].join(" ")}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                            SLOT_STATUS_STYLES[slotStatus] ||
                              SLOT_STATUS_STYLES.Active,
                          ].join(" ")}
                        >
                          {slotStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        {formatDate(row.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/inventory/slots/${slotId}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Contents
                        </Link>
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
        Tip: Allocations are reservations that have not been deducted from stock
        yet.
      </div>
    </div>
  );
}
