export default function StepCard({
  n,
  title,
  subtitle,
  children,
  showNumber = true,
}) {
  const showStepNumber = showNumber && n !== undefined && n !== null;
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          {showStepNumber ? (
            <div className="grid h-6 w-6 place-items-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
              {n}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
            {title}
          </div>
        </div>
        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
