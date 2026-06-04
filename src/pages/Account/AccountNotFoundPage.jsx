import { useNavigate } from "react-router-dom";
import { FiFileText } from "react-icons/fi";

import RouteStatePage from "../../components/common/RouteStatePage";

export default function AccountNotFoundPage() {
  const navigate = useNavigate();

  return (
    <RouteStatePage
      eyebrow="Account 404"
      title="We could not find this account page"
      message="Your account is still here. The page address just does not match any available account area."
      icon={FiFileText}
      tone="violet"
      actions={[
        { label: "Account overview", to: "/account/overview", variant: "primary" },
        { label: "Requests", to: "/account/requests" },
        { label: "Profile", to: "/account/profile" },
        { label: "Go back", onClick: () => navigate(-1) },
      ]}
    />
  );
}
