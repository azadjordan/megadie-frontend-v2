import { Link } from 'react-router-dom'

export default function Footer({ className = "" }) {
  const year = new Date().getFullYear()

  return (
    <footer
      className={[
        "border-t border-slate-200 bg-white/90",
        className,
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.3fr_0.9fr_0.8fr]">
          <div className="space-y-3">
            <Link
              to="/"
              className="text-2xl font-semibold tracking-tight text-violet-700"
            >
              Megadie
            </Link>
            <p className="max-w-sm text-sm text-slate-600">
              Industrial materials with a clear quote flow and dependable
              delivery updates.
            </p>
            <a
              href="https://wa.me/971545050244"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
            >
              WhatsApp support
            </a>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Quick links
            </div>
            <nav className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
              <FooterLink to="/shop">Shop</FooterLink>
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
            </nav>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Legal
            </div>
            <nav className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
              <FooterLink to="/privacy-policy">Privacy Policy</FooterLink>
              <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>(c) {year} Megadie. All rights reserved.</span>
          <span>Built for teams across the UAE.</span>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="hover:text-violet-700 hover:underline">
      {children}
    </Link>
  )
}
