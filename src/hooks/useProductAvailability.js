import { useMemo } from 'react';
import { useGetProductsAvailabilityQuery } from '../features/products/productsApiSlice';
import { AVAILABILITY_QUERY_OPTIONS } from '../features/products/availabilityQueryOptions';

export default function useProductAvailability(productIds) {
  // A set of products has one cache key, regardless of card/cart display order.
  const ids = useMemo(() => [...new Set(productIds.filter(Boolean).map(String))].sort(), [productIds]);
  const query = useGetProductsAvailabilityQuery(ids, {
    ...AVAILABILITY_QUERY_OPTIONS,
    skip: ids.length === 0,
  });
  const availabilityByProductId = useMemo(() => new Map(
    (query.isError ? [] : query.currentData || [])
      .filter(row => row?.productId)
      .map(row => [String(row.productId), row])
  ), [query.currentData, query.isError]);
  return {...query, availabilityByProductId};
}
