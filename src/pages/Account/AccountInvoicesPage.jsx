// src/pages/Account/AccountInvoicesPage.jsx
export default function AccountInvoicesPage() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
      <p className="mt-1 text-sm text-slate-600">
        Your invoices will appear here. Payments will be shown inside invoices.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Coming next: list invoices, download PDF, show payment status.
      </div>
    </div>
  )
}
