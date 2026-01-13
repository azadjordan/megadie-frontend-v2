// src/features/slots/slotsApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const slotsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSlots: builder.query({
      // params: { page?, limit?, store?, unit?, isActive?, q? }
      query: (params) => ({
        url: "/slots",
        params,
      }),
      transformResponse: (response) => {
        const page = response?.page;
        const pages = response?.pages;
        const total = response?.total;
        const limit = response?.limit;
        const pagination =
          typeof page === "number" && typeof pages === "number"
            ? {
                page,
                totalPages: pages,
                total: typeof total === "number" ? total : undefined,
                limit: typeof limit === "number" ? limit : undefined,
                hasPrev: page > 1,
                hasNext: page < pages,
              }
            : null;
        return {
          rows: response?.data ?? [],
          pagination,
        };
      },
      providesTags: (result) => {
        const rows = result?.rows ?? [];
        return rows.length
          ? [
              ...rows.map((slot) => ({
                type: "Slot",
                id: slot._id || slot.id,
              })),
              { type: "Slot", id: "LIST" },
            ]
          : [{ type: "Slot", id: "LIST" }];
      },
    }),
    getSlotById: builder.query({
      query: (slotId) => `/slots/${slotId}`,
      transformResponse: (response) => response?.data ?? response,
      providesTags: (_result, _error, slotId) => [{ type: "Slot", id: slotId }],
    }),
    getSlotSummary: builder.query({
      query: (params) => ({
        url: "/slots/summary",
        params,
      }),
      transformResponse: (response) => response?.data ?? response,
      providesTags: [{ type: "Slot", id: "SUMMARY" }],
    }),
    rebuildSlotOccupancy: builder.mutation({
      query: (params) => ({
        url: "/slots/occupancy/rebuild",
        method: "POST",
        params,
      }),
      invalidatesTags: [
        { type: "Slot", id: "LIST" },
        { type: "Slot", id: "SUMMARY" },
      ],
    }),
  }),
});

export const {
  useGetSlotsQuery,
  useLazyGetSlotsQuery,
  useGetSlotByIdQuery,
  useGetSlotSummaryQuery,
  useRebuildSlotOccupancyMutation,
} = slotsApiSlice;
