import { apiSlice } from "../../app/apiSlice";

export const priceRulesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPriceRules: builder.query({
      query: () => "/price-rules",
      providesTags: (result) => {
        const listTag = { type: "PriceRule", id: "LIST" };
        const rows = result?.data || [];
        return [
          listTag,
          ...rows.map((rule) => ({
            type: "PriceRule",
            id: rule._id || rule.id || rule.code,
          })),
        ];
      },
    }),

    createPriceRule: builder.mutation({
      query: ({ code, defaultPrice }) => ({
        url: "/price-rules",
        method: "POST",
        body: { code, defaultPrice },
      }),
      invalidatesTags: [{ type: "PriceRule", id: "LIST" }],
    }),

    updatePriceRule: builder.mutation({
      query: ({ id, defaultPrice }) => ({
        url: `/price-rules/${id}`,
        method: "PUT",
        body: { defaultPrice },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "PriceRule", id: "LIST" },
        { type: "PriceRule", id: arg?.id },
      ],
    }),

    deletePriceRule: builder.mutation({
      query: ({ id }) => ({
        url: `/price-rules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "PriceRule", id: "LIST" },
        { type: "PriceRule", id: arg?.id },
      ],
    }),
  }),
});

export const {
  useGetPriceRulesQuery,
  useCreatePriceRuleMutation,
  useUpdatePriceRuleMutation,
  useDeletePriceRuleMutation,
} = priceRulesApiSlice;
