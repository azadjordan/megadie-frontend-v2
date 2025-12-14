import { Link } from 'react-router-dom'

const fallbackImg =
  'https://via.placeholder.com/300x200?text=Image+Unavailable'

const productTypes = [
  {
    key: 'Ribbon',
    label: 'Ribbon',
    image:
      'https://megadie.s3.eu-central-1.amazonaws.com/Home+Page/RibbonProductType.jpg',
  },
  {
    key: 'Creasing Matrix',
    label: 'Creasing Matrix',
    image:
      'https://megadie.s3.eu-central-1.amazonaws.com/Home+Page/CreasingMatrixProductType.jpg',
  },
  {
    key: 'Double Face Tape',
    label: 'Double Face Tape',
    image:
      'https://megadie.s3.eu-central-1.amazonaws.com/Home+Page/DoubleFaceTapeProductType.jpg',
  },
]

export default function HomePage() {
  const shopLinkForType = (typeKey) =>
    `/shop?productType=${encodeURIComponent(typeKey)}&fromHome=1`

  return (
    <div className="w-full bg-white text-gray-800">
      {/* ✅ Hero */}
      <section className="relative flex h-[70vh] items-center justify-center">
        <img
          src="https://megadie.s3.eu-central-1.amazonaws.com/Home+Page/HeroPhoto.jpg"
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover brightness-95"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = fallbackImg
          }}
        />
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        <div className="relative z-10 max-w-3xl px-6 text-center">
          <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-800 md:text-5xl">
            Premium Industrial Supplies, Delivered
          </h1>
          <p className="mb-6 text-base text-gray-700 md:text-lg">
            High-quality ribbons, tapes, rubbers, and creasing materials —
            tailored for your business.
          </p>
          <Link
            to="/shop"
            className="cursor-pointer rounded-lg bg-purple-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-purple-600"
          >
            Browse Products
          </Link>
        </div>
      </section>

      {/* ✅ Our Promise */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl">
            Why Choose Megadie?
          </h2>
          <p className="text-sm text-gray-600 md:text-lg">
            We cut out middlemen and deliver industrial-grade materials directly
            from factories to your store — saving you money, time, and hassle.
          </p>
        </div>
      </section>

      {/* ✅ Product Types */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">
            Product Types
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {productTypes.map((pt) => (
              <Link
                key={pt.key}
                to={shopLinkForType(pt.key)}
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label={`Shop ${pt.label}`}
              >
                <img
                  src={pt.image}
                  alt={pt.label}
                  className="h-60 w-full object-cover transition group-hover:scale-[1.01]"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = fallbackImg
                  }}
                />
                <div className="p-4 text-center">
                  <p className="text-lg font-semibold text-gray-700">
                    {pt.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ How It Works */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="mb-14 text-2xl font-bold md:text-3xl">
            How It Works
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {['Browse Products', 'Request a Quote', 'Fast Delivery'].map(
              (step, i) => (
                <div
                  key={step}
                  className="flex min-h-[140px] flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-3 text-4xl font-bold text-purple-600">
                    {i + 1}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step}</h3>
                  <p className="text-sm text-gray-600">
                    {i === 0 &&
                      'Explore a range of high-quality materials curated for industrial use.'}
                    {i === 1 &&
                      'Tell us what you need and we’ll provide a competitive offer tailored to you.'}
                    {i === 2 &&
                      'We ship directly to your store or factory, quickly and reliably.'}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ✅ Testimonials */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-14 text-center text-2xl font-bold md:text-3xl">
            What Our Clients Say
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                location: 'Abu Dhabi',
                feedback:
                  "Great quality and always on time. I'm glad I was one of the early clients of Megadie!",
              },
              {
                location: 'Al Ain',
                feedback: 'Very helpful team. Easier work for us.',
              },
              {
                location: 'Dubai',
                feedback:
                  'Prices are fair and the materials are strong. Definitely recommend them.',
              },
            ].map((client) => (
              <div
                key={client.location}
                className="flex min-h-[140px] flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="mb-6 italic text-gray-700">
                  “{client.feedback}”
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-300" />
                  <div>
                    <p className="select-none font-semibold blur-sm">
                      Client Name
                    </p>
                    <p className="text-sm text-gray-500">
                      {client.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ CTA */}
      <section className="bg-gray-50 px-10 py-20 text-center sm:py-28">
        <h2 className="mb-4 text-2xl font-bold md:text-3xl">
          Let’s Work Together
        </h2>
        <p className="mb-8 text-base text-gray-600 md:text-lg">
          Whether you&apos;re looking to buy or supply — we&apos;re ready to
          partner with you.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
          <Link
            to="/shop"
            className="cursor-pointer rounded-lg bg-purple-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-purple-600"
          >
            Browse Products
          </Link>
          <a
            href="https://wa.me/971545050244"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer rounded-lg border border-purple-500 px-6 py-3 text-sm font-medium text-purple-500 transition hover:bg-purple-600 hover:text-white"
          >
            Become Our Supplier
          </a>
        </div>
      </section>
    </div>
  )
}
