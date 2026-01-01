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
       PUT /api/quotes/admin/:id/owner
       Private/Admin
       Update owner only
       ========================= */
    updateQuoteOwnerByAdmin: builder.mutation({
      query: ({ id, user }) => ({
        url: `/quotes/admin/${id}/owner`,
        method: "PUT",
        body: { user },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
      ],
    }),

    /* =========================
       PUT /api/quotes/admin/:id/quantities
       Private/Admin
       Update quantities only
       ========================= */
    updateQuoteQuantitiesByAdmin: builder.mutation({
      query: ({ id, requestedItems }) => ({
        url: `/quotes/admin/${id}/quantities`,
        method: "PUT",
        body: { requestedItems },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
      ],
    }),

    /* =========================
       PUT /api/quotes/admin/:id/pricing
       Private/Admin
       Update pricing only
       ========================= */
    updateQuotePricingByAdmin: builder.mutation({
      query: ({ id, requestedItems, deliveryCharge, extraFee }) => ({
        url: `/quotes/admin/${id}/pricing`,
        method: "PUT",
        body: { requestedItems, deliveryCharge, extraFee },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
      ],
    }),

    /* =========================
       POST /api/quotes/admin/:id/assign-user-prices
       Private/Admin
       Assign unit prices from user-specific rules
       ========================= */
    assignUserPricesByAdmin: builder.mutation({
      query: (id) => ({
        url: `/quotes/admin/${id}/assign-user-prices`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id },
      ],
    }),

    /* =========================
       PUT /api/quotes/admin/:id/notes
       Private/Admin
       Update notes only
       ========================= */
    updateQuoteNotesByAdmin: builder.mutation({
      query: ({ id, adminToAdminNote, adminToClientNote }) => ({
        url: `/quotes/admin/${id}/notes`,
        method: "PUT",
        body: { adminToAdminNote, adminToClientNote },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
      ],
    }),

    /* =========================
       PUT /api/quotes/admin/:id/status
       Private/Admin
       Update status only
       ========================= */
    updateQuoteStatusByAdmin: builder.mutation({
      query: ({ id, status }) => ({
        url: `/quotes/admin/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
      ],
    }),

    /* =========================
       PUT /api/quotes/admin/:id/recheck-availability
       Private/Admin
       Refresh availability snapshot
       ========================= */
    recheckQuoteAvailabilityByAdmin: builder.mutation({
      query: (id) => ({
        url: `/quotes/admin/${id}/recheck-availability`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id },
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

    /* =========================
       PUT /api/quotes/:id/update-quantities
       Private
       User updates quantities while Processing
       ========================= */
    updateQuoteQuantities: builder.mutation({
      query: ({ id, requestedItems }) => ({
        url: `/quotes/${id}/update-quantities`,
        method: "PUT",
        body: { requestedItems },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Quote", id: "LIST" },
        { type: "Quote", id: arg?.id },
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
  useUpdateQuoteOwnerByAdminMutation,
  useUpdateQuoteQuantitiesByAdminMutation,
  useUpdateQuotePricingByAdminMutation,
  useAssignUserPricesByAdminMutation,
  useUpdateQuoteNotesByAdminMutation,
  useUpdateQuoteStatusByAdminMutation,
  useRecheckQuoteAvailabilityByAdminMutation,
  useDeleteQuoteByAdminMutation,

  // User
  useGetMyQuotesQuery,
  useCreateQuoteMutation,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
  useUpdateQuoteQuantitiesMutation,
} = quotesApiSlice;
