# Worker packing UI and interactions

Status: implemented locally, including the UI review revision.
Business scope: [worker packing plan](../../megadie-backend/docs/worker-packing-plan.md).

## Screen responsibilities

| Screen | Job |
| --- | --- |
| Worker orders `/packing` | Choose the next assignment and see its progress. |
| Worker order `/packing/orders/:id` | Collect physical goods, solve shortages, and pack. |
| Admin orders | See the worker/status summary and open packing directly. |
| Admin order details | Manage the order, reservations, billing and delivery; show one compact packing row. |
| Admin packing `/admin/orders/:id/packing` | Monitor progress, resolve shortages, inspect original reports, change assignment, and reopen packing. |

The admin packing page uses the existing admin layout. Physical picking and
Mark packed controls require explicitly choosing **Edit picking progress**.
Reported shortages can be resolved from the monitoring view. Closed tasks remain
viewable, with their saved history and no picking controls.

## Worker overview

A responsive order card grid uses one column on phones, two on medium screens,
and three on wider desktop screens. Each card is one accessible link containing:

- Client name, strongest in the card.
- Order number and the full **Carton tag**, consisting of the client name plus
  the order code (for example, Ahmed Trading — 9E7D51).
- Pack only or Pack & deliver.
- Complete-product count, partial-product count when applicable, and Needs
  attention for unresolved shortages or incomplete reservations.
- Assignment/packing date and one action: Open order, Continue packing, View
  delivery, or View packed order.

Three queues are always visible, with counts and specific empty messages:

1. **To pack**: every unpacked active assignment, including partial work and
   orders with a Needs attention badge. Empty: "No orders waiting to pack."
2. **Ready to deliver**: packed Pack & deliver assignments. Empty: "No deliveries
   waiting."
3. **Ready for handoff**: packed Pack only assignments. Empty: "No packed orders
   waiting for handoff."

These queues derive from existing packing/task fields, not new business statuses.
Delivered orders leave active work. The existing admin action confirms delivery;
this revision does not introduce worker delivery confirmation.

`GET /api/packing/orders?view=board` supplies independent queue pages (12 cards
per queue) and counts covering all scoped assignments. Each page parameter is
`to_packPage`, `ready_deliveryPage`, or `ready_handoffPage`. Out-of-range pages
clamp to the remaining last page. Partial progress is derived from allocations,
including older records, rather than requiring a data backfill.

Loading and errors never display an empty-work message. A failed background
refresh keeps the last saved list and explains that it could not refresh.
Manual Refresh is secondary; the list also polls and refreshes on focus.

## Picking checklist

Use a comfortable single column with a compact client/order header, carton
tag (client name and code), and complete-product count. Do not aggregate unlike units into a
quantity-based overall percentage. Partial products are explicitly indicated.

Each product shows its SKU, descriptive name, exact order quantity and unit.
Each location row emphasizes the slot and remaining quantity. **Picked all 37**
or **Picked remaining 30** records physical collection, with the packing unit
shown beside the instruction. **Not enough here** opens shortage reporting.
Reported-short slots replace the shortcut with **Review shortage** and show the
missing quantity. The server enforces explicit picked totals on those slots.
No extra routine confirmation is needed.
Complete rows are quieter and display saved collection totals.

Keep products and location rows stable during saves and polling. New replacement
locations appear below existing rows. Display saving/saved feedback beside the
affected action. Saving a slot must not make Mark packed say "Saving…".

A compact finish area shows remaining products or readiness, and becomes sticky
when ready. **Mark
packed** stays disabled until every ordered quantity is collected, reservations
are valid, and shortages are resolved. When ready, ask the worker to check the
carton, then mark it packed without another confirmation dialog.

Packed tasks become read-only. Pack only shows **Ready for handoff**. Pack &
deliver shows **Ready to deliver** and expands delivery address/map/instructions.
These delivery assignments remain visible as work until the admin confirms
delivery.

## Missing stock and replacement locations

Use one bottom sheet on phones and a dialog on larger screens, with a persistent
Close header and one scroll area. Show product/SKU and source location once.
Show **Need / Picked / Missing** arithmetic, with the ordering unit clearly
identified. The arithmetic previews the quantity being entered.

The initial field is **Picked from this slot in total**, including earlier
saved picks. It cannot be lower than the saved total in the shortage flow.
The note is optional. **Save shortage** saves the actual total and
shortage, then shows fresh candidates. Saving happens before replacing the
reservation, so a failed replacement cannot erase collected progress.

Each candidate emphasizes location, available quantity, and the quantity that
will be reserved. **Use B1 for 30 rolls** identifies the chosen slot and quantity
and replaces only the unpicked shortage, in one
server transaction. Its accessible name includes the explicit location and
quantity. It does not mark the target goods picked.

- Fully replaced: return to the checklist and identify the new location and
  quantity to collect.
- Partially replaced: keep the sheet open with remaining shortage and updated
  choices. Each transfer is independently all-or-nothing.
- No replacement: "No available replacement. This order is flagged for admin
  help." Allow continuing with other items; do not add an approval workflow.
- Stale/failed replacement: retain saved picks/reports and refresh authoritative
  choices before another write when the result is uncertain.

Candidates keep the existing same-product, active AE1, available-stock rules.
Reported-short locations are excluded. Original discrepancy reports remain in
admin history after the worker resolves the picking shortage.

