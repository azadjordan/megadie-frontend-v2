// src/pages/Auth/RegisterPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { useRegisterMutation } from '../../features/auth/usersApiSlice'
import { setCredentials } from '../../features/auth/authSlice'

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const { userInfo } = useSelector((state) => state.auth)

  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [register, { isLoading }] = useRegisterMutation()

  // If user is already logged in, redirect away
  useEffect(() => {
    if (userInfo) navigate('/account', { replace: true })
  }, [userInfo, navigate])

  const submitHandler = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      const res = await register({ name, email, password, phoneNumber }).unwrap()
      dispatch(setCredentials(res.data))

      // ✅ No success toast
      const from = location.state?.from?.pathname
      if (from) return navigate(from, { replace: true })

      navigate('/account', { replace: true }) // lands on /account/requests
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Registration failed')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Start tracking your requests and orders.</p>

      <form onSubmit={submitHandler} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            autoComplete="tel"
            placeholder="+971..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-slate-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
