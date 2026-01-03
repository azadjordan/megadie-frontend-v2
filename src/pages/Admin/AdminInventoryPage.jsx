
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";

const PRODUCT_ROWS = [
  {
    id: "prd-001",
    sku: "RB-25-RED",
    name: "Ribbon 25mm Red",
    category: "Ribbons",
    onHand: 240,
    allocated: 60,
    status: "OK",
    lastMovement: "2h ago",
  },
  {
    id: "prd-002",
    sku: "RB-10-WHT",
    name: "Ribbon 10mm White",
    category: "Ribbons",
    onHand: 38,
    allocated: 12,
    status: "Low",
    lastMovement: "Yesterday",
  },
  {
    id: "prd-003",
    sku: "BX-KRAFT-M",
    name: "Kraft Box Medium",
    category: "Packaging",
    onHand: 120,
    allocated: 30,
    status: "OK",
    lastMovement: "Today 08:10",
  },
  {
    id: "prd-004",
    sku: "FLR-ROSE-RED",
    name: "Rose Red",
    category: "Flowers",
    onHand: 0,
    allocated: 0,
    status: "Out",
    lastMovement: "3 days ago",
  },
  {
    id: "prd-005",
    sku: "TAG-THANK-YOU",
    name: "Thank You Tag",
    category: "Accessories",
    onHand: 520,
    allocated: 140,
    status: "OK",
    lastMovement: "Today 07:30",
  },
];

const SLOT_ROWS = [
  {
    id: "slot-a1-02",
    label: "A1-02",
    store: "Main Store",
    unit: "Shelf A1",
    position: "Left",
    skuCount: 12,
    totalQty: 420,
    status: "Active",
    updatedAt: "Today 09:12",
  },
  {
    id: "slot-a1-03",
    label: "A1-03",
    store: "Main Store",
    unit: "Shelf A1",
    position: "Right",
    skuCount: 5,
    totalQty: 120,
    status: "Low",
    updatedAt: "Yesterday",
  },
  {
    id: "slot-b2-01",
    label: "B2-01",
    store: "Main Store",
    unit: "Shelf B2",
    position: "Center",
    skuCount: 9,
    totalQty: 300,
    status: "Active",
    updatedAt: "Today 08:50",
  },
  {
    id: "slot-ov-01",
    label: "OV-01",
    store: "Overflow",
    unit: "Rack 4",
    position: "Top",
    skuCount: 0,
    totalQty: 0,
    status: "Empty",
    updatedAt: "Last week",
  },
  {
    id: "slot-c3-02",
    label: "C3-02",
    store: "Main Store",
    unit: "Shelf C3",
    position: "Left",
    skuCount: 3,
    totalQty: 60,
    status: "Low",
    updatedAt: "Today 09:00",
  },
];
const MOVE_ROWS = [
  {
    id: "mov-001",
    at: "Today 09:42",
    sku: "RB-25-RED",
    product: "Ribbon 25mm Red",
    type: "Add",
    qty: 50,
    slot: "A1-02",
    store: "Main Store",
    by: "Mina",
    note: "Restock",
  },
  {
    id: "mov-002",
    at: "Today 09:10",
    sku: "RB-10-WHT",
    product: "Ribbon 10mm White",
    type: "Adjust",
    qty: -5,
    slot: "A1-03",
    store: "Main Store",
    by: "Alaa",
    note: "Damaged spool",
  },
  {
    id: "mov-003",
    at: "Yesterday 16:30",
    sku: "BX-KRAFT-M",
    product: "Kraft Box Medium",
    type: "Move",
    qty: 40,
    slot: "B2-01 -> OV-01",
    store: "Main Store",
    by: "Hadi",
    note: "Overflow",
  },
  {
    id: "mov-004",
    at: "Yesterday 14:20",
    sku: "TAG-THANK-YOU",
    product: "Thank You Tag",
    type: "Deduct",
    qty: -80,
    slot: "A1-03",
    store: "Main Store",
    by: "Sara",
    note: "Order ORD-1049",
  },
];

