# Order delivery details — frontend implementation plan

Status: proposed implementation plan; application behavior is unchanged by this document.
Date: 2026-11-02.
Branch in both repositories: `feat/order-delivery-details`.
Frontend starting commit: `d1f574e` (`main`, synchronized with GitHub when branching).
Backend starting commit: `93c2970`.
Shared data/API contract: `../../megadie-backend/docs/order-delivery-details-plan.md`.

## 1. User-facing outcome

Keep two clear actions in the admin orders page:

- **Courier** — details for an external courier, using the existing courier handoff point and its current commercial/instruction content.
- **Prepare & Deliver** — a checklist for the person collecting the order from AE1/AE2, packing it, and delivering it to the customer.

Both actions use the same destination saved on the order. The editing form says **Delivery for this order**. Saving there changes that order only. Customer defaults are edited in the customer's own delivery section, and store addresses are edited in a small admin location section.

No order-row background fetching, new checkout steps, or extra confirmation dialog for copying a complete, already saved order is needed.

## 2. Existing work to carry forward

The branch preserves four existing local pick-list prototype files:

- `src/pages/Admin/AdminOrdersPage.jsx`
- `src/features/orderAllocations/orderAllocationsApiSlice.js`
- `src/utils/orderWorkerShare.js`
- `src/utils/orderWorkerShare.test.mjs`

The prototype currently fetches the order and allocations separately, groups primarily by SKU, uses customer initials on a carton label, and avoids financial/contact fields. Evolve it into the shared-contract flow rather than adding a third overlapping action. Recipient contact data is now intentional in the staff sheet; financial and internal data still stay out. Keep the carton tag based on order number and customer initials, separate from the recipient's full delivery name.

The planning mockup is `../../work/prepare-deliver-sheet.html` (local design reference, not a bundled application asset). It demonstrates collect/pick, pack/check, and deliver sections and several order conditions. Actual store locations remain unconfirmed placeholders there.

## 3. Screen and interaction design

### Order actions and sheet preview

Use the existing orders-page action placement. Give Prepare & Deliver a clipboard/checklist icon, a visible label where space permits, and the accessible label **Copy prepare and deliver sheet** in compact layouts. Keep Courier's truck icon. Do not add another heavy panel to every row.

On opening Prepare & Deliver:

1. Fetch one fresh fulfillment-sheet response for the selected order; show loading on that action/dialog and prevent duplicate requests.
2. Show a compact preview arranged in work order: **Collect & Pick → Pack & Check → Deliver**. Copy text preserves the same sequence.
3. For a complete order, enable **Copy sheet**. For incomplete data, show the specific fixes and an explicitly labeled **Copy preparation draft** with HOLD text. A draft is never presented as ready for delivery.
4. Offer **Edit order delivery** when the destination is missing or needs correction. If pickup details are missing, link to location settings. If allocations are incomplete, use the existing reservation workflow.
5. Copy only after an explicit user action. Show success only after clipboard writing succeeds; preserve preview text for retry/select-and-copy when clipboard permission fails.

Courier also reads fresh order details when opened and uses `resolvedDelivery`, rather than repopulating its form from `order.user`. It retains its own pickup, totals, notes, and preview layout. Shared delivery fields/validation can be reused inside the existing CourierDetailsModal; keep courier-only instruction fields out of the staff sheet.

### Delivery for this order

Fields in this order:

1. Delivery contact name.
2. Primary phone and optional second phone.
3. Written address.
4. Google Maps link.
5. Delivery notes / receiving hours.

Use ordinary text inputs, a telephone input, and short textareas. Explain that an address or map link is sufficient. Show validation beside the relevant field and preserve input on server/network failure.

- Main save label: **Save for this order**. Supporting text: **Changes apply to this order only.**
- Allow incomplete details to be saved; final copy needs a contact name, primary phone, and address or map.
- For an active older order with no saved destination, label the initial values **Suggested from customer profile — review and save for this order**. Do not silently confirm them when the preview opens.
- An explicit **Use customer default** action may replace the form values. It remains a draft until saved and must not run automatically on rerender/refetch. If it would discard unsaved edits, ask within the form before replacing them.
- Do not add a preselected “also update customer” checkbox. Default delivery editing remains on the customer page for this version, where its scope is clear.
- After a successful save, refresh the relevant preview from the server before final copying. A revision conflict keeps unsaved text and offers reload/review; it must not retry an overwrite automatically.
- Delivered/cancelled orders are read-only. An older completed order without a saved destination says it is unavailable, rather than displaying today's address as historical fact.

