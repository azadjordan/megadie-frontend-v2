import { useEffect, useState } from 'react'

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const [formData, setFormData] = useState({ name: '', phone: '', message: '' })
  const [isSending, setIsSending] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSending(true)

    // Placeholder until backend exists in this project.
    try {
      // eslint-disable-next-line no-alert
      alert('Message sent successfully! (placeholder)\n\nWe will wire the API later.')
      setFormData({ name: '', phone: '', message: '' })
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Failed to send message. Please try again later.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm sm:p-8 motion-safe:animate-rise"
      style={{
        '--accent': '#7c3aed',
        '--accent-soft': '#ede9fe',
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(124,58,237,0.22), transparent 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(139,92,246,0.2), transparent 65%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-1 rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
            aria-hidden="true"
          />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contact us</h1>
            <p className="mt-1 text-sm text-slate-600">
              Tell us what you need and we will take it from there.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                Quick contact
              </div>
              <p className="mt-2 text-sm text-slate-600">
                WhatsApp is the fastest way to reach our team.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/971549922295"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  +971549922295
                </a>
                <a
                  href="https://wa.me/971545050244"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  +971545050244
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="text-sm font-semibold text-slate-900">
                What to include
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Product type or material</li>
                <li>Target size or specification</li>
                <li>Estimated quantity or frequency</li>
              </ul>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                required
                placeholder="Tell us how we can help you."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {isSending ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