const ALLOCATION_ORDERS = [
  {
    id: "ord-1052",
    orderNumber: "ORD-1052",
    customer: "Sara M.",
    status: "Allocated",
    pickedAt: "Today 10:12",
    items: [
      {
        id: "ord-1052-1",
        sku: "RB-25-RED",
        product: "Ribbon 25mm Red",
        slot: "A1-02",
        qty: 12,
        picker: "Nour",
      },
      {
        id: "ord-1052-2",
        sku: "BX-KRAFT-M",
        product: "Kraft Box Medium",
        slot: "B2-01",
        qty: 4,
        picker: "Nour",
      },
      {
        id: "ord-1052-3",
        sku: "TAG-THANK-YOU",
        product: "Thank You Tag",
        slot: "A1-03",
        qty: 20,
        picker: "Nour",
      },
    ],
  },
  {
    id: "ord-1053",
    orderNumber: "ORD-1053",
    customer: "Amal A.",
    status: "Partially Allocated",
    pickedAt: "Today 09:20",
    items: [
      {
        id: "ord-1053-1",
        sku: "RB-10-WHT",
        product: "Ribbon 10mm White",
        slot: "A1-03",
        qty: 8,
        picker: "Omar",
      },
      {
        id: "ord-1053-2",
        sku: "FLR-ROSE-RED",
        product: "Rose Red",
        slot: "OV-01",
        qty: 5,
        picker: "Omar",
      },
    ],
  },
];

const STATUS_STYLES = {
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Low: "bg-amber-50 text-amber-700 ring-amber-200",
  Out: "bg-rose-50 text-rose-700 ring-rose-200",
};

const SLOT_STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Low: "bg-amber-50 text-amber-700 ring-amber-200",
  Empty: "bg-slate-100 text-slate-600 ring-slate-200",
};

const MOVE_TYPE_STYLES = {
  Add: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Adjust: "bg-amber-50 text-amber-700 ring-amber-200",
  Move: "bg-slate-100 text-slate-700 ring-slate-200",
  Deduct: "bg-rose-50 text-rose-700 ring-rose-200",
};

const ALLOCATION_STATUS_STYLES = {
  Allocated: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Partially Allocated": "bg-amber-50 text-amber-700 ring-amber-200",
};

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const sumBy = (rows, key) =>
  rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

