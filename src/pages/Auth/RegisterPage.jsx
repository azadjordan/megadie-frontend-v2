// src/pages/Auth/RegisterPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

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

  const [register, { isLoading }] = useRegisterMutation()

  const fromPath = useMemo(() => {
    const from = location.state?.from
    return from?.pathname || location.state?.fromPathname || null
  }, [location.state])

  // If already logged in, redirect away
  useEffect(() => {
    if (!isInitialized) return
    if (!userInfo) return

    if (fromPath) return navigate(fromPath, { replace: true })
    navigate('/account/requests', { replace: true })
  }, [isInitialized, userInfo, fromPath, navigate])

  const submitHandler = async (e) => {
    e.preventDefault()

    try {
      const res = await register({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        password,
      }).unwrap()

      dispatch(setCredentials(res.data))

      // ✅ No success toast
      if (fromPath) return navigate(fromPath, { replace: true })
      navigate('/account/requests', { replace: true })
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Registration failed')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Register to submit requests and track quotes.</p>

      <form onSubmit={submitHandler} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="tel"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <p className="mt-1 text-xs text-slate-500">Minimum 6 characters.</p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isInitialized}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to="/login"
          state={{ from: location.state?.from || location }}
          className="font-semibold text-slate-900 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
