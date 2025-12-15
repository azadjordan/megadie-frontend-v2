import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function PublicLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        {isHome ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Outlet />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
