import { apiSlice } from "../../app/apiSlice";

export const userPricesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUserPrices: builder.query({
      query: (userId) => `/user-prices/${userId}`,
      providesTags: (result, _error, userId) => {
        const listTag = { type: "UserPrice", id: `USER-${userId}` };
        const rows = result?.data || [];
        return [listTag, ...rows.map((p) => ({ type: "UserPrice", id: p._id }))];
      },
    }),

    upsertUserPrice: builder.mutation({
      query: ({ userId, priceRule, unitPrice }) => ({
        url: "/user-prices",
        method: "POST",
        body: { userId, priceRule, unitPrice },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "UserPrice", id: `USER-${arg?.userId}` },
      ],
    }),

    deleteUserPrice: builder.mutation({
      query: ({ id }) => ({
        url: `/user-prices/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "UserPrice", id: `USER-${arg?.userId}` },
      ],
    }),
  }),
});

export const {
  useGetUserPricesQuery,
  useLazyGetUserPricesQuery,
  useUpsertUserPriceMutation,
  useDeleteUserPriceMutation,
} = userPricesApiSlice;
