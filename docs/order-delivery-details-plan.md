# Order delivery details — reviewed frontend plan

Status: planning only; application behavior is unchanged.
Reviewed: 2026-11-02. This version replaces the first plan.
Branch in both repositories: `feat/order-delivery-details`.
Contract: [backend plan](../../megadie-backend/docs/order-delivery-details-plan.md).

## 1. Keep the workflow small

Retain two actions on the existing admin order rows:

- **Courier**, with the existing truck icon and courier message.
- **Prepare & Deliver**, replacing the unfinished Pick list action, with a clipboard/checklist icon.

Both use the destination saved on the order. AE1 is the one current UAE store, and AE2 is unused. Internal staff already know where to collect, so their message shows slot labels/items/quantities without store address/map/phone information. The external courier keeps its existing pickup details and commercial instructions.

The first plan added too much: a customer-default migration, a store directory/settings editor, a full profile UI expansion, and a preview/refetch/comparison loop. The reviewed backend retains existing customer address fields. Store-location storage, endpoints, and UI are outside this feature. The frontend follows those simpler contracts.

## 2. Prepare & Deliver interaction

Preserve the current pick-list prototype's normal one-click behavior:

1. Click Prepare & Deliver. Show loading on that action and prevent duplicate clicks.
2. Make one fresh lazy GET `/orders/:id/fulfillment-sheet`, bypassing a cached result.
3. If the Shipping order has no blocking problems, format and copy the returned sheet. Show success only when clipboard writing succeeds.
4. If there are problems, show a small dialog with the draft, the concrete issues, and a clearly labeled **Copy preparation draft** action. Missing customer delivery details can be reviewed/edited there; reservation/slot issues use the existing reservation UI. Store addresses are not required and do not create warnings.
5. A cancelled/delivered order has no actionable staff copy. The backend also checks this, because the row's status may be stale.

Do not require a preview dialog for every complete copy, refetch automatically on every dialog Copy click, compare response fingerprints, or introduce confirmation loops. A displayed draft/failed-copy preview can have a simple Refresh action. Copy its currently displayed text. After a destination save, fetch the updated sheet once before copying because it contains allocation/slot information too.

Reuse `src/utils/clipboard.js`. If asynchronous clipboard access fails, keep the prepared text visible for a direct retry or manual selection; do not run another network read merely to retry the clipboard. No inventory, reservation, or order-status mutation is part of copying.

## 3. Edit delivery for this order

Reuse the existing CourierDetailsModal and extract a small delivery-fields component only where the staff dialog needs the same inputs. No generic form framework or new modal system is needed.

Fields: recipient name, primary phone, optional secondary phone, written address, map link, and delivery notes/receiving hours. Both forms read backend `resolvedDelivery`; neither falls back independently to `order.user` when a saved destination exists.

- Label the form **Delivery for this order**, with **Changes apply to this order only.**
- Existing active orders without a saved destination show **Suggested from customer profile — review and save for this order.** Opening a dialog does not save or confirm it.
- Save through PUT `/orders/:id/delivery-details` with the six-field `deliveryDetails` value and `expectedRevision`. Remove the courier order dialog's `updateUserDelivery` call.
- **Save for this order** permits incomplete details. **Save & Copy** explicitly saves reviewed values and then copies when complete; the label must disclose the save. Plain **Copy** never saves.
- Final delivery text needs recipient name, primary phone, and address or map. Show simple field errors and keep entered text on failure.
- On 409, retain entered text and offer reload/review. Do not force overwrite or automatically merge different recipients.
- A saved empty field stays empty; a background refetch must not fill it from the account. Do not reset a form with unsaved edits when data refetches.
- Delivered/cancelled delivery details are read-only. An older completed order with no saved destination displays unavailable rather than today's customer address.

Keep Courier's existing preview, pickup, total, and instruction notes. Load the selected order fresh when opening the form; a plain Copy uses the shown values. A save returns the authoritative destination/revision and can update that preview without another full read. The staff formatter and courier formatter share destination fields, not their whole message templates.

No preselected also-update-customer checkbox or automatic default reset is needed. Customer default edits remain on the customer page.

## 4. Customer defaults: extend existing forms

`AdminUserDetailsPage.jsx` already edits address, map, secondary phone, and delivery notes. Keep those fields and flat payload names. Add only optional **Delivery contact name** and **Delivery phone** overrides, labeled **Leave empty to use the account name/phone**. Account identity fields remain separate; delivery phone overrides are not unique.

Explain that these defaults are used for new orders and existing orders keep their saved destination. Keep the customer AccountProfilePage's current form; label its address as the default delivery address and add that explanation. Do not build a new self-service delivery settings area in this feature. Existing account saves omit unrelated delivery fields and therefore preserve them.

The correct profile API is `/users/account/profile`. There is no nested `defaultDeliveryDetails` write, duplicate address value, or client-side synchronization of old/new fields.

## 5. Store details: omit from the staff feature

Do not add a store-location button, form, page, route, settings API slice changes, or store-location reads. Staff use the one known AE1 store. Full slot labels such as A2-AE1 remain in the copied picking lines; the store name/address/map/phones are omitted.

