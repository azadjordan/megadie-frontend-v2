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
  }),
})

export const { useGetFilterConfigsQuery } = filterConfigsApiSlice
