// src/features/inventory/inventoryApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const inventoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryProducts: builder.query({
      query: (params) => ({
        url: "/inventory/products",
        params,
      }),
      transformResponse: (response) => ({
        rows: response?.data ?? [],
        pagination: response?.pagination ?? null,
        summary: response?.summary ?? null,
      }),
      providesTags: (result) =>
        result?.rows
          ? [
              ...result.rows.map((row) => ({
                type: "InventoryProduct",
                id: row.id,
              })),
              { type: "InventoryProduct", id: "LIST" },
            ]
          : [{ type: "InventoryProduct", id: "LIST" }],
    }),
    getInventoryAllocations: builder.query({
      query: (params) => ({
        url: "/inventory/allocations",
        params,
      }),
      transformResponse: (response) => ({
        rows: response?.data ?? [],
        pagination: response?.pagination ?? null,
      }),
      providesTags: (result) =>
        result?.rows
          ? [
              ...result.rows.map((row) => ({
                type: "OrderAllocation",
                id: row.id,
              })),
              { type: "OrderAllocation", id: "LIST" },
            ]
          : [{ type: "OrderAllocation", id: "LIST" }],
    }),
  }),
});

export const {
  useGetInventoryProductsQuery,
  useGetInventoryAllocationsQuery,
} = inventoryApiSlice;
