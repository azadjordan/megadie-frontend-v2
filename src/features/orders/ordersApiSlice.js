// src/features/orders/ordersApiSlice.js
import { apiSlice } from '../../app/apiSlice'

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // My orders (paginated)
    getMyOrders: builder.query({
      query: ({ page = 1, limit = 5 } = {}) => `/orders/my?page=${page}&limit=${limit}`,
      providesTags: (result) => {
        const listTag = { type: 'Order', id: 'LIST' }
        const rows = result?.data || []
        return [listTag, ...rows.map((o) => ({ type: 'Order', id: o._id }))]
      },
    }),

    // Single order (owner or admin; owner is sanitized)
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
  }),
})

export const {
  useGetMyOrdersQuery,
  useGetOrderByIdQuery,
} = ordersApiSlice
