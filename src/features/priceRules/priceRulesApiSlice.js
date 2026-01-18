import { apiSlice } from "../../app/apiSlice";

export const priceRulesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPriceRules: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams();
        if (params?.productType) {
          search.set("productType", params.productType);
        }
        const queryString = search.toString();
        return `/price-rules${queryString ? `?${queryString}` : ""}`;
      },
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
      query: ({ code, defaultPrice, productType }) => ({
        url: "/price-rules",
        method: "POST",
        body: { code, defaultPrice, productType },
      }),
      invalidatesTags: [{ type: "PriceRule", id: "LIST" }],
    }),

    updatePriceRule: builder.mutation({
      query: ({ id, defaultPrice, productType }) => ({
        url: `/price-rules/${id}`,
        method: "PUT",
        body: { defaultPrice, productType },
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
  useLazyGetPriceRulesQuery,
  useCreatePriceRuleMutation,
  useUpdatePriceRuleMutation,
  useDeletePriceRuleMutation,
} = priceRulesApiSlice;
