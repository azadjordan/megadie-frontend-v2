// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import ForgotPasswordPage from "../pages/Auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";

import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";

import HomePage from "../pages/Public/HomePage";
import ShopPage from "../pages/Public/ShopPage";
import ProductDetailsPage from "../pages/Public/ProductDetailsPage";
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
import AdminInvoiceEditPage from "../pages/Admin/AdminInvoiceEditPage";
import AdminInventoryPage from "../pages/Admin/AdminInventoryPage";
import AdminInventorySlotsPage from "../pages/Admin/AdminInventorySlotsPage";
import AdminInventoryAllocationsPage from "../pages/Admin/AdminInventoryAllocationsPage";
import AdminInventoryCategoriesPage from "../pages/Admin/AdminInventoryCategoriesPage";
import AdminProductCreatePage from "../pages/Admin/AdminProductCreatePage";
import AdminProductEditPage from "../pages/Admin/AdminProductEditPage";
import AdminSlotDetailsPage from "../pages/Admin/AdminSlotDetailsPage";
import AdminUsersPage from "../pages/Admin/AdminUsersPage";
import AdminUserDetailsPage from "../pages/Admin/AdminUserDetailsPage";
import AdminRequestDetailsPage from "../pages/Admin/AdminRequestDetailsPage";
import AdminOrderDetailsPage from "../pages/Admin/AdminOrderDetailsPage";
import AdminPriceRulesPage from "../pages/Admin/AdminPriceRulesPage";
import AdminFilterConfigsPage from "../pages/Admin/AdminFilterConfigsPage";
import AdminFilterConfigEditPage from "../pages/Admin/AdminFilterConfigEditPage";



// Guards
import RequireAdmin from "../components/auth/RequireAdmin";
import RequireAuth from "../components/auth/RequireAuth";
import RequireShopApproval from "../components/auth/RequireShopApproval";
import RequireAccountApproval from "../components/auth/RequireAccountApproval";
import AccountLandingRedirect from "../components/auth/AccountLandingRedirect";

// Account layout + pages
import AccountLayout from "../components/layout/AccountLayout";
import AccountOverviewPage from "../pages/Account/AccountOverviewPage";
import AccountProfilePage from "../pages/Account/AccountProfilePage";
import AccountRequestsPage from "../pages/Account/AccountRequestsPage";
import AccountOrdersPage from "../pages/Account/AccountOrdersPage";

// ✅ Billing (Invoices list + Invoice details + Order details)
import AccountInvoicesReceiptPage from "../pages/Account/AccountInvoicesReceiptPage";
import AdminPaymentsPage from "../pages/Admin/AdminPaymentsPage";

// ✅ Backward-compat param redirects (Navigate can't keep ":id" by itself)
function InvoiceRedirect() {
  return <Navigate to="/account/invoices" replace />;
}
function OrderRedirect() {
  return <Navigate to="/account/orders" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Protected user routes */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireShopApproval />}>
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:id" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
          </Route>

          <Route element={<AccountLayout />}>
            {/* Default account landing */}
            <Route
              path="/account"
              element={<AccountLandingRedirect />}
            />

            {/* Account */}
            <Route path="/account/profile" element={<AccountProfilePage />} />
            <Route element={<RequireAccountApproval />}>
              <Route
                path="/account/overview"
                element={<AccountOverviewPage />}
              />
              <Route path="/account/requests" element={<AccountRequestsPage />} />
              <Route path="/account/orders" element={<AccountOrdersPage />} />
              <Route
                path="/account/invoices"
                element={<AccountInvoicesReceiptPage />}
              />

              {/* Billing section (single sidebar item) */}
              <Route
                path="/account/billing"
                element={<Navigate to="/account/invoices" replace />}
              />
              <Route
                path="/account/billing/invoices"
                element={<Navigate to="/account/invoices" replace />}
              />
              <Route
                path="/account/billing/invoices/:id"
                element={<InvoiceRedirect />}
              />
              <Route
                path="/account/billing/orders/:id"
                element={<OrderRedirect />}
              />
            </Route>


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
    <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
    <Route path="invoices" element={<AdminInvoicesPage />} />
    <Route path="invoices/:id/edit" element={<AdminInvoiceEditPage />} />
    <Route path="payments" element={<AdminPaymentsPage />} />
    <Route path="users" element={<AdminUsersPage />} />
    <Route path="users/:id/edit" element={<AdminUserDetailsPage />} />
    <Route
      path="inventory"
      element={<Navigate to="/admin/inventory/slots" replace />}
    />
    <Route path="inventory/products" element={<AdminInventoryPage />} />
    <Route path="inventory/slots" element={<AdminInventorySlotsPage />} />
    <Route
      path="inventory/categories"
      element={<Navigate to="/admin/categories" replace />}
    />
    <Route
      path="inventory/allocations"
      element={<AdminInventoryAllocationsPage />}
    />
    <Route path="inventory/slots/:id" element={<AdminSlotDetailsPage />} />
    <Route path="inventory/products/new" element={<AdminProductCreatePage />} />
    <Route
      path="inventory/products/:id/edit"
      element={<AdminProductEditPage />}
    />
    <Route path="price-rules" element={<AdminPriceRulesPage />} />
    <Route path="categories" element={<AdminInventoryCategoriesPage />} />
    <Route path="filter-configs" element={<AdminFilterConfigsPage />} />
    <Route
      path="filter-configs/:productType/edit"
      element={<AdminFilterConfigEditPage />}
    />
  </Route>
</Route>


    </Routes>
  );
}

