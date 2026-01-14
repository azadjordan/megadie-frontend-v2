import { Link } from 'react-router-dom'

const HIGHLIGHTS = [
  {
    title: 'Secure access',
    copy: 'Sign in with confidence using protected account access.',
  },
  {
    title: 'Stay in control',
    copy: 'Keep your profile and preferences organized in one place.',
  },
  {
    title: 'Support when needed',
    copy: 'Reach our team quickly if you have any questions.',
  },
]

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div
      className="min-h-screen bg-[#f5f3ff] font-['Outfit'] text-slate-900"
      style={{
        '--accent': '#7c3aed',
        '--accent-soft': '#ede9fe',
      }}
    >
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(124,58,237,0.26), transparent 65%)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-[-10%] h-80 w-80 rounded-full opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(139,92,246,0.22), transparent 65%)',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <section className="order-2 rounded-3xl border border-white/70 bg-white/70 p-7 shadow-sm shadow-violet-200/40 backdrop-blur lg:p-10 motion-safe:animate-rise">
            <div>
              <Link
                to="/"
                className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500"
              >
                Megadie
              </Link>
              <h1 className="mt-6 text-3xl font-semibold leading-tight text-slate-900">
                Welcome to your account space.
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Sign in to continue or create an account in a minute.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item, index) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-3"
                >
                  <span
                    className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500">{item.copy}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-xs text-slate-500">
              Need help? Reach us on{' '}
              <a
                href="https://wa.me/971545050244"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 hover:underline"
              >
                WhatsApp
              </a>
              .
            </div>
          </section>

          <section className="order-1 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm lg:p-10 motion-safe:animate-rise motion-safe:animate-delay-1">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
              Account
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

            <div className="mt-6">{children}</div>

            {footer ? <div className="mt-6">{footer}</div> : null}
          </section>
        </div>
      </div>
    </div>
  )
}
