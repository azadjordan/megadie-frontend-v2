import { apiSlice } from "../../app/apiSlice";

export const analyticsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query({
      query: ({ from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        return qs ? `/analytics/overview?${qs}` : "/analytics/overview";
      },
      transformResponse: (response) => response?.data ?? response,
      providesTags: () => [{ type: "Analytics", id: "OVERVIEW" }],
    }),
  }),
});

export const { useGetAnalyticsOverviewQuery } = analyticsApiSlice;
