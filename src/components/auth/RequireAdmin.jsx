// src/components/auth/RequireAdmin.jsx
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function RequireAdmin() {
  const location = useLocation()
  const { userInfo, isInitialized } = useSelector((state) => state.auth)

  // Wait for AuthBootstrap to finish
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

  // Not logged in → go to login, preserve intended destination
  if (!userInfo) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but not admin → send home
  if (!userInfo.isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
