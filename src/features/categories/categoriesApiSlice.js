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

    // Admin: list categories with pagination metadata
    getCategoriesAdmin: builder.query({
      // params: { productType?, isActive?, q?, page?, limit? }
      query: (params) => ({
        url: "/categories",
        params,
      }),
      transformResponse: (response) => {
        const page = Number(response?.page) || 1;
        const totalPages = Number(response?.pages) || 1;
        const limit = Number(response?.limit) || 50;
        const totalRaw = Number(response?.total);
        const rows = response?.data ?? [];
        return {
          rows,
          pagination: {
            page,
            totalPages,
            limit,
            total: Number.isFinite(totalRaw) ? totalRaw : rows.length,
            hasPrev: page > 1,
            hasNext: page < totalPages,
          },
        };
      },
      providesTags: (result) =>
        result?.rows?.length
          ? [
              ...result.rows.map((c) => ({
                type: "Category",
                id: c._id || c.id,
              })),
              { type: "Category", id: "LIST" },
            ]
          : [{ type: "Category", id: "LIST" }],
    }),

    // Admin: create category
    createCategory: builder.mutation({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    // Admin: delete category
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoriesAdminQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApiSlice;
