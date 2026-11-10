// src/app/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout as logoutAction } from '../features/auth/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  credentials: 'include',
})

const baseQueryWithAuth = async (args, api, extraOptions) => {
  const generation = api.getState().auth.sessionGeneration
  const result = await rawBaseQuery(args, api, extraOptions)
  if (api.getState().auth.sessionGeneration !== generation) {
    return { error: { status: 'CUSTOM_ERROR', error: 'The signed-in session changed while this request was running.' } }
  }

  // If session expired / cookie invalid, clear client auth + cached data.
  if (result?.error?.status === 401) {
    api.dispatch(logoutAction({ reason: 'expired' }))
    api.dispatch(apiSlice.util.resetApiState())
  }

  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'MaintenanceNotice',
    'Product',
    'Order',
    'Invoice',
    'Payment',
    'User',
    'FilterConfig',
    'Category',
    'Quote',
    'UserPrice',
    'PriceRule',
    'SlotItem',
    'Slot',
    'OrderAllocation',
    'InventoryProduct',
    'InventoryMovement',
    'Analytics',
  ],
  endpoints: () => ({}),
})
