import { apiSlice } from '../../app/apiSlice';

const tags = id => ['WorkerWork', { type: 'Packing', id }, { type: 'Packing', id: 'LIST' }, { type: 'Order', id }, { type: 'Order', id: 'LIST' }];
export const deliveryApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getDeliveries: builder.query({
      query: (page = 1) => `/packing/deliveries?page=${page}`,
      providesTags: [{ type: 'Packing', id: 'LIST' }], keepUnusedDataFor: 0,
    }),
    getDeliveryTask: builder.query({
      query: id => `/packing/deliveries/${id}`,
      merge: (current, incoming) => (incoming?.data?.version ?? -1) >= (current?.data?.version ?? -1) ? incoming : current,
      providesTags: (_r, _e, id) => [{ type: 'Packing', id }], keepUnusedDataFor: 0,
    }),
    getDeliveryWorkers: builder.query({
      query: id => `/packing/deliveries/${id}/workers`, keepUnusedDataFor: 0,
      providesTags: [{ type: 'User', id: 'LIST' }],
    }),
    assignDelivery: builder.mutation({
      query: ({ orderId, ...body }) => ({ url: `/packing/deliveries/${orderId}/assignment`, method: 'POST', body, timeout: 20000 }),
      invalidatesTags: (_r, _e, arg) => tags(arg.orderId),
    }),
    moveDelivery: builder.mutation({
      query: ({ orderId, ...body }) => ({ url: `/packing/deliveries/${orderId}/movement`, method: 'POST', body, timeout: 20000 }),
      async onQueryStarted({ orderId }, { dispatch, queryFulfilled }) {
        try { const { data } = await queryFulfilled; await dispatch(deliveryApiSlice.util.upsertQueryData('getDeliveryTask', orderId, data)); }
        catch { /* Read the saved state before another attempt. */ }
      },
      invalidatesTags: (_r, _e, arg) => tags(arg.orderId),
    }),
  }),
});
export const { useGetDeliveriesQuery, useGetDeliveryTaskQuery, useGetDeliveryWorkersQuery, useAssignDeliveryMutation, useMoveDeliveryMutation } = deliveryApiSlice;
