import { Routes, Route } from 'react-router-dom'
import PublicLayout from '../components/layout/PublicLayout'
import AdminLayout from '../components/layout/AdminLayout'

import HomePage from '../pages/Public/HomePage'
import ShopPage from '../pages/Public/ShopPage'
import CartPage from '../pages/Public/CartPage'

import AboutPage from '../pages/Public/AboutPage'
import ContactPage from '../pages/Public/ContactPage'
import PrivacyPolicyPage from '../pages/Public/PrivacyPolicyPage'
import TermsPage from '../pages/Public/TermsPage'

import LoginPage from '../pages/Auth/LoginPage'
import AdminDashboardPage from '../pages/Admin/AdminDashboardPage'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Footer pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>
    </Routes>
  )
}
