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

    // Placeholder until backend exists in this project:
    // Replace this block with your POST /api/contact later.
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
    <div className="mx-auto min-h-[60vh] max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Contact Us</h1>

      {/* Contact Info */}
      <div className="mt-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="space-y-3 text-sm text-slate-700">
          <p>You can always reach out to us via WhatsApp:</p>

          <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            <a
              href="https://wa.me/971549922295"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 hover:text-slate-900 hover:underline"
            >
              +971549922295
            </a>
            <span className="font-normal text-slate-400">or</span>
            <a
              href="https://wa.me/971545050244"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 hover:text-slate-900 hover:underline"
            >
              +971545050244
            </a>
          </div>

          <p>Or you can email us your message using the form below:</p>
        </div>
      </div>

      {/* Contact Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <div>
          <label className="block text-sm font-medium text-slate-900">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition
                       hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition
                       hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={5}
            required
            placeholder="Tell us how we can help you..."
            className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition
                       placeholder:text-slate-400 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition
                     hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </div>
  )
}
