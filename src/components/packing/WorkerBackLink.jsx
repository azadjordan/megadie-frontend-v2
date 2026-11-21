import { Link, useLocation } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { workerReturnTo } from '../../utils/packing';

export default function WorkerBackLink() {
  const location = useLocation();
  return <Link to={workerReturnTo(location)} state={{ restoreWorkScroll: true }} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-700"><FiArrowLeft aria-hidden="true" />Back to active work</Link>;
}
