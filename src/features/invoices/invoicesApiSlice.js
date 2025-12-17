import { apiSlice } from '../../app/apiSlice'

export const invoicesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // My invoices list (lightweight, computed totals/status, paginated)
    getMyInvoices: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => `/invoices/my?page=${page}&limit=${limit}`,
      providesTags: (result) => {
        const listTag = { type: 'Invoice', id: 'LIST' }
        const rows = result?.items || []
        return [listTag, ...rows.map((inv) => ({ type: 'Invoice', id: inv._id }))]
      },
    }),

    // Invoice details (includes payments)
    getInvoiceById: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Invoice', id }],
    }),
  }),
})

export const {
  useGetMyInvoicesQuery,
  useGetInvoiceByIdQuery,
} = invoicesApiSlice
