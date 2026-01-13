import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useDispatch } from 'react-redux'

import AuthShell from '../../components/auth/AuthShell'
import Loader from '../../components/common/Loader'
import ErrorMessage from '../../components/common/ErrorMessage'
import {
  useResetPasswordMutation,
  useLazyGetMyProfileQuery,
} from '../../features/auth/usersApiSlice'
import { setCredentials } from '../../features/auth/authSlice'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [resetPassword, { isLoading: isResetting, error: resetError }] =
    useResetPasswordMutation()
  const [fetchProfile, { isLoading: isFetchingProfile, error: profileError }] =
    useLazyGetMyProfileQuery()

  const isLoading = isResetting || isFetchingProfile

  const tokenLooksValid = useMemo(() => {
    // crypto.randomBytes(32).toString('hex') => 64 hex chars
    return typeof token === 'string' && token.length >= 32
  }, [token])

  const submitHandler = async (e) => {
    e.preventDefault()

    if (!tokenLooksValid) return toast.error('Invalid reset link.')
    if (!password || password.length < 6) {
      return toast.error('Password must be at least 6 characters.')
    }
    if (password !== confirm) return toast.error('Passwords do not match.')

    try {
      const res = await resetPassword({ token, password }).unwrap()
      toast.success(res?.message || 'Password reset successful.')

      const profileRes = await fetchProfile().unwrap()
      dispatch(setCredentials(profileRes.data))

      navigate('/account', { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Reset failed')
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <div className="text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-slate-900 hover:underline">
            Back to sign in
          </Link>
        </div>
      }
    >
      {!tokenLooksValid ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="text-sm font-semibold text-rose-900">
            Invalid reset link
          </div>
          <div className="mt-1 text-sm text-rose-700">
            Request a new password reset link to continue.
          </div>
          <div className="mt-3">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              Go to Forgot password
            </Link>
          </div>
        </div>
      ) : null}

      {resetError ? <ErrorMessage error={resetError} className="mb-4" /> : null}
      {profileError ? <ErrorMessage error={profileError} className="mb-4" /> : null}

      <form onSubmit={submitHandler} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">
            New password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!tokenLooksValid || isLoading}
          />
          <div className="mt-2 text-xs text-slate-500">At least 6 characters.</div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Confirm password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={!tokenLooksValid || isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !tokenLooksValid}
          className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {isLoading ? 'Resetting...' : 'Reset password'}
        </button>

        {isLoading ? (
          <div className="pt-2">
            <Loader />
          </div>
        ) : null}
      </form>
    </AuthShell>
  )
}
