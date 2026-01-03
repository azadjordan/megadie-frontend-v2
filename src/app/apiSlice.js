// src/app/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout as logoutAction } from '../features/auth/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  credentials: 'include',
})

const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  // If session expired / cookie invalid, clear client auth + cached data.
  if (result?.error?.status === 401) {
    api.dispatch(logoutAction())
    api.dispatch(apiSlice.util.resetApiState())
  }

  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
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
    'OrderAllocation',
    'InventoryProduct',
  ],
  endpoints: () => ({}),
})
