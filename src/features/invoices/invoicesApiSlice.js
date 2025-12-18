import { apiSlice } from "../../app/apiSlice";

export const invoicesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const { useGetMyInvoicesQuery, useGetInvoiceByIdQuery } = invoicesApiSlice;
