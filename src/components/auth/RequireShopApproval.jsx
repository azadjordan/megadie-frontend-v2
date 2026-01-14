// src/components/auth/RequireShopApproval.jsx
import { useSelector } from "react-redux";
import { Link, Outlet } from "react-router-dom";

export default function RequireShopApproval() {
  const { userInfo } = useSelector((state) => state.auth);
  const status = userInfo?.approvalStatus;

  const isApproved =
    userInfo?.isAdmin || !status || status === "Approved";

  if (isApproved) return <Outlet />;

  const isRejected = status === "Rejected";
  const title = isRejected ? "Shop access denied" : "Shop access pending";
  const bannerTone = isRejected
    ? "bg-rose-50 text-rose-700 ring-rose-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
  const message = isRejected
    ? "Your account was rejected. Please contact support if you believe this is a mistake."
    : "Your account is pending approval. We'll notify you as soon as access is granted.";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10">
      <div className={`rounded-2xl p-4 ring-1 ${bannerTone}`}>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs">{message}</div>
      </div>

      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          You can still manage your account
        </div>
        <p className="mt-2 text-sm text-slate-600">
          While you wait for approval, you can review your profile or contact us
          if you need help.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/account/profile"
            className="inline-flex items-center rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
            style={{ backgroundColor: "var(--accent, #7c3aed)" }}
          >
            Go to profile
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
