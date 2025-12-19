import { Link } from "react-router-dom";

function QuickCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function ActionLink({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{desc}</div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Dashboard</div>
          <div className="text-sm text-slate-500">
            Quick view of what needs attention.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/requests"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            View Requests
          </Link>
          <Link
            to="/admin/invoices"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* KPIs (placeholders for now) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <QuickCard title="Open Requests" value="—" hint="Need negotiation / approval" />
        <QuickCard title="Orders In Progress" value="—" hint="Processing / delivery" />
        <QuickCard title="Unpaid Invoices" value="—" hint="Outstanding balance" />
        <QuickCard title="Overdue Invoices" value="—" hint="Follow up today" />
        <QuickCard title="Payments Today" value="—" hint="Recorded today" />
        <QuickCard title="Total Users" value="—" hint="Registered users" />
      </div>

      {/* Primary navigation cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ActionLink
          to="/admin/requests"
          title="Requests"
          desc="Review new requests, negotiate, then create orders."
        />
        <ActionLink
          to="/admin/orders"
          title="Orders"
          desc="Track created orders and manage delivery / fulfillment."
        />
        <ActionLink
          to="/admin/invoices"
          title="Invoices"
          desc="Create/update invoices and keep balances correct."
        />
        <ActionLink
          to="/admin/payments"
          title="Payments"
          desc="Record payments and audit what was received."
        />
        <ActionLink
          to="/admin/users"
          title="Users"
          desc="Search users and jump to their activity."
        />
        <ActionLink
          to="/admin/inventory"
          title="Inventory"
          desc="Manage products, slots, and move slot contents."
        />
      </div>

      {/* Needs attention */}
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Needs attention</div>
        <div className="mt-1 text-xs text-slate-500">
          We’ll auto-populate this once your admin APIs are ready.
        </div>

        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="text-slate-700">Overdue invoices</span>
            <Link className="text-sm font-semibold text-slate-900 hover:underline" to="/admin/invoices">
              Open
            </Link>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="text-slate-700">Requests awaiting order creation</span>
            <Link className="text-sm font-semibold text-slate-900 hover:underline" to="/admin/requests">
              Open
            </Link>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="text-slate-700">Payments to record</span>
            <Link className="text-sm font-semibold text-slate-900 hover:underline" to="/admin/payments">
              Open
            </Link>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="text-slate-700">User lookup / support</span>
            <Link className="text-sm font-semibold text-slate-900 hover:underline" to="/admin/users">
              Open
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
