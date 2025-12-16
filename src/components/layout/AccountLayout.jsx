// src/components/layout/AccountLayout.jsx
import { Outlet } from 'react-router-dom'
import AccountSidebar from '../account/AccountSidebar'

export default function AccountLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <AccountSidebar />
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
