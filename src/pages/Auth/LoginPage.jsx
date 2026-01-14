import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import AuthShell from '../../components/auth/AuthShell'
import { useLoginMutation } from '../../features/auth/usersApiSlice'
import { setCredentials } from '../../features/auth/authSlice'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const { userInfo, isInitialized } = useSelector((state) => state.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [login, { isLoading }] = useLoginMutation()

  const getLandingPath = (user) => {
    if (user?.isAdmin) return '/admin'
    const status = user?.approvalStatus
    if (status && status !== 'Approved') return '/'
    return '/account/overview'
  }

  useEffect(() => {
    if (!isInitialized) return
    if (!userInfo) return

    navigate(getLandingPath(userInfo), { replace: true })
  }, [isInitialized, userInfo, navigate])

  const submitHandler = async (e) => {
    e.preventDefault()

    try {
      const res = await login({
        email: email.trim(),
        password,
      }).unwrap()

      dispatch(setCredentials(res.data))

      navigate(getLandingPath(res.data), { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Sign in failed')
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="You are clicks away of your work."
      footer={
        <div className="text-sm text-slate-600">
          New to Megadie?{' '}
          <Link
            to="/register"
            state={{ from: location.state?.from || location }}
            className="font-semibold text-slate-900 hover:underline"
          >
            Create account
          </Link>
        </div>
      }
    >
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

        <div>
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isInitialized}
          className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
