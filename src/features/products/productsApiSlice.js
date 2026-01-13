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

    // Admin product meta (enums for create/edit UI)
    getProductMeta: builder.query({
      query: () => '/products/meta',
      transformResponse: (response) => response?.data ?? {},
    }),

    // Admin create product
    createProduct: builder.mutation({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Product', id: 'LIST' },
        { type: 'InventoryProduct', id: 'LIST' },
      ],
    }),

    // Admin update product
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Product', id: arg.id },
        { type: 'Product', id: 'LIST' },
        { type: 'InventoryProduct', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductMetaQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
} = productsApiSlice
