import { createElement } from 'react';
import {
  FiAlertCircle, FiArchive, FiArrowRight, FiCheckSquare, FiClipboard,
  FiCopy, FiCreditCard, FiEye, FiFilePlus, FiFileText, FiLoader,
  FiMapPin, FiMessageSquare, FiPackage, FiPlayCircle, FiSend,
  FiTrash2, FiTruck, FiUserCheck,
} from 'react-icons/fi';

const icons = {
  'mark-shipping': FiPlayCircle,
  'reserve-stock': FiArchive,
  'mark-delivered': FiTruck,
  'create-invoice': FiFilePlus,
  'add-payment': FiCreditCard,
  'finalize-stock': FiCheckSquare,
  'open-order': FiEye,
  'send-worker': FiSend,
  'view-packing': FiPackage,
  'review-help': FiAlertCircle,
  assignment: FiUserCheck,
  'delivery-details': FiMapPin,
  'copy-summary': FiCopy,
  'legacy-packing': FiMessageSquare,
  'review-reports': FiClipboard,
  'delete-order': FiTrash2,
  pdf: FiFileText,
};

export default function AdminOrderActionIcon({ id, busy = false }) {
  return createElement(busy ? FiLoader : icons[id] || FiArrowRight, {
    className: 'h-4 w-4 shrink-0' + (busy ? ' animate-spin motion-reduce:animate-none' : ''),
    'aria-hidden': true,
    focusable: false,
  });
}
