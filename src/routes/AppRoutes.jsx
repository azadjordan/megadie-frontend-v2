// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import ForgotPasswordPage from "../pages/Auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";

import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";

import HomePage from "../pages/Public/HomePage";
import ShopPage from "../pages/Public/ShopPage";
import CartPage from "../pages/Public/CartPage";

import AboutPage from "../pages/Public/AboutPage";
import ContactPage from "../pages/Public/ContactPage";
import PrivacyPolicyPage from "../pages/Public/PrivacyPolicyPage";
import TermsPage from "../pages/Public/TermsPage";
import NotFoundPage from "../pages/Public/NotFoundPage";

import LoginPage from "../pages/Auth/LoginPage";
import RegisterPage from "../pages/Auth/RegisterPage";

// Admin pages
import AdminDashboardPage from "../pages/Admin/AdminDashboardPage";
import AdminRequestsPage from "../pages/Admin/AdminRequestsPage";
import AdminOrdersPage from "../pages/Admin/AdminOrdersPage";
import AdminInvoicesPage from "../pages/Admin/AdminInvoicesPage";
import AdminInventoryPage from "../pages/Admin/AdminInventoryPage";
import AdminUsersPage from "../pages/Admin/AdminUsersPage";
import AdminPaymentCreatePage from "../pages/Admin/AdminPaymentCreatePage";
import AdminRequestDetailsPage from "../pages/Admin/AdminRequestDetailsPage";



// Guards
import RequireAdmin from "../components/auth/RequireAdmin";
import RequireAuth from "../components/auth/RequireAuth";

// Account layout + pages
import AccountLayout from "../components/layout/AccountLayout";
import AccountProfilePage from "../pages/Account/AccountProfilePage";
import AccountRequestsPage from "../pages/Account/AccountRequestsPage";

// ✅ Billing (Invoices list + Invoice details + Order details)
import AccountInvoicesPage from "../pages/Account/AccountInvoicesPage";
import AccountInvoiceDetailsPage from "../pages/Account/AccountInvoiceDetailsPage";
import AccountOrderDetailsPage from "../pages/Account/AccountOrderDetailsPage";
import AdminPaymentsPage from "../pages/Admin/AdminPaymentsPage";

// ✅ Backward-compat param redirects (Navigate can't keep ":id" by itself)
function InvoiceRedirect() {
  const { id } = useParams();
  return <Navigate to={`/account/billing/invoices/${id}`} replace />;
}
function OrderRedirect() {
  const { id } = useParams();
  return <Navigate to={`/account/billing/orders/${id}`} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Protected user routes */}
        <Route element={<RequireAuth />}>
          <Route element={<AccountLayout />}>
            {/* Default account landing */}
            <Route
              path="/account"
              element={<Navigate to="/account/requests" replace />}
            />

            {/* Account */}
            <Route path="/account/profile" element={<AccountProfilePage />} />
            <Route path="/account/requests" element={<AccountRequestsPage />} />

            {/* ✅ Billing section (single sidebar item) */}
            <Route
              path="/account/billing"
              element={<Navigate to="/account/billing/invoices" replace />}
            />
            <Route
              path="/account/billing/invoices"
              element={<AccountInvoicesPage />}
            />
            <Route
              path="/account/billing/invoices/:id"
              element={<AccountInvoiceDetailsPage />}
            />
            <Route
              path="/account/billing/orders/:id"
              element={<AccountOrderDetailsPage />}
            />

            {/* ✅ Backward-compat redirects (old URLs) */}
            <Route
              path="/account/invoices"
              element={<Navigate to="/account/billing/invoices" replace />}
            />
            <Route path="/account/invoices/:id" element={<InvoiceRedirect />} />
            <Route path="/account/orders/:id" element={<OrderRedirect />} />

            {/* ✅ IMPORTANT: We intentionally DO NOT have /account/orders anymore */}
          </Route>
        </Route>

        {/* Footer pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Catch-all (keeps Header/Footer) */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Admin routes (protected) */}
<Route element={<RequireAdmin />}>
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<AdminDashboardPage />} />

    <Route path="requests" element={<AdminRequestsPage />} />
    <Route path="requests/:id" element={<AdminRequestDetailsPage />} />

    <Route path="orders" element={<AdminOrdersPage />} />
    <Route path="invoices" element={<AdminInvoicesPage />} />
    <Route path="payments" element={<AdminPaymentsPage />} />
    <Route path="payments/new" element={<AdminPaymentCreatePage />} />
    <Route path="users" element={<AdminUsersPage />} />
    <Route path="inventory" element={<AdminInventoryPage />} />
  </Route>
</Route>


    </Routes>
  );
}
