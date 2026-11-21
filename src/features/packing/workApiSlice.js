import { apiSlice } from '../../app/apiSlice';

export const workApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getWorkerWork: builder.query({
      query: (filters = {}) => `/packing/recent-work?${new URLSearchParams(filters)}`,
      providesTags: ['WorkerWork'],
      keepUnusedDataFor: 0,
    }),
  }),
});
export const { useGetWorkerWorkQuery } = workApiSlice;
