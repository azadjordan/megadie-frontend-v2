import { apiSlice } from "../../app/apiSlice";

export const analyticsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query({
      query: ({ from, to, customerId } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (customerId) params.set("customerId", customerId);
        const qs = params.toString();
        return qs ? `/analytics/overview?${qs}` : "/analytics/overview";
      },
      transformResponse: (response) => response?.data ?? response,
      providesTags: () => [{ type: "Analytics", id: "OVERVIEW" }],
    }),
    getAnalyticsCustomers: builder.query({
      query: ({ from, to, limit = 10 } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (limit) params.set("limit", String(limit));
        const qs = params.toString();
        return qs ? `/analytics/customers?${qs}` : "/analytics/customers";
      },
      transformResponse: (response) => response?.data ?? response,
      providesTags: () => [{ type: "Analytics", id: "CUSTOMERS" }],
    }),
  }),
});

export const {
  useGetAnalyticsCustomersQuery,
  useGetAnalyticsOverviewQuery,
} = analyticsApiSlice;
