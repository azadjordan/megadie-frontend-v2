// src/components/auth/RequireAdmin.jsx
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FiShield } from 'react-icons/fi'

import RouteStatePage from '../common/RouteStatePage'

export default function RequireAdmin() {
  const location = useLocation()
  const { userInfo, isInitialized } = useSelector((state) => state.auth)

  // Wait for AuthBootstrap to finish
  if (!isInitialized) {
    return (
      <div className="mx-auto max-w-[1360px] px-4 py-10">
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

  // Logged in but not admin.
  if (!userInfo.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <RouteStatePage
          eyebrow="Access denied"
          title="This area is reserved for admins"
          message="You are signed in, but this account does not have permission to open the admin workspace."
          icon={FiShield}
          tone="rose"
          actions={[
            { label: "Go to account", to: "/account/overview", variant: "primary" },
            { label: "Go home", to: "/" },
            { label: "Contact support", to: "/contact" },
          ]}
        />
      </div>
    )
  }

  return <Outlet />
}
