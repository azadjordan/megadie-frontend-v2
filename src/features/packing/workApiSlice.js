import { apiSlice } from '../../app/apiSlice';

export const workApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getActiveWorkerWork: builder.query({
      query: (pages = {}) => `/packing/my-work?${new URLSearchParams(pages)}`,
      providesTags: [{ type: 'Packing', id: 'LIST' }],
      keepUnusedDataFor: 0,
    }),
    getWorkerWork: builder.query({
      query: (filters = {}) => `/packing/recent-work?${new URLSearchParams(filters)}`,
      providesTags: ['WorkerWork'],
      keepUnusedDataFor: 0,
    }),
  }),
});
export const { useGetWorkerWorkQuery, useGetActiveWorkerWorkQuery } = workApiSlice;
