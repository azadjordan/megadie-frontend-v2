// src/components/auth/RequireAuth.jsx
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import DelayedRouteProgress from './DelayedRouteProgress'

export default function RequireAuth() {
  const location = useLocation()
  const { userInfo, isInitialized } = useSelector((state) => state.auth)

  if (!isInitialized) {
    return <DelayedRouteProgress />
  }

  if (!userInfo) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
