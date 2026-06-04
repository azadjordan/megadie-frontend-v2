import { useNavigate } from "react-router-dom";
import { FiTool } from "react-icons/fi";

import RouteStatePage from "../../components/common/RouteStatePage";

export default function AdminNotFoundPage() {
  const navigate = useNavigate();

  return (
    <RouteStatePage
      eyebrow="Admin 404"
      title="That admin page does not exist"
      message="The admin route may have changed, or the link may be incomplete. Use the admin shortcuts to continue."
      icon={FiTool}
      tone="slate"
      actions={[
        { label: "Admin dashboard", to: "/admin", variant: "primary" },
        { label: "Requests", to: "/admin/requests" },
        { label: "Orders", to: "/admin/orders" },
        { label: "Go back", onClick: () => navigate(-1) },
      ]}
    />
  );
}
