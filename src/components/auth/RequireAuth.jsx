// src/components/auth/RequireAuth.jsx
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function RequireAuth() {
  const location = useLocation()
  const { userInfo, isInitialized } = useSelector((state) => state.auth)

  if (!isInitialized) {
    return (
    <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-900">Checking session…</div>
          <div className="mt-1 text-sm text-slate-600">Please wait.</div>
        </div>
      </div>
    )
  }

  if (!userInfo) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
