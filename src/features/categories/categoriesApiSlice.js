// src/features/categories/categoriesApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const categoriesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public: list categories (supports productType, isActive, search, pagination)
    getCategories: builder.query({
      // params: { productType?, isActive?, q?, page?, limit? }
      query: (params) => ({
        url: "/categories",
        params,
      }),
      transformResponse: (response) => {
        // response = { success, message, page, pages, limit, total, data: [...] }
        return response?.data ?? [];
      },
      providesTags: (result) =>
        result?.length
          ? [
              ...result.map((c) => ({
                type: "Category",
                id: c._id || c.id,
              })),
              { type: "Category", id: "LIST" },
            ]
          : [{ type: "Category", id: "LIST" }],
    }),
  }),
});

export const { useGetCategoriesQuery } = categoriesApiSlice;
