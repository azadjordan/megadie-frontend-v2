// src/features/slotItems/slotItemsApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const slotItemsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSlotItemsByProduct: builder.query({
      query: (arg) => {
        const productId = typeof arg === "string" ? arg : arg?.productId;
        const params =
          typeof arg === "object" && arg?.orderId
            ? { orderId: arg.orderId }
            : undefined;
        return {
          url: `/slot-items/by-product/${productId}`,
          params,
        };
      },
      providesTags: (_result, _error, arg) => {
        const productId = typeof arg === "string" ? arg : arg?.productId;
        const tags = [{ type: "SlotItem", id: "LIST" }];
        if (productId) {
          tags.push({ type: "SlotItem", id: productId });
        }
        return tags;
      },
    }),
    getSlotItemsBySlot: builder.query({
      query: (slotId) => `/slot-items/by-slot/${slotId}`,
      providesTags: (_result, _error, slotId) => [
        { type: "SlotItem", id: `slot-${slotId}` },
      ],
    }),
    adjustSlotItem: builder.mutation({
      query: (body) => ({
        url: "/slot-items/adjust",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "SlotItem", id: arg?.productId },
        { type: "SlotItem", id: `slot-${arg?.slotId}` },
        { type: "InventoryProduct", id: arg?.productId },
        { type: "InventoryProduct", id: "LIST" },
        { type: "Slot", id: arg?.slotId },
        { type: "Slot", id: "LIST" },
      ],
    }),
    moveSlotItems: builder.mutation({
      query: (body) => ({
        url: "/slot-items/move",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "SlotItem", id: `slot-${arg?.fromSlotId}` },
        { type: "SlotItem", id: `slot-${arg?.toSlotId}` },
        { type: "SlotItem", id: "LIST" },
        { type: "Slot", id: arg?.fromSlotId },
        { type: "Slot", id: arg?.toSlotId },
        { type: "Slot", id: "LIST" },
      ],
    }),
    clearSlotItems: builder.mutation({
      query: (body) => ({
        url: "/slot-items/clear",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "SlotItem", id: `slot-${arg?.slotId}` },
        { type: "SlotItem", id: "LIST" },
        { type: "InventoryProduct", id: "LIST" },
        { type: "Slot", id: arg?.slotId },
        { type: "Slot", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetSlotItemsByProductQuery,
  useLazyGetSlotItemsByProductQuery,
  useGetSlotItemsBySlotQuery,
  useAdjustSlotItemMutation,
  useMoveSlotItemsMutation,
  useClearSlotItemsMutation,
} = slotItemsApiSlice;
