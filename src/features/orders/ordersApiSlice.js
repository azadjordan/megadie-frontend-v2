// src/features/orders/ordersApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // ✅ Single order (owner or admin; owner is sanitized)
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),

    // ✅ Admin: all orders list (paginated, newest first)
    // Backend enforces limit=5
    getOrdersAdmin: builder.query({
      query: ({ page = 1, status = "all", search = "" } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));

        if (status && status !== "all") params.set("status", status);
        if (search) params.set("search", search);

        return `/orders?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "Order", id: "LIST" };
        const rows = result?.data || [];
        return [listTag, ...rows.map((o) => ({ type: "Order", id: o._id }))];
      },
    }),

    // =========================
    // ✅ Admin: create order from quote
    // =========================
    createOrderFromQuote: builder.mutation({
      query: (quoteId) => ({
        url: `/orders/from-quote/${quoteId}`,
        method: "POST",
      }),

      invalidatesTags: (result) => {
        if (!result) return [];

        return [
          { type: "Order", id: "LIST" },      // refresh admin orders list
          { type: "Order", id: result._id },  // new order details
          { type: "Quote", id: result.quote } // update quote state (isOrderCreated)
        ];
      },
    }),

  }),
});

export const {
  useGetOrderByIdQuery,
  useGetOrdersAdminQuery,
  useCreateOrderFromQuoteMutation,
} = ordersApiSlice;
