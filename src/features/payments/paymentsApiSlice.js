import { apiSlice } from "../../app/apiSlice";

const ADMIN_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Cheque",
  "Other",
];
const ADMIN_PAYMENT_SORTS = [
  "createdNewest",
  "createdOldest",
  "paymentNewest",
  "paymentOldest",
  "amountHigh",
  "amountLow",
  "newest",
  "oldest",
];

export const paymentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentsAdmin: builder.query({
      query: ({
        page = 1,
        limit = 20,
        search = "",
        method = "all",
        sort = "createdNewest",
        user,
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (method && method !== "all" && ADMIN_PAYMENT_METHODS.includes(method)) {
          params.set("method", method);
        }
        if (
          sort &&
          sort !== "createdNewest" &&
          ADMIN_PAYMENT_SORTS.includes(sort)
        ) {
          params.set("sort", sort);
        }
        if (user) params.set("user", user);
        return `/payments?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "Payment", id: "LIST" };
        const rows = result?.data || result?.items || [];
        return [listTag, ...rows.map((p) => ({ type: "Payment", id: p._id }))];
      },
    }),

    addPaymentToInvoice: builder.mutation({
      query: (arg) => {
        const body = { ...(arg || {}) };
        delete body.invoiceId;
        delete body.orderId;
        return {
          url: `/payments/from-invoice/${arg?.invoiceId}`,
          method: "POST",
          body,
        };
      },
      invalidatesTags: (_result, _error, arg) => {
        const tags = [
          { type: "Invoice", id: arg?.invoiceId },
          { type: "Invoice", id: "LIST" },
          { type: "Invoice", id: "SUMMARY" },
          { type: "Payment", id: "LIST" },
        ];
        if (arg?.orderId) {
          tags.push({ type: "Order", id: arg.orderId });
          tags.push({ type: "Order", id: "LIST" });
        }
        return tags;
      },
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
