// src/components/auth/RequireAuth.jsx
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import DelayedRouteProgress from './DelayedRouteProgress'
import SessionCheckFailed from './SessionCheckFailed'

export default function RequireAuth() {
  const location = useLocation()
  const { userInfo, isInitialized, sessionCheckError } = useSelector(
    (state) => state.auth,
  )

  if (!isInitialized) {
    return <DelayedRouteProgress />
  }

  if (!userInfo && sessionCheckError) {
    return <SessionCheckFailed />
  }

  if (!userInfo) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
