// src/features/filters/filterConfigsApiSlice.js
import { apiSlice } from '../../app/apiSlice'

export const filterConfigsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public: list all filter configs
    getFilterConfigs: builder.query({
      query: () => ({
        url: '/filter-configs',
      }),
      transformResponse: (response) => {
        // response = { success, message, data: [...] }
        return response?.data ?? []
      },
      providesTags: (result) =>
        result?.length
          ? [
              ...result.map((cfg) => ({
                type: 'FilterConfig',
                id: cfg._id || cfg.productType,
              })),
              { type: 'FilterConfig', id: 'LIST' },
            ]
          : [{ type: 'FilterConfig', id: 'LIST' }],
    }),
    // Admin: get one config by productType
    getFilterConfig: builder.query({
      query: (productType) => ({
        url: `/filter-configs/${productType}`,
      }),
      transformResponse: (response) => response?.data ?? null,
      providesTags: (_result, _err, productType) => [
        { type: 'FilterConfig', id: productType },
      ],
    }),
    // Admin: create config for productType
    createFilterConfig: builder.mutation({
      query: ({ productType, ...body }) => ({
        url: `/filter-configs/${productType}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FilterConfig', id: 'LIST' }],
    }),
    // Admin: update config for productType
    updateFilterConfig: builder.mutation({
      query: ({ productType, ...body }) => ({
        url: `/filter-configs/${productType}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, arg) => [
        { type: 'FilterConfig', id: arg?.productType },
        { type: 'FilterConfig', id: 'LIST' },
      ],
    }),
    // Admin: delete config for productType
    deleteFilterConfig: builder.mutation({
      query: (productType) => ({
        url: `/filter-configs/${productType}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'FilterConfig', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetFilterConfigsQuery,
  useGetFilterConfigQuery,
  useCreateFilterConfigMutation,
  useUpdateFilterConfigMutation,
  useDeleteFilterConfigMutation,
} = filterConfigsApiSlice
