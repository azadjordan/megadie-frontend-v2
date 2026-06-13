import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiLogIn, FiRefreshCw, FiWifiOff } from 'react-icons/fi'

import { restartSessionCheck } from '../../features/auth/authSlice'

export default function SessionCheckFailed() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { sessionCheckError } = useSelector((state) => state.auth)

  const handleRetry = () => {
    dispatch(restartSessionCheck())
  }

  const detail =
    sessionCheckError?.status === 'TIMEOUT_ERROR'
      ? 'The request took longer than expected.'
      : sessionCheckError?.message || 'Your session could not be confirmed.'

  return (
    <div className="min-h-[70vh] bg-slate-50 px-4 py-10">
      <section className="mx-auto flex w-full max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
          <FiWifiOff className="h-7 w-7" />
        </div>

        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
          Session check
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
          We couldn't confirm your session
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
          Please try again, or sign in if the problem continues.
        </p>
        <p className="mt-4 inline-flex rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          {detail}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <FiRefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            to="/login"
            state={{ from: location }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FiLogIn className="h-4 w-4" />
            Sign in
          </Link>
        </div>
      </section>
    </div>
  )
}
