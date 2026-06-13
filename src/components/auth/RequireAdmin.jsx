// src/components/auth/RequireAdmin.jsx
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FiShield } from 'react-icons/fi'

import RouteStatePage from '../common/RouteStatePage'
import DelayedRouteProgress from './DelayedRouteProgress'
import SessionCheckFailed from './SessionCheckFailed'

export default function RequireAdmin() {
  const location = useLocation()
  const { userInfo, isInitialized, sessionCheckError } = useSelector(
    (state) => state.auth,
  )

  // Wait for AuthBootstrap to finish
  if (!isInitialized) {
    return <DelayedRouteProgress />
  }

  if (!userInfo && sessionCheckError) {
    return <SessionCheckFailed />
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
