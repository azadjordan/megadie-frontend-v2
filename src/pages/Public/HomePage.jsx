import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

const fallbackImg =
  'https://via.placeholder.com/300x200?text=Image+Unavailable'

const highlights = [
  {
    title: 'Factory-direct sourcing',
    copy: 'Work with one team that handles sourcing, pricing, and delivery.',
  },
  {
    title: 'Specs stay consistent',
    copy: 'Every quote includes the details needed to avoid surprises.',
  },
  {
    title: 'Flexible quantities',
    copy: 'Top up inventory when you need it or place bulk requests.',
  },
]

const steps = [
  {
    title: 'Browse and request',
    copy: 'Pick materials, add quantities, and submit a quote request.',
  },
  {
    title: 'Review pricing',
    copy: 'We confirm specs and send back a clear, itemized quote.',
  },
  {
    title: 'Receive delivery',
    copy: 'Approve the quote and we handle the rest, end to end.',
  },
]

const testimonials = [
  {
    location: 'Abu Dhabi',
    feedback:
      "Reliable quality and quick follow ups. It has simplified our sourcing a lot.",
  },
  {
    location: 'Al Ain',
    feedback: 'Straightforward process and easy communication every time.',
  },
  {
    location: 'Dubai',
    feedback: 'Good pricing, clear specs, and deliveries that show up on time.',
  },
]

export default function HomePage() {
  const { userInfo } = useSelector((state) => state.auth)

  return (
    <div
      className="w-full bg-[#f5f3ff] font-['Outfit'] text-slate-900"
      style={{
        '--accent': '#7c3aed',
        '--accent-soft': '#ede9fe',
      }}
    >
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full opacity-70 blur-3xl"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(124,58,237,0.28), transparent 65%)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-36 left-[-10%] h-96 w-96 rounded-full opacity-60 blur-3xl"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(139,92,246,0.22), transparent 65%)',
          }}
        />

        <div className="relative mx-auto grid max-w-[1360px] items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-6 motion-safe:animate-rise">
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
              Industrial supply partner
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              Precision Materials and Industrial Supplies.
            </h1>
            <p className="text-sm text-slate-600 md:text-base">
              Megadie delivers with a
              clear flow and reliable updates from request to delivery.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Browse products
              </Link>
              {!userInfo ? (
                <Link
                  to="/login"
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  Register
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                Factory-direct
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                Clear specs
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                Fast responses
              </span>
            </div>
          </div>

          <div className="relative motion-safe:animate-rise motion-safe:animate-delay-1">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-3 shadow-lg shadow-violet-200/40">
              <img
                src="https://megadie.s3.eu-central-1.amazonaws.com/Home+Page/HeroPhoto.jpg"
                alt="Warehouse inventory"
                className="h-64 w-full rounded-2xl object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = fallbackImg
                }}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Response
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    Fast quote turnaround
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Keep projects moving with quick updates.
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Coverage
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    Stock for daily production
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Reorder what you need, when you need it.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/80 py-16 sm:py-20">
        <div className="mx-auto max-w-[1360px] px-6">
          <div className="mb-10 flex items-center gap-3">
            <span
              className="h-10 w-1 rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
            />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Built for busy production teams
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                A simple workflow so your team can focus on the job.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((item, index) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:animate-rise"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-900">
                  {item.title}
                </div>
                <div className="mt-2 text-sm text-slate-600">{item.copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1360px] px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                How it works
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">
                A faster quote cycle, end to end.
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Submit a request, confirm details, and receive delivery without
                friction.
              </p>
            </div>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:animate-rise"
                  style={{ animationDelay: `${0.15 + index * 0.1}s` }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{step.copy}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/80 py-16 sm:py-20">
        <div className="mx-auto max-w-[1360px] px-6">
          <div className="mb-10 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Client voice
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
              Trusted by production teams across the UAE
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((client, index) => (
              <div
                key={client.location}
                className="flex min-h-[180px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:animate-rise"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <p className="text-sm text-slate-700">"{client.feedback}"</p>
                <div className="mt-auto pt-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {client.location}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Ready to source with confidence?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Submit a quote request or message us directly to get started.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/shop"
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Request a quote
            </Link>
            <a
              href="https://wa.me/971545050244"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-violet-200/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-slate-900"
            >
              WhatsApp us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