## One quantity editor

**Correct count** handles saved-count corrections; **Update picked total** is
available inside a reported shortage. Both use the same absolute total entry.
A larger total
records additional physically collected goods. A lower total requires:
"I put 3 back in A1, or the earlier count was wrong."

The acknowledgement appears only for a decrease. The existing versioned server
actions and physical-return safeguards remain authoritative. Totals remain
absolute, preventing uncertain saves from causing duplicate increments.
A packed task must be reopened by an admin before quantities can change.

## Admin help for shortages

The shortage entry point is **Not enough here**, followed by the total
physically picked and **Save shortage**. After saving, show alternative slots
automatically. With no alternatives, including after a partial transfer, admin
help is requested automatically. **Ask admin for help** handles suggested slots
the worker cannot use. Saved requests show persistent product/card feedback and
an instruction to continue other items. Saved panels refresh while drafts remain
protected. Admin resolution clears the request from the current state and shows
a specific quantity-only item update. See [admin help](../../megadie-backend/docs/packing-admin-help.md)
for duplicate suppression and durable Telegram delivery.

The final bar becomes sticky when ready; its disabled state stays below the
checklist. Count corrections show **Left to pick** rather than **Missing**.
**Continue picking** focuses the next usable unfinished slot and highlights it.
Skip shortages and unavailable/completed rows, then wrap to earlier work if
needed. A full replacement focuses its destination. These actions only navigate;
they never mark goods picked. With no usable location, retain shortage/help
feedback and offer **Choose another order**. Current admin changes clear an
outdated blocked-work message. The final step says **All items picked** and asks
the worker to check and pack the order before **Mark packed**.

## Admin order item changes

Admin item editing is implemented in the existing order details page. See
[order item changes](../../megadie-backend/docs/order-item-changes.md) for the
server contract, return rules and checks. Packing shortages link to the shared
editor with the affected product highlighted. The admin packing header always
shows **Edit order items**, including when no shortages remain; locked orders
keep the action disabled with a visible reason. Item changes preserve the worker
assignment and valid picks; the worker checklist shows the revised targets and
a short admin-update notice. This first version locks item changes once an
invoice exists, after delivery/finalization, or until packed orders are reopened.

## Admin assignment dialog

Before publication, show client/order context, the worker selector, task choice,
required delivery fields, and one **Send to worker** action. When ready, use a
compact fully-reserved line. Show detailed affected products and a link to Review
reservations only when blocked. Customer-default-location opt-in is disclosed
under Customer location preference. No automatic default updates occur.

After publication, replace the editable form with an assignment summary, carton
tag, **View packing**, **Copy worker link**, and secondary **Change assignment**.
Saving changes is available only when the form differs from the saved baseline.
Preserve picked quantities and the existing handover notice on reassignment.

All exits from a dirty form, including navigation links and the legacy-copy
path, use the same Keep editing / Discard changes choice. Saved assignments stay
saved when the dialog closes. Clipboard failures can be retried independently.
Uncertain sends require checking authoritative progress before another write.

The legacy packing-message workflow remains secondary for unpublished orders.
Once published, the share flow uses the authenticated worker link.

## Supporting admin controls and feedback

Live packing is sent before invoicing. Invoicing is available after Packed;
initial publication and packing reopening explain existing billing blockers.
The admin list adds Stock checks and compact pending-report badges, including
closed orders. The dedicated packing page records Mark checked / Reopen check
with reviewer/date and separate versioning, leaving worker progress untouched.
See [billing and stock review](../../megadie-backend/docs/packing-billing-and-stock-review.md).

- Order list: Send to worker before publication, View packing afterward,
  including closed historical tasks. The assignee/progress badge also links
  directly to the dedicated packing page.
- Order details: one compact Packing summary row, never the full worker checklist.
- User details: Worker access and Admin user are grouped under Account access.
  Only admins edit access; changing worker access requires a fresh staff login.
- Deletion shows picked quantities and original slots. After the admin confirms
  physical return and types the order number, deletion records the return in the
  release audit and deletes the order atomically. Pending picks are already in
  stock totals and are not added again. A changed reservation/picking version
  requires a fresh preview and new confirmation. The Delete button stays visible;
  genuine blockers disable it and explain why. The footer remains visible while
  the preview scrolls, including on mobile.
- Keep the separate physical-stock cancellation/count-correction safeguards and
  affected quantities. No new routine picking confirmations.
- Dialogs contain keyboard focus and restore it on close; unsaved edits are
  protected. Session warnings render inside an open packing dialog so renewal
  remains reachable. Outside a dialog, warnings avoid the bottom finish controls.
- Failed saves are distinct from failed reads after a confirmed save. Offline
  state disables writes immediately. Older reads cannot replace newer saved
  checklist versions, and duplicate taps are blocked synchronously.

A separate Stock check badge / Mark reviewed lifecycle remains deferred.

## Verification

Frontend lint/build; backend worker state/integration tests; browser tests for
worker/admin queues, responsive layout, empty/error states, partial picking,
replacement, quantity corrections, assignment/dirty forms, monitoring and session
warnings; real login through packing on an isolated local API/database; existing
reservation, session and copy-message browser checks.

Automated browser APIs are intercepted or redirected to named disposable local
databases. No production test records or clipboard writes are created.
