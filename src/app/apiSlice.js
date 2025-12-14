// src/app/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    credentials: 'include',
  }),
  tagTypes: ['Product', 'Order', 'Invoice', 'User', 'FilterConfig', 'Category'],
  endpoints: () => ({}),
})
