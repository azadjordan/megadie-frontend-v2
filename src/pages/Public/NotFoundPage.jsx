// src/pages/Public/NotFoundPage.jsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you’re looking for doesn’t exist or was moved.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Go home
        </Link>

        <Link
          to="/shop"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Go to shop
        </Link>
      </div>
    </div>
  )
}
