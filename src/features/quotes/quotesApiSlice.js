// src/features/quotes/quotesApiSlice.js
import { apiSlice } from '../../app/apiSlice'

export const quotesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // My requests (quotes)
    getMyQuotes: builder.query({
      query: () => '/quotes/my',
      providesTags: (result) => {
        const listTag = { type: 'Quote', id: 'LIST' }
        const rows = result?.data || []
        return [listTag, ...rows.map((q) => ({ type: 'Quote', id: q._id }))]
      },
    }),

    // Create request (from cart/shop)
    createQuote: builder.mutation({
      query: (body) => ({
        url: '/quotes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Quote', id: 'LIST' }],
    }),

    // User cancels (Processing or Quoted)
    cancelQuote: builder.mutation({
      query: (id) => ({
        url: `/quotes/${id}/cancel`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Quote', id: 'LIST' },
        { type: 'Quote', id },
      ],
    }),

    // User confirms (Quoted only)
    confirmQuote: builder.mutation({
      query: (id) => ({
        url: `/quotes/${id}/confirm`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Quote', id: 'LIST' },
        { type: 'Quote', id },
      ],
    }),
  }),
})

export const {
  useGetMyQuotesQuery,
  useCreateQuoteMutation,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
} = quotesApiSlice