const uniqueCount = (rows, key) => new Set(rows.map((row) => row[key])).size;
export default function AdminInventoryPage() {
  const [tab, setTab] = useState("products");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [productStatus, setProductStatus] = useState("all");
  const [slotStore, setSlotStore] = useState("all");
  const [moveType, setMoveType] = useState("all");
  const [allocationStatus, setAllocationStatus] = useState("all");

  const allocationRows = useMemo(
    () =>
      ALLOCATION_ORDERS.map((order) => {
        const totalQty = order.items.reduce(
          (sum, item) => sum + (Number(item.qty) || 0),
          0
        );
        return {
          ...order,
          skuCount: order.items.length,
          totalQty,
        };
      }),
    []
  );

  const normalizedQuery = q.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (tab === "products") {
      let result = PRODUCT_ROWS;
      if (normalizedQuery) {
        result = result.filter((row) =>
          `${row.sku} ${row.name}`.toLowerCase().includes(normalizedQuery)
        );
      }
      if (productStatus !== "all") {
        result = result.filter(
          (row) => row.status.toLowerCase() === productStatus
        );
      }
      return result;
    }

    if (tab === "slots") {
      let result = SLOT_ROWS;
      if (normalizedQuery) {
        result = result.filter((row) =>
          `${row.label} ${row.store} ${row.unit}`
            .toLowerCase()
            .includes(normalizedQuery)
        );
      }
      if (slotStore !== "all") {
        result = result.filter(
          (row) => row.store.toLowerCase() === slotStore
        );
      }
      return result;
    }

    if (tab === "moves") {
      let result = MOVE_ROWS;
      if (normalizedQuery) {
        result = result.filter((row) =>
          `${row.sku} ${row.product} ${row.slot} ${row.by}`
            .toLowerCase()
            .includes(normalizedQuery)
        );
      }
      if (moveType !== "all") {
        result = result.filter((row) => row.type.toLowerCase() === moveType);
      }
      return result;
    }

    let result = allocationRows;
    if (normalizedQuery) {
      result = result.filter((row) =>
        `${row.orderNumber} ${row.customer}`
          .toLowerCase()
          .includes(normalizedQuery)
      );
    }
    if (allocationStatus !== "all") {
      result = result.filter(
        (row) => row.status.toLowerCase() === allocationStatus
      );
    }
    return result;
  }, [
    tab,
    normalizedQuery,
    productStatus,
    slotStore,
    moveType,
    allocationStatus,
    allocationRows,
  ]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    if (sort === "name") {
      rows.sort((a, b) => {
        const aName =
          tab === "products"
            ? a.name
            : tab === "slots"
            ? a.label
            : tab === "moves"
            ? a.sku
            : a.orderNumber;
        const bName =
          tab === "products"
            ? b.name
            : tab === "slots"
            ? b.label
            : tab === "moves"
            ? b.sku
            : b.orderNumber;
        return String(aName).localeCompare(String(bName));
      });
    } else if (sort === "qty") {
      rows.sort((a, b) => {
        const aQty =
          tab === "products"
            ? Number(a.onHand) || 0
            : tab === "slots"
            ? Number(a.totalQty) || 0
            : tab === "moves"
            ? Math.abs(Number(a.qty) || 0)
            : Number(a.totalQty) || 0;
        const bQty =
          tab === "products"
            ? Number(b.onHand) || 0
            : tab === "slots"
            ? Number(b.totalQty) || 0
            : tab === "moves"
            ? Math.abs(Number(b.qty) || 0)
            : Number(b.totalQty) || 0;
        return bQty - aQty;
      });
    }
    return rows;
  }, [filteredRows, sort, tab]);

  const totalItems =
    tab === "products"
      ? PRODUCT_ROWS.length
      : tab === "slots"
      ? SLOT_ROWS.length
      : tab === "moves"
      ? MOVE_ROWS.length
      : allocationRows.length;

  const countLabel =
    tab === "products"
      ? "SKUs"
      : tab === "slots"
      ? "slots"
      : tab === "moves"
      ? "logs"
      : "orders";

  const summaryCards = useMemo(() => {
    if (tab === "products") {
      return [
        { label: "SKUs", value: formatQty(PRODUCT_ROWS.length) },
        { label: "On-hand", value: formatQty(sumBy(PRODUCT_ROWS, "onHand")) },
        { label: "Allocated", value: formatQty(sumBy(PRODUCT_ROWS, "allocated")) },
        {
          label: "Low stock",
          value: formatQty(
            PRODUCT_ROWS.filter((row) => row.status !== "OK").length
          ),
        },
      ];
    }

    if (tab === "slots") {
      return [
        { label: "Slots", value: formatQty(SLOT_ROWS.length) },
        { label: "Stores", value: formatQty(uniqueCount(SLOT_ROWS, "store")) },
        { label: "Total qty", value: formatQty(sumBy(SLOT_ROWS, "totalQty")) },
        {
          label: "Empty",
          value: formatQty(SLOT_ROWS.filter((row) => row.totalQty === 0).length),
        },
      ];
    }

    if (tab === "moves") {
      return [
        { label: "Logs", value: formatQty(MOVE_ROWS.length) },
        {
          label: "Adds",
          value: formatQty(MOVE_ROWS.filter((row) => row.type === "Add").length),
        },
        {
          label: "Deductions",
          value: formatQty(
            MOVE_ROWS.filter((row) => row.type === "Deduct").length
          ),
        },
        {
          label: "Adjustments",
          value: formatQty(
            MOVE_ROWS.filter((row) => row.type === "Adjust").length
          ),
        },
      ];
    }

    return [
      { label: "Orders", value: formatQty(allocationRows.length) },
      {
        label: "Allocated qty",
        value: formatQty(sumBy(allocationRows, "totalQty")),
      },
      {
        label: "Fully allocated",
        value: formatQty(
          allocationRows.filter((row) => row.status === "Allocated").length
        ),
      },
      {
        label: "Partially allocated",
        value: formatQty(
          allocationRows.filter((row) => row.status !== "Allocated").length
        ),
      },
    ];
  }, [tab, allocationRows]);

  const primaryActionLabel =
    tab === "products"
      ? "Add to Stock"
      : tab === "slots"
      ? "Add Product"
      : tab === "moves"
      ? "New Movement"
      : "Deduct Allocations";

  const resetFilters = () => {
    setQ("");
    setSort("recent");
    setProductStatus("all");
    setSlotStore("all");
    setMoveType("all");
    setAllocationStatus("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Inventory</div>
          <div className="text-sm text-slate-500">
            Track stock by product, slot, movement logs, and allocations.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {primaryActionLabel}
          </button>
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
          <div className="flex flex-wrap gap-2">
            {[
              { key: "products", label: "By Product" },
              { key: "slots", label: "By Slot" },
              { key: "moves", label: "Movement Logs" },
              { key: "allocations", label: "Allocations" },
            ].map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-[1fr_190px_190px_auto] lg:items-end">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                tab === "products"
                  ? "Search SKU or product name..."
                  : tab === "slots"
                  ? "Search slot or store..."
                  : tab === "moves"
                  ? "Search SKU, slot, or user..."
                  : "Search order number or customer..."
              }
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />

            {tab === "products" ? (
              <select
                value={productStatus}
                onChange={(e) => setProductStatus(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All status</option>
                <option value="ok">OK</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
            ) : tab === "slots" ? (
              <select
                value={slotStore}
                onChange={(e) => setSlotStore(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All stores</option>
                <option value="main store">Main Store</option>
                <option value="overflow">Overflow</option>
              </select>
            ) : tab === "moves" ? (
              <select
                value={moveType}
                onChange={(e) => setMoveType(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All types</option>
                <option value="add">Add</option>
                <option value="deduct">Deduct</option>
                <option value="adjust">Adjust</option>
                <option value="move">Move</option>
              </select>
            ) : (
              <select
                value={allocationStatus}
                onChange={(e) => setAllocationStatus(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All status</option>
                <option value="allocated">Allocated</option>
                <option value="partially allocated">Partially Allocated</option>
              </select>
            )}

            <div className="flex items-end gap-2 lg:justify-end">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="recent">Most recent</option>
                <option value="name">Name</option>
                <option value="qty">Quantity</option>
              </select>

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

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredRows.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
              {countLabel}
            </div>
          </div>
        </div>
      </div>
      {filteredRows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            {tab === "products"
              ? "No products found"
              : tab === "slots"
              ? "No slots found"
              : tab === "moves"
              ? "No movement logs"
              : "No allocations found"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters to see results.
          </div>
        </div>
      ) : tab === "products" ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">On-hand</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => {
                  const available = Math.max(
                    0,
                    Number(row.onHand || 0) - Number(row.allocated || 0)
                  );
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {row.sku}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.category}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/inventory/products/${row.id}`}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="text-xs text-slate-500">
                          Last move: {row.lastMovement}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(row.onHand)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(row.allocated)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatQty(available)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                            STATUS_STYLES[row.status] || STATUS_STYLES.OK,
                          ].join(" ")}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Locate
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Add stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "slots" ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3 text-right">SKU count</th>
                  <th className="px-4 py-3 text-right">Total qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/inventory/slots/${row.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {row.label}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {row.unit} - {row.position}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {row.store}
                      </div>
                      <div className="text-xs text-slate-500">
                        Updated {row.updatedAt}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatQty(row.skuCount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatQty(row.totalQty)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                          SLOT_STATUS_STYLES[row.status] ||
                            SLOT_STATUS_STYLES.Active,
                        ].join(" ")}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Show contents
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Add product
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "moves" ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.at}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {row.sku}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.product}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                          MOVE_TYPE_STYLES[row.type] || MOVE_TYPE_STYLES.Move,
                        ].join(" ")}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.qty > 0 ? `+${formatQty(row.qty)}` : formatQty(row.qty)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {row.slot}
                      </div>
                      <div className="text-xs text-slate-500">{row.store}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.by}</td>
                    <td className="px-4 py-3 text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRows.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Order {order.orderNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    {order.customer} - {order.skuCount} SKUs -{" "}
                    {formatQty(order.totalQty)} units
                  </div>
                  <div className="text-xs text-slate-500">
                    Picked at {order.pickedAt}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                      ALLOCATION_STATUS_STYLES[order.status] ||
                        ALLOCATION_STATUS_STYLES.Allocated,
                    ].join(" ")}
                  >
                    {order.status}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Review picks
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Deduct now
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  <div className="col-span-3">SKU</div>
                  <div className="col-span-4">Product</div>
                  <div className="col-span-3">Slot</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-1">Picker</div>
                </div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-700 last:border-b-0"
                  >
                    <div className="col-span-3 font-semibold text-slate-900">
                      {item.sku}
                    </div>
                    <div className="col-span-4">{item.product}</div>
                    <div className="col-span-3">{item.slot}</div>
                    <div className="col-span-1 text-right tabular-nums">
                      {formatQty(item.qty)}
                    </div>
                    <div className="col-span-1 text-slate-500">
                      {item.picker}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: Allocations are picks that have not been deducted from stock yet.
      </div>
    </div>
  );
}