### Customer default delivery details

Update `AdminUserDetailsPage.jsx` and `AccountProfilePage.jsx` with a clearly separated **Default delivery details** section using the shared fields. Keep account name/email/unique phone in the account section. Explain: **Used for new orders. Existing orders keep their saved delivery details.**

Read the resolved `defaultDeliveryDetails` response, including legacy suggestions. Send the nested value only when that section is saved; account-only editing must not clear or overwrite it. Preserve full-map/notes/secondary-phone values when other fields are edited. Registration can keep its existing simple account fields; a full delivery form is not required at signup.

### Store locations

Add a lightweight **Store locations** section within existing admin inventory/settings navigation. Show two short forms, labeled AE1 and AE2. Fields: display name, address, Google Maps link, up to two phones, optional contact name and pickup notes. Store codes are read-only. Support incomplete setup with a clear missing-details state.

Do not expose stock pickup locations in customer-facing profile/order pages. Do not guess their addresses from the existing courier configuration. Show actual pickup locations inside the staff preview only when the selected order has allocations there.

## 4. Copied content

Use a pure formatter with an explicit staff-sheet DTO, not a raw spread of the order, User, or courier message. Shared destination normalization is reused by both formatters; each owns its content.

```text
PREPARE & DELIVER — ORDER #...
Carton tag: #... · customer initials

COLLECT & PICK
AE1 — location name
Address / map / pickup phone
Slot A2-AE1 · SKU / readable variant · quantity

AE2 — location name
Address / map / pickup phone
Slot B1-AE2 · SKU / readable variant · quantity

PACK & CHECK
SKU / readable variant · ordered / allocated quantities
Total quantities and carton label

DELIVER
Recipient name
Phone / optional second phone
Address / map / delivery notes
```

Omit unused stores/empty optional lines. Group by store, then naturally sorted slot, and keep one final per-SKU packing check across all stores. Prefer immutable order labels when available. Use neutral `units` until a reliable unit is available; do not hard-code rolls for every product type.

No prices, totals, invoice/payment information, account email, internal notes, or staff identities enter this formatter. The courier formatter retains its existing appropriate financial/instruction content.

| State | UI and copy behavior |
| --- | --- |
| Complete active order | Final preview and Copy sheet |
| Incomplete/mismatched allocations | Specific warning and preparation draft/HOLD; link to reservations |
| Missing destination or pickup location | Identify missing fields and editing destination; draft only |
| Active legacy order | Review and save suggested destination before final copy |
| Deducted/finalized stock | Prominent check-packed-goods warning; no instruction to pick deducted items again |
| Delivered | Completed reference only; no active preparation instruction |
| Cancelled | No actionable copy; explain why |

Do not treat the backend's sheet completeness as proof of physical packing or completed delivery. Copying leaves order and inventory state unchanged.

## 5. Files and API integration

| Area | Planned change |
| --- | --- |
| `src/features/orders/ordersApiSlice.js` | Add order-delivery mutation and lazy fulfillment-sheet query; retain existing single-order read for Courier |
| `src/pages/Admin/AdminOrdersPage.jsx` | Replace worker prototype with Prepare & Deliver flow; route delivery edits to the order mutation; remove `updateUserDelivery` from courier save |
| `src/components/admin/CourierDetailsModal.jsx` | Reuse order-scoped delivery fields, display saved/suggested state, and preserve courier-only instructions |
| Shared delivery form/helper (new) | Consistent field labels, normalization, completeness, and form behavior across order/default editing |
| `src/utils/orderCourierShare.js` | Use explicit resolved order destination/contact name; keep pickup and commercial content |
| `src/utils/orderWorkerShare.js` or renamed fulfillment helper | Pure store-first staff-sheet formatter using the dedicated DTO; update its imports and meaningful tests together |
| User API slice and account/admin user pages | Read/write nested customer defaults separately from account identity |
| New store-location API slice and admin section | Fixed AE1/AE2 forms; wire into `src/routes/AppRoutes.jsx` and existing admin navigation if a separate route is needed |
| `src/app/apiSlice.js` | Add StoreLocation cache tag only if needed by the new endpoints |

