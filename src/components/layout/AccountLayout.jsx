// src/components/layout/AccountLayout.jsx
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import AccountSidebar from "../account/AccountSidebar";
import AccountHeader from "../account/AccountHeader";

const EMPTY = { back: null, title: "", subtitle: "", right: null, bottom: null };

export default function AccountLayout() {
  const location = useLocation();
  const [header, setHeader] = useState(EMPTY);

  useEffect(() => {
    setHeader(EMPTY);
  }, [location.pathname]);

  const outletContext = useMemo(
    () => ({
      setAccountHeader: (next) =>
        setHeader((prev) => ({ ...prev, ...(next || {}) })),
      clearAccountHeader: () => setHeader(EMPTY),
    }),
    []
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-1">
      <div className="grid items-start gap-4 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="md:sticky md:top-[calc(var(--app-header-h,64px)+12px)] md:self-start">
          <AccountSidebar />
        </aside>

        {/* Right side */}
        <section className="min-w-0 flex flex-col gap-4">
          <AccountHeader {...header} />
          {/* ✅ normal page flow scrolling */}
          <Outlet context={outletContext} />
        </section>
      </div>
    </div>
  );
}
