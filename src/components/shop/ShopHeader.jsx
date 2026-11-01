import { Link } from 'react-router-dom';
import { FiArrowLeft, FiChevronRight } from 'react-icons/fi';

const LINK = 'rounded text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2';

export default function ShopHeader({title, description, breadcrumbs, parent, action}) {
  return (
    <header className="space-y-3">
      <div className="flex min-h-6 items-center">
        <nav aria-label="Breadcrumb" className="hidden md:block">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex min-w-0 items-center gap-2">
                {index > 0 && <FiChevronRight aria-hidden="true" className="shrink-0 text-slate-400" />}
                {item.to ? <Link to={item.to} state={{restoreShopScroll:true}} className={LINK}>{item.label}</Link>
                  : <span aria-current="page" className="break-words text-slate-600">{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        {parent && (
          <Link to={parent.to} state={{restoreShopScroll:true}} className={`${LINK} -my-2.5 inline-flex min-h-11 items-center gap-2 text-sm md:hidden`}>
            <FiArrowLeft aria-hidden="true" className="shrink-0" />{parent.label}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1.5">
        <div className={`min-w-0 ${action ? '' : 'col-span-full'}`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          </div>
        </div>
        {action && <div className="flex min-h-9 shrink-0 items-center">{action}</div>}
        {description && <p className="col-span-full text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
    </header>
  );
}
