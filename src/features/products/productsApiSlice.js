import { apiSlice } from '../../app/apiSlice'

export const productsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public shop listing
    getProducts: builder.query({
      // params: { productType, page, limit, ...filtersLater }
      query: (params) => ({
        url: '/products',
        params,
      }),
      transformResponse: (response) => {
        // response = { success, message, pagination, data: [...] }
        return {
          products: response?.data ?? [],
          pagination: response?.pagination ?? null,
        }
      },
      providesTags: (result) =>
        result?.products
          ? [
              ...result.products.map((p) => ({
                type: 'Product',
                id: p._id || p.id,
              })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    // Single product
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      transformResponse: (response) => response?.data, // product object
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
  }),
})

export const { useGetProductsQuery, useGetProductByIdQuery } = productsApiSlice
