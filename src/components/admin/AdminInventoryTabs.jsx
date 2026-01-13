import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/admin/inventory/slots", label: "By Slot" },
  { to: "/admin/inventory/products", label: "By Product" },
  { to: "/admin/inventory/allocations", label: "Allocation Ledger" },
];

export default function AdminInventoryTabs() {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            [
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
