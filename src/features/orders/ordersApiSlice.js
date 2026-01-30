// src/features/orders/ordersApiSlice.js
import { apiSlice } from "../../app/apiSlice";

const ADMIN_ORDER_STATUSES = ["Processing", "Shipping", "Delivered", "Cancelled"];

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // ✅ Single order (owner or admin; owner is sanitized)
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),

    // User: my orders (paginated)
    getMyOrders: builder.query({
      query: ({ page = 1, limit = 5 } = {}) =>
        `/orders/my?page=${page}&limit=${limit}`,
      providesTags: (result) => {
        const listTag = { type: "Order", id: "LIST" };
        const rows = result?.data || [];
        return [listTag, ...rows.map((o) => ({ type: "Order", id: o._id }))];
      },
    }),

    // ✅ Admin: all orders list (paginated, newest first)
    // Backend enforces limit=20
    getOrdersAdmin: builder.query({
      query: ({ page = 1, status = "all", search = "" } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));

        if (status && status !== "all" && ADMIN_ORDER_STATUSES.includes(status)) {
          params.set("status", status);
        }
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
          { type: "Quote", id: "LIST" },      // refresh admin quotes list
          { type: "Quote", id: result.quote } // update quote state (isOrderCreated)
        ];
      },
    }),

    // Admin: update order
    updateOrderByAdmin: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Order", id: "LIST" },
        { type: "Order", id: arg?.id },
      ],
    }),

    // Admin: mark order as delivered (clears quote)
    markOrderDelivered: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}/deliver`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Order", id: "LIST" },
        { type: "Order", id: arg?.id },
        { type: "Quote", id: "LIST" },
      ],
    }),

    deleteOrderByAdmin: builder.mutation({
      query: (id) => ({
        url: `/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Order", id: "LIST" },
        { type: "Order", id },
      ],
    }),

  }),
});

export const {
  useGetOrderByIdQuery,
  useGetMyOrdersQuery,
  useGetOrdersAdminQuery,
  useCreateOrderFromQuoteMutation,
  useUpdateOrderByAdminMutation,
  useMarkOrderDeliveredMutation,
  useDeleteOrderByAdminMutation,
} = ordersApiSlice;
