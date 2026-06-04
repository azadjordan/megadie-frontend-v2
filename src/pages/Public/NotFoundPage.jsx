import { useNavigate } from "react-router-dom";
import { FiCompass } from "react-icons/fi";

import RouteStatePage from "../../components/common/RouteStatePage";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="py-8 sm:py-12">
      <RouteStatePage
        eyebrow="404"
        title="This page is not on the map"
        message="The address may be mistyped, expired, or moved. Use one of the shortcuts below to get back to Megadie."
        icon={FiCompass}
        tone="violet"
        actions={[
          { label: "Go home", to: "/", variant: "primary" },
          { label: "Shop products", to: "/shop" },
          { label: "Contact support", to: "/contact" },
          { label: "Go back", onClick: () => navigate(-1) },
        ]}
      />
    </div>
  );
}
