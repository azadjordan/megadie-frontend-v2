import { Outlet } from "react-router-dom";
import { useMemo } from "react";

import AccountSidebar from "../account/AccountSidebar";
import AccountBottomNav from "../account/AccountBottomNav";

export default function AccountLayout() {
  const outletContext = useMemo(
    () => ({
      setAccountHeader: () => {},
      clearAccountHeader: () => {},
    }),
    []
  );

  return (
    <div className="relative min-h-[calc(100vh-var(--app-header-h,64px))] font-['Outfit']">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="h-full w-full bg-gradient-to-br from-slate-50 via-white to-violet-50" />
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[-12%] h-80 w-80 rounded-full bg-amber-100/60 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pt-6 lg:pb-10">
        <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--app-header-h,64px)+16px)]">
            <AccountSidebar />
          </aside>

          <section className="min-w-0 space-y-6">
            <Outlet context={outletContext} />
          </section>
        </div>
      </div>

      <AccountBottomNav />
    </div>
  );
}
