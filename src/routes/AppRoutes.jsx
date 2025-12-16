// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

import PublicLayout from '../components/layout/PublicLayout'
import AdminLayout from '../components/layout/AdminLayout'

import HomePage from '../pages/Public/HomePage'
import ShopPage from '../pages/Public/ShopPage'
import CartPage from '../pages/Public/CartPage'

import AboutPage from '../pages/Public/AboutPage'
import ContactPage from '../pages/Public/ContactPage'
import PrivacyPolicyPage from '../pages/Public/PrivacyPolicyPage'
import TermsPage from '../pages/Public/TermsPage'
import NotFoundPage from '../pages/Public/NotFoundPage'

import LoginPage from '../pages/Auth/LoginPage'
import RegisterPage from '../pages/Auth/RegisterPage'
import AdminDashboardPage from '../pages/Admin/AdminDashboardPage'

// Guards
import RequireAdmin from '../components/auth/RequireAdmin'
import RequireAuth from '../components/auth/RequireAuth'

// Account layout + pages
import AccountLayout from '../components/layout/AccountLayout'
import AccountProfilePage from '../pages/Account/AccountProfilePage'
import AccountRequestsPage from '../pages/Account/AccountRequestsPage'
import AccountOrdersPage from '../pages/Account/AccountOrdersPage'
import AccountInvoicesPage from '../pages/Account/AccountInvoicesPage'

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
            <Route path="/account" element={<Navigate to="/account/requests" replace />} />
            <Route path="/account/profile" element={<AccountProfilePage />} />
            <Route path="/account/requests" element={<AccountRequestsPage />} />
            <Route path="/account/orders" element={<AccountOrdersPage />} />
            <Route path="/account/invoices" element={<AccountInvoicesPage />} />
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

      {/* Admin routes (protected) */}
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
