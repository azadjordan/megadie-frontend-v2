import { apiSlice } from "../../app/apiSlice";

export const invoicesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Admin: list invoices (paginated)
    getInvoicesAdmin: builder.query({
      query: ({
        page = 1,
        status = "all",
        paymentStatus = "all",
        overdue = false,
        sort = "newest",
        search = "",
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (status && status !== "all") params.set("status", status);
        if (paymentStatus && paymentStatus !== "all")
          params.set("paymentStatus", paymentStatus);
        if (overdue) params.set("overdue", "true");
        if (sort && sort !== "newest") params.set("sort", sort);
        if (search) params.set("search", search);
        return `/invoices?${params.toString()}`;
      },
      keepUnusedDataFor: 30,
      providesTags: (result) => {
        const listTag = { type: "Invoice", id: "LIST" };
        const rows = result?.data || result?.items || [];
        return [listTag, ...rows.map((inv) => ({ type: "Invoice", id: inv._id }))];
      },
    }),

    getMyInvoices: builder.query({
      query: ({ page = 1, unpaid = false } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "10");
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

    getInvoiceById: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Invoice", id }],
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
  }),
});

export const {
  useGetInvoicesAdminQuery,
  useGetMyInvoicesQuery,
  useGetInvoiceByIdQuery,
  useUpdateInvoiceByAdminMutation,
  useDeleteInvoiceByAdminMutation,
} = invoicesApiSlice;
