import { apiSlice } from "../../app/apiSlice";

const ADMIN_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Cheque",
  "Other",
];

export const paymentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentsAdmin: builder.query({
      query: ({ page = 1, search = "", method = "all", sort = "newest" } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (search) params.set("search", search);
        if (method && method !== "all" && ADMIN_PAYMENT_METHODS.includes(method)) {
          params.set("method", method);
        }
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

    deletePaymentByAdmin: builder.mutation({
      query: (paymentId) => ({
        url: `/payments/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result) => {
        const tags = [{ type: "Payment", id: "LIST" }];
        if (result?.paymentId) {
          tags.push({ type: "Payment", id: result.paymentId });
        }
        if (result?.invoiceId) {
          tags.push({ type: "Invoice", id: result.invoiceId });
          tags.push({ type: "Invoice", id: "LIST" });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetPaymentsAdminQuery,
  useAddPaymentToInvoiceMutation,
  useDeletePaymentByAdminMutation,
} = paymentsApiSlice;
