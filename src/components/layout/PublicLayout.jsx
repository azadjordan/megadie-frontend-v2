import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from './Header'
import Footer from './Footer'

export default function PublicLayout() {
  const { pathname } = useLocation()
  const user = useSelector(state => state.auth.userInfo)
  const isHome = pathname === '/'
  if (user?.isWorker && !user.isAdmin) return <Navigate to="/packing" replace />

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f3ff]">
      <Header />

      <main className="flex-1">
        {isHome ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-[1360px] px-4 py-6">
            <Outlet />
          </div>
        )}
      </main>

      <Footer className="mt-auto" />
    </div>
  )
}
