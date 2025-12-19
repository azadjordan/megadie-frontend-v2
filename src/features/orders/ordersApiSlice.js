// src/features/orders/ordersApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const ordersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ✅ Single order (owner or admin; owner is sanitized)
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),
  }),
});

export const { useGetOrderByIdQuery } = ordersApiSlice;
