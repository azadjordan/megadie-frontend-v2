import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-10 border-t bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:gap-6">
        {/* Brand */}
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-slate-900 hover:text-slate-950"
        >
          Megadie
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <FooterLink to="/about">About</FooterLink>
          <FooterLink to="/contact">Contact</FooterLink>
          <FooterLink to="/privacy-policy">Privacy Policy</FooterLink>
          <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Megadie
        </p>
      </div>
    </footer>
  )
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="hover:text-slate-900 hover:underline">
      {children}
    </Link>
  )
}
