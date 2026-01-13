import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import AuthShell from '../../components/auth/AuthShell'
import { useRegisterMutation } from '../../features/auth/usersApiSlice'
import { setCredentials } from '../../features/auth/authSlice'

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const { userInfo, isInitialized } = useSelector((state) => state.auth)

  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const hasConfirm = confirmPassword.length > 0
  const isTooShort = password.length > 0 && password.length < 6
  const passwordsMatch = password.length >= 6 && password === confirmPassword
  const passwordsMismatch = hasConfirm && !passwordsMatch && !isTooShort

  const [register, { isLoading }] = useRegisterMutation()

  const getLandingPath = (user) =>
    user?.isAdmin ? '/admin' : '/account/overview'

  useEffect(() => {
    if (!isInitialized) return
    if (!userInfo) return

    navigate(getLandingPath(userInfo), { replace: true })
  }, [isInitialized, userInfo, navigate])

  const submitHandler = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    try {
      const res = await register({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        password,
      }).unwrap()

      dispatch(setCredentials(res.data))

      navigate(getLandingPath(res.data), { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Registration failed')
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Set up your profile so we can prepare magic quickly."
      footer={
        <div className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            state={{ from: location.state?.from || location }}
            className="font-semibold text-slate-900 hover:underline"
          >
            Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={submitHandler} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">Name</label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Phone
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            type="tel"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>

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

        <div>
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input
            className={[
              'mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2',
              passwordsMismatch
                ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                : passwordsMatch
                ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
                : 'border-slate-200 focus:border-slate-900 focus:ring-slate-200',
            ].join(' ')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <p className="mt-2 text-xs text-slate-500">Minimum 6 characters.</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Confirm password
          </label>
          <input
            className={[
              'mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2',
              passwordsMismatch
                ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                : passwordsMatch
                ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
                : 'border-slate-200 focus:border-slate-900 focus:ring-slate-200',
            ].join(' ')}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
          {isTooShort ? (
            <p className="mt-2 text-xs font-semibold text-amber-600">
              Password must be at least 6 characters.
            </p>
          ) : passwordsMismatch ? (
            <p className="mt-2 text-xs font-semibold text-rose-600">
              Passwords do not match.
            </p>
          ) : passwordsMatch ? (
            <p className="mt-2 text-xs font-semibold text-emerald-600">
              Passwords match.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isInitialized}
          className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
