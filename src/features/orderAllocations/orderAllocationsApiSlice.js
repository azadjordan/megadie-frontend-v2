import { apiSlice } from "../../app/apiSlice";

export const orderAllocationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrderAllocations: builder.query({
      query: (orderId) => `/orders/${orderId}/allocations`,
      providesTags: (result, _error, orderId) => {
        const listTag = { type: "OrderAllocation", id: `ORDER-${orderId}` };
        const rows = result?.data || [];
        return [
          listTag,
          ...rows.map((row) => ({
            type: "OrderAllocation",
            id: row._id || row.id,
          })),
        ];
      },
    }),

    upsertOrderAllocation: builder.mutation({
      query: ({ orderId, productId, slotId, qty, note }) => ({
        url: `/orders/${orderId}/allocations`,
        method: "POST",
        body: { productId, slotId, qty, note },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "OrderAllocation", id: `ORDER-${arg?.orderId}` },
        { type: "Order", id: arg?.orderId },
      ],
    }),

    deleteOrderAllocation: builder.mutation({
      query: ({ orderId, allocationId }) => ({
        url: `/orders/${orderId}/allocations/${allocationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "OrderAllocation", id: `ORDER-${arg?.orderId}` },
        { type: "Order", id: arg?.orderId },
      ],
    }),
  }),
});

export const {
  useGetOrderAllocationsQuery,
  useUpsertOrderAllocationMutation,
  useDeleteOrderAllocationMutation,
} = orderAllocationsApiSlice;
