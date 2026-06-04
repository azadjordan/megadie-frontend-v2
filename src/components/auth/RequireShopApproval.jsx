// src/components/auth/RequireShopApproval.jsx
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { FiAlertCircle, FiClock } from "react-icons/fi";

import RouteStatePage from "../common/RouteStatePage";

export default function RequireShopApproval() {
  const { userInfo } = useSelector((state) => state.auth);
  const status = userInfo?.approvalStatus;

  const isApproved =
    userInfo?.isAdmin || !status || status === "Approved";

  if (isApproved) return <Outlet />;

  const isRejected = status === "Rejected";
  const title = isRejected ? "Shop access denied" : "Shop access pending";
  const message = isRejected
    ? "Your account was rejected. Please contact support if you believe this is a mistake."
    : "Your account is pending approval. We'll notify you as soon as access is granted.";

  return (
    <div className="py-8">
      <RouteStatePage
        eyebrow={isRejected ? "Access denied" : "Approval pending"}
        title={title}
        message={message}
        icon={isRejected ? FiAlertCircle : FiClock}
        tone={isRejected ? "rose" : "amber"}
        actions={[
          { label: "Go to profile", to: "/account/profile", variant: "primary" },
          { label: "Contact support", to: "/contact" },
          { label: "Go home", to: "/" },
        ]}
      />
    </div>
  );
}
