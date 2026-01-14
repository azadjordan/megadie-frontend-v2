// src/components/auth/AccountLandingRedirect.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function AccountLandingRedirect() {
  const { userInfo, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) return null;

  const status = userInfo?.approvalStatus;
  const isApproved = userInfo?.isAdmin || !status || status === "Approved";
  const target = isApproved ? "/account/overview" : "/account/profile";

  return <Navigate to={target} replace />;
}