Keep the backend companion document as the authority for field names, response shapes, source values, revision semantics, and API permissions. Do not create a second client-side resolver that silently falls back to `order.user` once a saved order destination exists.

### Performance and freshness

- Fetch sheet details only for the selected order, not every listed row. The new endpoint replaces the prototype's independent order/allocation calls.
- Force a fresh read on opening/reopening and on the final-copy action. Handle a changed response by refreshing the preview and requiring a new deliberate copy; do not silently copy different instructions than shown. These are bounded requests for the selected order, not repeated requests for the list.
- Treat the sheet as an as-of-time document. Display its generated time. Do not add polling; final on-copy refresh is enough for this small workflow.
- A plain final-copy click can perform the fresh read and copy when the returned sheet is unchanged. If browser clipboard restrictions prevent asynchronous writing, retain the fresh preview and offer Copy again/select text.
- Use short-lived/no-retained sheet caching (`keepUnusedDataFor: 0`) and refetch when a dialog mounts; avoid an allocation/store cache that can hide changes made elsewhere.
- Order destination mutations invalidate that order's details/list and its sheet. Allocation/finalization/cancellation/delivery changes invalidate the affected sheet; location updates invalidate sheets or force their next read. Customer default changes invalidate User data but must not replace saved order destinations.
- Cache the two store configuration records for the settings UI; the backend resolves fresh pickup records for the sheet. Do not make the browser fetch stores individually for each allocation.
- Reuse current React/RTK Query, dialog styling, and icons. No maps SDK, new UI library, image assets, or large dependency is needed.

## 6. Implementation order

1. Agree the backend contract and implement pure delivery/formatter fixtures against it.
2. Add customer-default editing and the lightweight store settings, once their backend endpoints exist.
3. Add the order-only form/mutation, revision handling, and visible legacy confirmation flow.
4. Change Courier to use the saved order destination and stop updating User from the order dialog.
5. Evolve the worker prototype into Prepare & Deliver using the combined endpoint and state rules.
6. Verify both actions against the same order, then run focused UI checks plus full lint/build. Review frontend and backend together before release.

## 7. Acceptance and validation

Extend the existing pure formatter tests to cover one/two stores, slot ordering, repeated SKUs, readable labels, every warning state, exact expected quantities, international contact text, and absence of financial/internal fields. Add focused tests for saved blanks, revision conflicts, and delivery/default isolation where the behavior lives; do not mirror JSX in brittle tests.

Exercise these integration flows using a disposable test database:

- Create an order from a customer default, edit the default, and confirm that both copy actions still use the order's saved destination.
- Edit one order's recipient/phone/address and confirm the account identity, default, and another order are unchanged.
- Open a legacy active order, review the suggestion, save, and copy. Confirm opening/copying a draft alone performs no writes.
- Change a customer on an eligible order and show the reset destination; confirm existing invoice restrictions remain effective.
- Two admins save stale versions: show conflict without discarding entered text or overwriting the winner.
- Missing location, partial/excess reservation, deducted stock, cancelled, and completed orders each show the correct copy mode.
- Clipboard failure preserves the text and permits retry. Double-clicks do not duplicate fetch/save operations or success notifications.
- Keyboard/focus behavior, form labels, compact icon labels, small mobile viewports, and long addresses/map links remain usable.
- Opening the order list produces no per-row fulfillment calls; one selected sheet uses one combined request per freshness check. Copying performs no inventory/order writes.

Commands after implementation: targeted `node --test` formatter/helper suites, `npm run lint`, `npm run build`, and focused browser coverage of these flows. No application tests are needed merely for adding this plan.

## 8. Release and scope control

Backend deploys first with additive compatibility, then frontend. Before operational use, enter the real AE1/AE2 locations and confirm the meaning of the current courier pickup point. Historical orders are not mass-backfilled. Legacy fields are retained for this release.

All new feature work stays on `feat/order-delivery-details` in each repository. Existing local pick-list changes are preserved on this frontend branch; unrelated backend inventory scripts stay outside feature commits. Planning does not deploy, migrate the database, or push new work to GitHub. Implementation, review, and release are separate next stages.
