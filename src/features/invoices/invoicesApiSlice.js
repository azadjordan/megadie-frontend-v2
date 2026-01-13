import { apiSlice } from "../../app/apiSlice";

const ADMIN_INVOICE_STATUSES = ["Issued", "Cancelled"];
const ADMIN_PAYMENT_STATUSES = ["Unpaid", "PartiallyPaid", "Paid"];
const ADMIN_INVOICE_SORTS = ["newest", "oldest", "amountHigh", "amountLow"];

export const invoicesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Admin: list invoices (paginated)
    getInvoicesAdmin: builder.query({
      query: ({
        page = 1,
        status = "all",
        paymentStatus = "all",
        unpaid = false,
        overdue = false,
        sort = "newest",
        search = "",
        user,
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (status && status !== "all" && ADMIN_INVOICE_STATUSES.includes(status)) {
          params.set("status", status);
        }
        if (
          paymentStatus &&
          paymentStatus !== "all" &&
          ADMIN_PAYMENT_STATUSES.includes(paymentStatus)
        ) {
          params.set("paymentStatus", paymentStatus);
        }
        if (unpaid) params.set("unpaid", "true");
        if (overdue) params.set("overdue", "true");
        if (sort && sort !== "newest" && ADMIN_INVOICE_SORTS.includes(sort)) {
          params.set("sort", sort);
        }
        if (search) params.set("search", search);
        if (user) params.set("user", user);
        return `/invoices?${params.toString()}`;
      },
      keepUnusedDataFor: 30,
      providesTags: (result) => {
        const listTag = { type: "Invoice", id: "LIST" };
        const rows = result?.data || result?.items || [];
        return [listTag, ...rows.map((inv) => ({ type: "Invoice", id: inv._id }))];
      },
    }),

    getInvoicesAdminSummary: builder.query({
      query: ({ search = "", user } = {}) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (user) params.set("user", user);
        const qs = params.toString();
        return qs ? `/invoices/summary?${qs}` : "/invoices/summary";
      },
      keepUnusedDataFor: 30,
      providesTags: () => [
        { type: "Invoice", id: "SUMMARY" },
        { type: "Invoice", id: "LIST" },
      ],
    }),

    getMyInvoices: builder.query({
      query: ({ page = 1, unpaid = false, limit = 10 } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (unpaid) params.set("unpaid", "true");
        return `/invoices/my?${params.toString()}`;
      },
      keepUnusedDataFor: 30,
      providesTags: (result) => {
        const listTag = { type: "Invoice", id: "LIST" };
        const rows = result?.items || [];
        return [listTag, ...rows.map((inv) => ({ type: "Invoice", id: inv._id }))];
      },
    }),

    getMyInvoiceSummary: builder.query({
      query: () => "/invoices/my/summary",
      keepUnusedDataFor: 30,
      providesTags: () => [
        { type: "Invoice", id: "SUMMARY" },
        { type: "Invoice", id: "LIST" },
      ],
    }),

    getInvoiceById: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Invoice", id }],
    }),

    getInvoicePdf: builder.query({
      query: (id) => ({
        url: `/invoices/${id}/pdf`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
      keepUnusedDataFor: 0,
    }),

    updateInvoiceByAdmin: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/invoices/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Invoice", id: "LIST" },
        { type: "Invoice", id: arg?.id },
      ],
    }),

    deleteInvoiceByAdmin: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Invoice", id: "LIST" },
        { type: "Invoice", id },
      ],
    }),

    createInvoiceFromOrder: builder.mutation({
      query: ({ orderId, ...body }) => ({
        url: `/invoices/from-order/${orderId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Invoice", id: "LIST" },
        { type: "Order", id: arg?.orderId },
      ],
    }),
  }),
});

export const {
  useGetInvoicesAdminQuery,
  useGetInvoicesAdminSummaryQuery,
  useGetMyInvoicesQuery,
  useGetMyInvoiceSummaryQuery,
  useGetInvoiceByIdQuery,
  useLazyGetInvoicePdfQuery,
  useUpdateInvoiceByAdminMutation,
  useDeleteInvoiceByAdminMutation,
  useCreateInvoiceFromOrderMutation,
} = invoicesApiSlice;
