// src/pages/Account/AccountProfilePage.jsx
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'

import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from '../../features/auth/usersApiSlice'
import { setCredentials } from '../../features/auth/authSlice'

export default function AccountProfilePage() {
  const dispatch = useDispatch()

  const { data, isLoading, isError, error, refetch } = useGetMyProfileQuery()
  const [updateProfile, { isLoading: isSaving, error: saveError }] =
    useUpdateMyProfileMutation()

  const profile = data?.data

  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name || '')
    setPhoneNumber(profile.phoneNumber || '')
    setAddress(profile.address || '')
  }, [profile])

  const onSave = async (e) => {
    e.preventDefault()
    setSaved(false)

    try {
      const res = await updateProfile({ name, phoneNumber, address }).unwrap()
      dispatch(setCredentials(res.data))
      setSaved(true)
      refetch()
      setTimeout(() => setSaved(false), 1500)
    } catch {
      // inline error below
    }
  }

  const loadErrMsg = error?.data?.message || error?.error
  const saveErrMsg = saveError?.data?.message || saveError?.error

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      <p className="mt-1 text-sm text-slate-600">Update your details.</p>

      {isLoading ? (
        <div className="mt-6 text-sm text-slate-600">Loading…</div>
      ) : isError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadErrMsg || 'Failed to load profile.'}
        </div>
      ) : (
        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              value={profile?.email || ''}
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+971..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Address</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, building, city, country"
            />
          </div>

          {saveErrMsg ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {saveErrMsg}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>

            {saved && <span className="text-sm font-medium text-slate-700">Saved</span>}
          </div>
        </form>
      )}
    </div>
  )
}
