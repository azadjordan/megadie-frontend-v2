// src/components/account/AccountHeader.jsx
import React from "react";

export default function AccountHeader({ back, title, subtitle, right, bottom }) {
  const hasAnything = back || title || subtitle || right || bottom;
  if (!hasAnything) return null;

  return (
    <header className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:px-3">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {back ? <div className="mb-2">{back}</div> : null}

            {title ? (
              <h1 className="truncate text-xl font-semibold text-slate-900">
                {title}
              </h1>
            ) : null}

            {subtitle ? (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            ) : null}
          </div>

          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>

        {bottom ? (
          <div className="mt-3 border-t border-slate-200 pt-3">{bottom}</div>
        ) : null}
      </div>
    </header>
  );
}
