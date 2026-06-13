import { useEffect, useState } from 'react'

export default function DelayedRouteProgress({ delay = 300 }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[45vh] w-full items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-5 text-center shadow-sm">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        <div className="mt-3 text-sm font-semibold text-slate-900">
          Opening your account
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          This should only take a moment.
        </p>
      </div>
      <span className="sr-only">Loading session</span>
    </div>
  )
}
