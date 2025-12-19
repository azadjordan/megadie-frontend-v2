import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminInventoryPage() {
  const [tab, setTab] = useState("products"); // products | slots | moves
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");

  const rows = useMemo(() => [], []);
  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Inventory</div>
          <div className="text-sm text-slate-500">
            Manage products, slots, and move slot contents.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tab === "products" ? (
            <Link
              to="/admin/inventory/products/new"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              New Product
            </Link>
          ) : tab === "slots" ? (
            <Link
              to="/admin/inventory/slots/new"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              New Slot
            </Link>
          ) : (
            <Link
              to="/admin/inventory/moves/new"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Move Contents
            </Link>
          )}
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "products", label: "Products" },
              { key: "slots", label: "Slots" },
              { key: "moves", label: "Moves" },
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

          {/* Filter controls */}
          <div className="grid w-full grid-cols-1 gap-2 md:w-auto md:grid-cols-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                tab === "products"
                  ? "Search products..."
                  : tab === "slots"
                  ? "Search slots..."
                  : "Search moves..."
              }
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            {tab === "products"
              ? "No products yet"
              : tab === "slots"
              ? "No slots yet"
              : "No moves yet"}
          </div>

          <div className="mt-1 text-sm text-slate-500">
            {tab === "products"
              ? "Add your first product to start managing inventory."
              : tab === "slots"
              ? "Create slots to organize your inventory locations."
              : "Moves are recorded when you transfer quantities between slots."}
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            {tab === "products" ? (
              <Link
                to="/admin/inventory/products/new"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
              >
                Create a product
              </Link>
            ) : tab === "slots" ? (
              <Link
                to="/admin/inventory/slots/new"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
              >
                Create a slot
              </Link>
            ) : (
              <Link
                to="/admin/inventory/moves/new"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
              >
                Move contents
              </Link>
            )}

            <button
              type="button"
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
              onClick={() => setQ("")}
            >
              Clear search
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    {tab === "products" ? "Product" : tab === "slots" ? "Slot" : "Move"}
                  </th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link
                        to={
                          tab === "products"
                            ? `/admin/inventory/products/${x.id}`
                            : tab === "slots"
                            ? `/admin/inventory/slots/${x.id}`
                            : `/admin/inventory/moves/${x.id}`
                        }
                        className="hover:underline"
                      >
                        {x.name || x.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{x.detail}</td>
                    <td className="px-4 py-3 text-slate-500">{x.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: keep Moves as a guided flow (From slot → To slot → Quantity → Confirm).
      </div>
    </div>
  );
}
