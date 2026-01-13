import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

import AuthShell from '../../components/auth/AuthShell'
import Loader from '../../components/common/Loader'
import ErrorMessage from '../../components/common/ErrorMessage'
import { useForgotPasswordMutation } from '../../features/auth/usersApiSlice'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation()

  const submitHandler = async (e) => {
    e.preventDefault()

    try {
      const res = await forgotPassword({ email }).unwrap()
      setDone(true)
      toast.success(res?.message || 'Check your email for the reset link.')
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Request failed')
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We will email you a link to reset your password."
      footer={
        <div className="text-sm text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-slate-900 hover:underline">
            Sign in
          </Link>
        </div>
      }
    >
      {error ? <ErrorMessage error={error} className="mb-4" /> : null}

      {done ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="text-sm font-semibold text-emerald-900">
            Check your inbox
          </div>
          <div className="mt-1 text-sm text-emerald-800">
            If an account exists for <span className="font-semibold">{email}</span>,
            you will receive a reset link shortly.
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Back to sign in
            </Link>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 hover:underline"
            >
              Use another email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isLoading ? 'Sending link...' : 'Send reset link'}
          </button>

          {isLoading ? (
            <div className="pt-2">
              <Loader />
            </div>
          ) : null}
        </form>
      )}
    </AuthShell>
  )
}
