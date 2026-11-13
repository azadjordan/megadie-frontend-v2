import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import PackingTask from "../../components/packing/PackingTask";
import SendToWorkerModal from "../../components/admin/SendToWorkerModal";

export default function AdminPackingPage() {
  const { id } = useParams();
  const [assign, setAssign] = useState(false);
  return <div className="mx-auto max-w-4xl space-y-4">
    <Link to={'/admin/orders/' + id} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600"><FiArrowLeft aria-hidden="true" />Back to order</Link>
    <PackingTask key={id} orderId={id} admin onAssignment={() => setAssign(true)} />
    {assign && <SendToWorkerModal orderId={id} onClose={() => setAssign(false)} />}
  </div>;
}
