// src/features/slotItems/slotItemsApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const slotItemsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSlotItemsByProduct: builder.query({
      query: (productId) => `/slot-items/by-product/${productId}`,
      providesTags: (_result, _error, productId) => [
        { type: "SlotItem", id: productId },
      ],
    }),
  }),
});

export const {
  useGetSlotItemsByProductQuery,
  useLazyGetSlotItemsByProductQuery,
} = slotItemsApiSlice;
