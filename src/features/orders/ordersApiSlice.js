// src/features/orders/ordersApiSlice.js
import { apiSlice } from "../../app/apiSlice";

const ADMIN_ORDER_STATUSES = ["Processing", "Shipping", "Delivered", "Cancelled"];
const ADMIN_ORDER_WORK_FILTERS = [
  "noInvoice",
  "paymentDue",
  "needsReservation",
  "readyToDeliver",
  "needsStockDeduction",
];

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
    getOrdersAdmin: builder.query({
      query: ({
        page = 1,
        limit,
        status = "all",
        paymentStatus = "all",
        work = "all",
        search = "",
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (Number.isFinite(limit)) params.set("limit", String(limit));

        if (status && status !== "all" && ADMIN_ORDER_STATUSES.includes(status)) {
          params.set("status", status);
        }
        if (paymentStatus && paymentStatus !== "all") {
          params.set("paymentStatus", paymentStatus);
        }
        if (work && work !== "all" && ADMIN_ORDER_WORK_FILTERS.includes(work)) {
          params.set("work", work);
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

    getOrdersWorkSummary: builder.query({
      query: () => "/orders/work-summary",
      providesTags: () => [{ type: "Order", id: "LIST" }],
    }),

    getOrderDeletePreview: builder.query({
      query: (id) => `/orders/${id}/delete-preview`,
      keepUnusedDataFor: 0,
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

    // Admin: cancel order with cleanup (invoice + allocations)
    cancelOrderByAdmin: builder.mutation({
      query: (id) => ({
        url: `/orders/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Order", id: "LIST" },
        { type: "Order", id },
        { type: "Invoice", id: "LIST" },
        { type: "Invoice", id: "SUMMARY" },
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
        { type: "Quote", id: "LIST" },
        { type: "Invoice", id: "LIST" },
        { type: "Invoice", id: "SUMMARY" },
        { type: "Payment", id: "LIST" },
        { type: "OrderAllocation", id: "LIST" },
        { type: "OrderAllocation", id: `ORDER-${id}` },
        { type: "SlotItem", id: "LIST" },
        { type: "Slot", id: "LIST" },
        { type: "InventoryProduct", id: "LIST" },
        { type: "InventoryMovement", id: "LIST" },
      ],
    }),

  }),
});

export const {
  useGetOrderByIdQuery,
  useLazyGetOrderByIdQuery,
  useGetMyOrdersQuery,
  useGetOrdersAdminQuery,
  useGetOrdersWorkSummaryQuery,
  useLazyGetOrderDeletePreviewQuery,
  useCreateOrderFromQuoteMutation,
  useUpdateOrderByAdminMutation,
  useMarkOrderDeliveredMutation,
  useCancelOrderByAdminMutation,
  useDeleteOrderByAdminMutation,
} = ordersApiSlice;
