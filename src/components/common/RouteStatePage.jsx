import { createElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiArrowRight, FiMapPin, FiSearch } from "react-icons/fi";

const toneStyles = {
  violet: {
    accent: "bg-violet-600",
    icon: "bg-violet-600 text-white shadow-violet-200",
    eyebrow: "text-violet-700",
    soft: "bg-violet-50 text-violet-700 ring-violet-100",
    primary: "bg-violet-600 text-white hover:bg-violet-700",
    code: "text-violet-700",
  },
  slate: {
    accent: "bg-slate-900",
    icon: "bg-slate-900 text-white shadow-slate-200",
    eyebrow: "text-slate-700",
    soft: "bg-slate-50 text-slate-700 ring-slate-200",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    code: "text-slate-700",
  },
  amber: {
    accent: "bg-amber-500",
    icon: "bg-amber-500 text-white shadow-amber-100",
    eyebrow: "text-amber-700",
    soft: "bg-amber-50 text-amber-800 ring-amber-100",
    primary: "bg-amber-500 text-white hover:bg-amber-600",
    code: "text-amber-700",
  },
  rose: {
    accent: "bg-rose-600",
    icon: "bg-rose-600 text-white shadow-rose-100",
    eyebrow: "text-rose-700",
    soft: "bg-rose-50 text-rose-700 ring-rose-100",
    primary: "bg-rose-600 text-white hover:bg-rose-700",
    code: "text-rose-700",
  },
};

const secondaryActionClass =
  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

function Action({ action, primaryClass }) {
  const className = [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
    action.variant === "primary" ? primaryClass : secondaryActionClass,
  ].join(" ");

  if (action.onClick) {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {action.label}
        {action.variant === "primary" ? <FiArrowRight className="h-4 w-4" /> : null}
      </button>
    );
  }

  return (
    <Link to={action.to || "/"} className={className}>
      {action.label}
      {action.variant === "primary" ? <FiArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

export default function RouteStatePage({
  eyebrow = "Route",
  title = "Page not found",
  message = "The page you are looking for does not exist.",
  icon = FiSearch,
  tone = "violet",
  actions = [],
  details,
  showPath = true,
  className = "",
}) {
  const location = useLocation();
  const styles = toneStyles[tone] || toneStyles.violet;
  const requestedPath = `${location.pathname}${location.search}`;
  const iconNode = createElement(icon, { className: "h-7 w-7" });

  return (
    <section className={["mx-auto w-full max-w-5xl", className].join(" ")}>
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="min-w-0">
            <div
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${styles.icon}`}
            >
              {iconNode}
            </div>

            <div
              className={`mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] ${styles.eyebrow}`}
            >
              {eyebrow}
            </div>
            <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {message}
            </p>

            {details ? (
              <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ring-1 ${styles.soft}`}>
                {details}
              </div>
            ) : null}

            {actions.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Action
                    key={`${action.label}-${action.to || "button"}`}
                    action={action}
                    primaryClass={styles.primary}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <FiMapPin className="h-4 w-4" />
                  Current route
                </div>
                {showPath ? (
                  <div
                    className={`mt-4 break-words rounded-xl bg-slate-50 px-3 py-2 font-mono text-sm ${styles.code}`}
                  >
                    {requestedPath}
                  </div>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-400">Status</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {eyebrow}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-400">Next</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      Choose a valid page
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
