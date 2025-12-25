// src/features/quotes/quotesApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const quotesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* =========================
       GET /api/quotes/admin
       Private/Admin
       Paginated list (admin dashboard)
       ========================= */
    getAdminQuotes: builder.query({
      query: ({ page = 1, status = "all", search = "" } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (status && status !== "all") params.set("status", status);
        if (search) params.set("search", search);
        return `/quotes/admin?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "Quote", id: "LIST" };
        const rows = result?.data || [];
        return [listTag, ...rows.map((q) => ({ type: "Quote", id: q._id }))];
      },
    }),

    /* =========================
       GET /api/quotes/:id
       Private (owner) OR Admin
       Quote details
       ========================= */
    getQuoteById: builder.query({
      query: (id) => `/quotes/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Quote", id }],
    }),

    getQuoteShare: builder.query({
      query: (id) => `/quotes/${id}/share`,
      keepUnusedDataFor: 0,
    }),

    getQuotePdf: builder.query({
      query: (id) => ({
        url: `/quotes/${id}/pdf`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
      keepUnusedDataFor: 0,
    }),

    /* =========================
       PUT /api/quotes/admin/:id
       Private/Admin
       Steps UI endpoint
       ========================= */
    updateQuoteByAdmin: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/quotes/admin/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
      ],
    }),

    /* =========================
       DELETE /api/quotes/:id
       Private/Admin
       Delete quote (only if Cancelled)
       ========================= */
    deleteQuoteByAdmin: builder.mutation({
      query: (id) => ({
        url: `/quotes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id },
      ],
    }),

    /* =========================
       GET /api/quotes/my
       Private
       My quotes (paginated)
       ========================= */
    getMyQuotes: builder.query({
      query: ({ page = 1, limit = 5, status } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (status) params.set("status", status);
        return `/quotes/my?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "Quote", id: "LIST" };
        const rows = result?.data || [];
        return [listTag, ...rows.map((q) => ({ type: "Quote", id: q._id }))];
      },
    }),

    /* =========================
       POST /api/quotes
       Private
       Create quote (client)
       ========================= */
    createQuote: builder.mutation({
      query: (body) => ({
        url: "/quotes",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Quote", id: "LIST" }],
    }),

    /* =========================
       PUT /api/quotes/:id/cancel
       Private
       User cancels quote
       ========================= */
    cancelQuote: builder.mutation({
      query: (id) => ({
        url: `/quotes/${id}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id },
      ],
    }),

    /* =========================
       PUT /api/quotes/:id/confirm
       Private
       User confirms quote
       ========================= */
    confirmQuote: builder.mutation({
      query: (id) => ({
        url: `/quotes/${id}/confirm`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id },
      ],
    }),
  }),
});

export const {
  useGetAdminQuotesQuery,
  useGetQuoteByIdQuery,
  useLazyGetQuoteShareQuery,
  useLazyGetQuotePdfQuery,

  // Admin
  useUpdateQuoteByAdminMutation,
  useDeleteQuoteByAdminMutation,

  // User
  useGetMyQuotesQuery,
  useCreateQuoteMutation,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
} = quotesApiSlice;
