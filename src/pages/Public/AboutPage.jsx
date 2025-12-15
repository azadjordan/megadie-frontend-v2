import { useEffect } from 'react'

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">About Megadie</h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          <strong>Megadie.com</strong> was founded in 2025. We are a company dedicated to
          delivering excellence in the printing and packaging industry. Based in the UAE,
          we specialize in providing essential printing materials to businesses across the
          MENA region.
        </p>

        <p>
          Our mission is to empower our clients with the highest quality materials,
          enabling them to achieve outstanding results in their projects. We are committed
          to offering innovative solutions and maintaining the highest standards of quality
          in everything we do.
        </p>

        <p>
          At the core of our business is a passion for the printing industry and a
          commitment to customer satisfaction. We believe in building strong, lasting
          relationships with our clients by providing personalized service and expert
          guidance tailored to their unique needs.
        </p>

        <p>
          Thank you for choosing us as your trusted partner in the printing industry. We
          look forward to working with you and contributing to your success.
        </p>
      </div>
    </div>
  )
}
