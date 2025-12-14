import { Routes, Route } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";

import HomePage from "../pages/Public/HomePage";
import ShopPage from "../pages/Public/ShopPage";
import LoginPage from "../pages/Auth/LoginPage";
import AdminDashboardPage from "../pages/Admin/AdminDashboardPage";
import CartPage from '../pages/Public/CartPage'


export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>
    </Routes>
  );
}
