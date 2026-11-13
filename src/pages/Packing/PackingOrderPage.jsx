import { useParams } from "react-router-dom";
import PackingTask from "../../components/packing/PackingTask";

export default function PackingOrderPage() {
  const { id } = useParams();
  return <PackingTask key={id} orderId={id} />;
}
