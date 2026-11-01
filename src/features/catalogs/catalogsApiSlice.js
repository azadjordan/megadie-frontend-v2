import { apiSlice } from '../../app/apiSlice';
import { AVAILABILITY_TAGS } from '../products/availabilityQueryOptions';

export const catalogsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getCatalog: builder.query({
      query: ({productType}) => ({url: '/catalogs', params: {productType}}),
      transformResponse: response => response.data,
      keepUnusedDataFor: 300,
    }),
    getCatalogEntries: builder.query({
      query: ({catalogId, material, page, q}) => ({
        url: `/catalogs/${catalogId}/entries`, params: {material, page, ...(q ? {q} : {})},
      }),
      keepUnusedDataFor: 300,
    }),
    getCatalogEntry: builder.query({
      query: ({catalogId, entryId}) => `/catalogs/${catalogId}/entries/${entryId}`,
      transformResponse: response => response.data,
      keepUnusedDataFor: 0,
    }),
    getCatalogAvailability: builder.query({
      query: ({catalogId, entryIds}) => ({
        url: `/catalogs/${catalogId}/availability`,
        method: 'POST',
        body: {entryIds},
      }),
      providesTags: AVAILABILITY_TAGS,
    }),
  }),
});

export const {useGetCatalogQuery, useGetCatalogEntriesQuery, useGetCatalogEntryQuery, useGetCatalogAvailabilityQuery} = catalogsApiSlice;
