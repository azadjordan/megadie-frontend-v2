import { Link } from "react-router-dom";

export default function AdminPaymentCreatePage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">Add Payment</div>
          <div className="text-sm text-slate-500">
            Record a payment received for an invoice.
          </div>
        </div>

        <Link
          to="/admin/payments"
          className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Back to payments
        </Link>
      </div>

      {/* Placeholder form */}
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Payment form (coming soon)
        </div>
        <div className="mt-1 text-sm text-slate-500">
          This page will let admins:
        </div>

        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Select an invoice</li>
          <li>Enter payment amount</li>
          <li>Choose payment method</li>
          <li>Add reference / notes</li>
          <li>Confirm and save</li>
        </ul>
      </div>

      {/* UX note */}
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">UX note</div>
        <div className="mt-1 text-sm text-slate-500">
          Payments should be immutable. If a mistake happens, handle it with
          an adjustment or admin-only correction flow.
        </div>
      </div>
    </div>
  );
}
