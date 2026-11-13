import { apiSlice } from "../../app/apiSlice";

export const packingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPackingWorkers: builder.query({
      query: () => "/packing/workers",
      providesTags: [{ type: "User", id: "LIST" }],
    }),
    getPackingOrders: builder.query({
      query: (pages = {}) => {
        const params = new URLSearchParams({ view: "board", ...pages });
        return `/packing/orders?${params}`;
      },
      providesTags: [{ type: "Packing", id: "LIST" }],
      keepUnusedDataFor: 0,
    }),
    getPackingOrder: builder.query({
      query: (orderId) => `/packing/orders/${orderId}`,
      merge: (current, incoming) => {
        // Stock-review changes have their own version so they cannot interrupt
        // a worker's saved quantity draft or be undone by a delayed read.
        const progress = (incoming?.data?.version ?? -1) >= (current?.data?.version ?? -1) ? incoming : current;
        if (!Array.isArray(current?.data?.reports) || !Array.isArray(incoming?.data?.reports)) return progress;
        const reports = (incoming.data.reportsVersion ?? 0) > (current.data.reportsVersion ?? 0) ? incoming : (incoming.data.reportsVersion ?? 0) < (current.data.reportsVersion ?? 0) ? current : progress;
        return { ...progress, data: { ...progress.data, reports: reports.data.reports, reportsVersion: reports.data.reportsVersion, stockChecksPending: reports.data.stockChecksPending } };
      },
      providesTags: (_result, _error, id) => [{ type: "Packing", id }],
      keepUnusedDataFor: 0,
    }),
    reviewPackingStockReport: builder.mutation({
      query: ({ orderId, reportId, ...body }) => ({ url: `/packing/orders/${orderId}/reports/${reportId}`, method: 'PATCH', body, timeout: 20000 }),
      async onQueryStarted({ orderId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await dispatch(packingApiSlice.util.upsertQueryData('getPackingOrder', orderId, data));
        } catch { /* The report panel keeps an uncertain save blocked. */ }
      },
      invalidatesTags: (result, _error, arg) => result ? [{ type: 'Order', id: arg.orderId }, { type: 'Order', id: 'LIST' }] : [],
    }),
    savePacking: builder.mutation({
      query: ({ orderId, action, ...body }) => ({ url: `/packing/orders/${orderId}/${action}`, method: "POST", body, timeout: 20000 }),
      async onQueryStarted({ orderId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          await dispatch(packingApiSlice.util.upsertQueryData("getPackingOrder", orderId, data));
        } catch { /* The caller keeps errors and uncertain results visible. */ }
      },
      invalidatesTags: (result, _error, arg) => result ? [
        { type: "Packing", id: "LIST" }, { type: "Order", id: arg.orderId }, { type: "Order", id: "LIST" },
        { type: "OrderAllocation", id: `ORDER-${arg.orderId}` }, { type: "OrderAllocation", id: "LIST" },
        { type: "SlotItem", id: "LIST" }, { type: "InventoryMovement", id: "LIST" },
      ] : [],
    }),
  }),
});

export const { useGetPackingWorkersQuery, useGetPackingOrdersQuery, useGetPackingOrderQuery, useSavePackingMutation, useReviewPackingStockReportMutation } = packingApiSlice;
