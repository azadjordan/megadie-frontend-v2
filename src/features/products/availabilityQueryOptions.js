// Stock is separate from the five-minute catalog content cache. This is an
// age threshold on revisiting, not a polling timer or an order reservation.
export const AVAILABILITY_QUERY_OPTIONS = {
  refetchOnMountOrArgChange: 15,
  refetchOnFocus: true,
  refetchOnReconnect: true,
};

// Existing inventory edits and reservation mutations already invalidate these
// domain tags. Both summary and detailed availability subscribe to them.
export const AVAILABILITY_TAGS = [
  {type:'InventoryProduct', id:'LIST'},
  {type:'OrderAllocation', id:'LIST'},
  {type:'Order', id:'LIST'}, // Cancelling an order also releases reservations.
];
