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
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden"
    >
      <div className="h-full w-full bg-transparent">
        <div className="h-full w-1/3 rounded-r-full bg-violet-500/80 shadow-[0_0_18px_rgba(124,58,237,0.35)] animate-route-progress" />
      </div>
      <span className="sr-only">Loading session</span>
    </div>
  )
}
