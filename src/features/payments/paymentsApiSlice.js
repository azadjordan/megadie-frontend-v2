import { apiSlice } from "../../app/apiSlice";

export const paymentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentsAdmin: builder.query({
      query: ({ page = 1, search = "", method = "all", sort = "newest" } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (search) params.set("search", search);
        if (method && method !== "all") params.set("method", method);
        if (sort && sort !== "newest") params.set("sort", sort);
        return `/payments?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "Payment", id: "LIST" };
        const rows = result?.data || result?.items || [];
        return [listTag, ...rows.map((p) => ({ type: "Payment", id: p._id }))];
      },
    }),

    addPaymentToInvoice: builder.mutation({
      query: ({ invoiceId, ...body }) => ({
        url: `/payments/from-invoice/${invoiceId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Invoice", id: arg?.invoiceId },
        { type: "Invoice", id: "LIST" },
        { type: "Payment", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetPaymentsAdminQuery, useAddPaymentToInvoiceMutation } =
  paymentsApiSlice;
