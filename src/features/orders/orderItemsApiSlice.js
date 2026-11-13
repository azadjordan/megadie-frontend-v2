import { apiSlice } from "../../app/apiSlice";

export const orderItemsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getOrderItemsEditor: builder.query({
      query: id => '/orders/' + id + '/items-editor', keepUnusedDataFor: 0,
    }),
    getOrderItemPreview: builder.query({
      query: ({ id, expectedRevision, items }) => ({ url: '/orders/' + id + '/items-preview', method: 'POST', body: { expectedRevision, items } }),
      keepUnusedDataFor: 0,
    }),
    searchOrderItemProducts: builder.query({
      query: ({ id, search }) => ({ url: '/orders/' + id + '/item-products', params: { search } }), keepUnusedDataFor: 0,
    }),
    saveOrderItems: builder.mutation({
      query: ({ id, ...body }) => ({ url: '/orders/' + id + '/items', method: 'PUT', body, timeout: 20000 }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id }, { type: 'Order', id: 'LIST' },
        { type: 'Packing', id }, { type: 'Packing', id: 'LIST' },
        { type: 'OrderAllocation', id: 'ORDER-' + id }, { type: 'OrderAllocation', id: 'LIST' },
        { type: 'SlotItem', id: 'LIST' }, { type: 'InventoryProduct', id: 'LIST' },
        { type: 'InventoryMovement', id: 'LIST' }, { type: 'Product', id: 'AVAILABILITY' },
      ],
    }),
  }),
});
export const { useGetOrderItemsEditorQuery, useGetOrderItemPreviewQuery, useSearchOrderItemProductsQuery, useSaveOrderItemsMutation } = orderItemsApiSlice;
