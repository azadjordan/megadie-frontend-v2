// src/pages/Auth/LoginPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { useLoginMutation } from '../../features/auth/usersApiSlice'
import { setCredentials } from '../../features/auth/authSlice'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const { userInfo } = useSelector((state) => state.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [login, { isLoading }] = useLoginMutation()

  // If user is already logged in, redirect away
  useEffect(() => {
    if (userInfo) navigate('/account', { replace: true })
  }, [userInfo, navigate])

  const submitHandler = async (e) => {
    e.preventDefault()

    try {
      const res = await login({ email, password }).unwrap()
      dispatch(setCredentials(res.data))

      // ✅ No success toast
      const from = location.state?.from?.pathname
      if (from) return navigate(from, { replace: true })

      if (res.data?.isAdmin) return navigate('/admin', { replace: true })

      navigate('/account', { replace: true }) // lands on /account/requests
    } catch (err) {
      // ✅ Keep error toast (useful)
      toast.error(err?.data?.message || err?.error || 'Login failed')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">Access your Megadie account.</p>

      <form onSubmit={submitHandler} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-slate-900 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