Keep the existing external Courier pickup block and configuration: its recipient may need directions to the store. Removing pickup information from the internal staff message does not remove it from Courier. AE2 stays unused; do not rename/delete inventory codes, invent a second pickup, or alias AE2 to AE1. Revisit store directions if another actual store or an outside collection workflow is introduced later.

## 6. Staff text and minimal state rules

Evolve the existing pure `orderWorkerShare.js` formatter to accept the dedicated allowlisted response. Keep order number/customer initials on the carton label. Use this sequence:

```text
PREPARE & DELIVER — ORDER #...
Carton tag: #... · customer initials

COLLECT & PICK
Slot A2-AE1 · SKU / order product name · quantity
Slot B1-AE1 · SKU / order product name · quantity

PACK & CHECK
SKU · ordered quantity / allocated quantity
Total quantities

DELIVER
Recipient name / phone / optional secondary phone
Address / map / delivery notes
```

Naturally sort the slot lines and include one per-SKU packing check. No store heading or address block is needed. An unexpected unused store code produces a data issue rather than guessed directions. Use the order's existing SKU/product-name snapshot; fall back to SKU when a historical name is missing. Use units without adding a selling-unit model or per-product requests.

The backend returns `problems` (draft/HOLD) and `notices` (advisory). Display them plainly rather than implementing a second client readiness engine. Processing orders can produce a preparation draft; complete Shipping orders can produce the normal sheet. Cancelled/Delivered staff actions are disabled; there is no new historical-reference copy mode.

Respect the existing sequence: reserve during Shipping, deliver, then finalize stock. A deducted record does not prove collection/packing; retain the check-before-picking-again warning. Do not automatically change stock, mark a line picked, or assume deducted units never need physical collection.

Include recipient contact and delivery instructions intentionally. Exclude prices, totals, invoices/payments, internal notes, account email, and staff identities from staff text. Courier retains its own content rules.

## 7. Implementation surface and performance

| Area | Necessary change |
| --- | --- |
| `ordersApiSlice.js` | Lazy fresh sheet read and guarded order-delivery mutation |
| `AdminOrdersPage.jsx` / CourierDetailsModal | Use resolved order destination; remove profile write; rename/evolve Pick list; show issues only when needed |
| Delivery fields and pure share helpers | Reuse inputs where actually needed; share normalization, keep separate staff/courier formatters |
| `AdminUserDetailsPage.jsx` / user APIs | Two optional contact override fields; retain existing address storage |
| `AccountProfilePage.jsx` | Clarify default address scope; preserve existing form |

Use the existing React, RTK Query, icons, styling, and clipboard utility. No new dependencies. Preserve the four local pick-list prototype files and evolve them rather than adding a third action.

One normal staff click makes one combined request. There are no per-row fulfillment fetches, store lookups per allocation, polling, or automatic second read on Copy. Force fresh reads on each new row action; no elaborate sheet cache invalidation network is needed. Keep ordinary order/list invalidation after a destination save. Refresh a displayed draft explicitly or after its destination is saved. Clipboard retry reuses the prepared text.

The sheet is an informational read, not an atomic inventory snapshot. Show its generation time in a dialog. Existing transactional reservation/delivery/finalization code remains the authority; do not redesign it to guarantee the lifetime of copied text.

## 8. Build order and focused acceptance

Implement backend order/default storage and editing first, then switch Courier, followed by the combined order/allocation staff sheet and button. Verify these useful cases:

- Editing a customer default leaves existing saved destinations unchanged; two orders for that customer can differ.
- Order contact edits leave account identity/defaults alone; optional default contact overrides work and can be cleared back to account contact.
- Legacy active suggestions require explicit saving; completed legacy orders do not show invented historical details; saved blank fields stay blank.
- Stale saves preserve the form and show a conflict; cancelled/delivered order edits are blocked.
- Slot labels, ordering, and SKU quantities are correct; missing slots, unused codes, and partial/excess/mixed allocations produce clear issues. Staff text contains no store address/contact block.
- Staff text contains necessary delivery contacts and excludes financial/internal fields; Courier uses the same saved destination.
- Clipboard failure preserves text, duplicate clicks are blocked, copying performs no writes, and the order list creates no sheet requests.
- Existing account form saves preserve unedited delivery values; Courier retains its existing pickup details.
- Labels, keyboard/focus behavior, compact action names, and mobile long-address wrapping remain usable.

Extend existing pure helper/formatter tests. Use a disposable test database for integration, then run focused browser checks plus `npm run lint` and `npm run build`. No application tests or production writes are needed for this planning review.

## 9. Scope and release

Backend deploys first, frontend second in one coordinated release. Avoid order creation/courier edits in between, because the old form writes User while the new backend saves destinations on orders; review affected active orders if either action occurred during that gap. No store setup or address confirmation is needed for this internal message. Unexpected AE2 allocations require data review because that code is unused. Keep the existing Courier pickup configuration. No bulk address migration, completed-order backfill, inventory workflow change, new historical-reference view, store-settings feature, or profile redesign is included.

Both repositories stay on `feat/order-delivery-details`. Existing unfinished work is preserved and unrelated backend inventory scripts are excluded. This revision changes the plans only; implementation and release remain subsequent work.
