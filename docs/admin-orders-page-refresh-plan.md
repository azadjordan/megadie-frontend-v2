# Admin orders page refresh

Status: implemented and verified locally on 14 November 2026, with later revisions linked below. Deployment is manual.

Design follow-up (16 November 2026): the implemented independent-part layout and
controls are specified in [the full UI plan](admin-orders-information-layout-review.md).
That revision supersedes this document's earlier row/card design;
the implementation history and existing workflow safeguards below remain relevant.

Shared-control follow-up: the admin sidebar now uses Work, Billing and Management
groups, a blue selected-page state, secondary Back to site access and a quiet
Logout footer. Desktop and mobile share the same destinations. The mobile drawer
supports keyboard focus containment, Escape, focus restoration and staff-session
warnings. Admin lists share the same grouped pagination style; customer/public
pagination keeps its existing presentation. Browser regression coverage is in
`megadie-backend/tests/admin-navigation.browser.mjs`.

The visual direction is the local admin-orders-proposal preview.
Its example records, abbreviated workflows and simulated dialogs are illustrative.
Production must use actual order data and the existing dialogs and safeguards.
The implementation also retains a dedicated Finalize stock shortcut, omitted
from the first preview, so outstanding stock deduction work stays discoverable.
The recent local duplicate-Invoice/click-handler fix and its regression tests
must be retained in this work.

## 1. Outcome and scope

An admin should be able to identify the client, understand the current work,
notice an actual problem, and choose the next action without reading a wall of
badges or interpreting several unlabeled icons.

Refresh the Orders content, desktop table, mobile cards, list actions and filters.
Keep the existing admin shell and navigation. Reuse the current assignment,
invoice, payment, delivery, courier, deletion and packing screens.

Small backend read changes are needed for genuine Needs admin filtering/counts
and the new preparation/invoicing shortcuts. This is not purely a cosmetic change.
Use existing Orders, Allocations, Invoices and help records. No new order status,
role, collection, manual migration or third-party UI dependency is planned.

## 2. Row and card contents

| Area | Default contents |
| --- | --- |
| Order / client | Client name, linked full order number, short creation date/time |
| Progress | One readable progress label; worker/progress context only while useful; separate stock-check link when pending |
| Billing | No invoice once, or invoice reference/PDF access plus payment state and actual balance; Record payment when eligible |
| Total | Existing calculated order total, distinct ordered-product count as items, and total ordered quantity as units |
| Next action | One recommended action and a More button |

Client identity comes from the order's customer, not its potentially different
delivery recipient. Email remains searchable and available in order details.
Keep full references accessible and readable when names or references are long.
Show the summary as "3 items · 47 units". Items counts distinct products; units
sums the ordered quantities in each product's selling unit. This is an order-size
count, with no conversion to loose pieces, cartons, lengths or weights.

Keep currency attached to amounts. An absent/failed balance is "Balance
unavailable", never zero or Paid. An invoice number/ID alone does not prove
payment. A cancelled invoice must be identified as cancelled. An issued zero-value
invoice can currently have paymentStatus Unpaid and a zero balance: show "No
balance due", not "Paid", and offer no payment entry for zero. Use the existing
financial helpers and cached fields; do not rewrite invoice/payment calculations.
Missing balance information changes Billing, not permission to pack or deliver.

On phones, use the same row data in compact cards: client/reference/date and total,
progress, then billing and actions. Avoid cloning the old badge-heavy row vertically.
Use the table only when five columns fit the actual content width with the sidebar.
Verify wide desktop, narrow desktop/tablet, 390px and 320px layouts.

Use labeled, icon-bearing status badges and a slim row/card color accent so the
page is easy to scan. The main label and row accent describe unfinished work:
blue for active preparation/picking/delivery, amber for reservations or delivered
orders with follow-up, rose for problems, and slate for closed cancellations.
Packed orders say Awaiting delivery, with Packed/worker/mode as a smaller
milestone. Delivered orders stay amber while invoicing, payment, stock finalization
or report checks remain. Billing and stock continue to expose their own state;
they do not become new gates for delivery. Normal action buttons are blue and
review/problem actions are rose, rather than showing unfinished actions in green.

Green Complete requires confirmed delivery, an issued invoice with a known zero
balance, finalized stock, and a known zero unchecked-report count. Published
worker tasks also need their Packed confirmation. Missing facts or inconsistent
records never imply Complete. Zero-value invoices keep No balance due rather than
Paid. Manual orders without published tasks do not require a new worker milestone.
Complete is a derived display label, not a new stored order status or permission.
Completed stock is a quiet milestone; Paid remains a separate billing status.
Published unfinished tasks show a bar of products fully picked, not units or
confirmation that the order is Packed. Pending stock reports keep a separate
amber link even after Packed, Delivered, cancellation or payment. Do not repeat
a completed picking count alongside Packed. Positive Needs admin and Stock checks
shortcut counts use rose and amber respectively; labels/icons retain the meaning
without relying on color alone. Use stronger contrast and readable status text.

## 3. Progress and action rules

Resolve progress, recommended action, billing action and secondary actions once
per order. Desktop and mobile render that same result. Extend the existing
adminOrderActions helper rather than building a new workflow engine.

Evaluate closed/finalized records first, then use the relevant active-order case.
An absent worker on an unpublished order is normal, not a data error. Missing
optional fields must not block otherwise permitted work.

Priority and prerequisites:

| Current situation | Recommended action |
| --- | --- |
| Cancelled | No routine fulfillment or payment mutation; keep allowed history, reports and deletion access |
| Delivered with finalized stock | No routine fulfillment button; payment/report follow-up remains independent |
| Processing | Start preparation: existing move-to-Shipping action |
| Shipping, stock not finalized, with active admin-help request | Review issue: existing admin packing screen |
| Shipping, stock not finalized, with incomplete reservations | Reserve stock: existing reservation tab |
| Shipping, stock not finalized, fully reserved, no published task and no invoice | Send to worker: existing assignment dialog |
| Shipping, stock not finalized, fully reserved, published task not Packed | View packing |
| Shipping, stock not finalized, fully reserved, published task Packed, no invoice | Create invoice |
| Shipping, stock not finalized, reserved, invoiced, and Packed when a live task exists | Mark delivered |
| Delivered, no invoice, stock not finalized, eligible for invoicing under existing rules | Create invoice before suggesting finalization |
| Delivered, stock not finalized, invoiced, reserved and ready under existing stock rules | Finalize stock |
| Missing/inconsistent data required for the proposed action | Review order/billing with a specific reason instead of suggesting an invalid action |

A Shipping record already marked stock-finalized, a Delivered live task missing
Packed, a known cancelled/missing linked invoice, or known partially deducted
allocations needs review instead of a misleading normal next step. Do not offer a
second invoice when one is still linked or an existing invoice is discovered.
Do not add a database-repair process or automatically change these records.
The list does not need to fetch every order's entire stock history to predict all
possible server rejections: validate facts available to it and keep the existing
fresh server checks when an operation is attempted.

Keep the order lifecycle label for legacy/manual records honest. Without a
published worker task, do not infer that reservations prove collection or packing.
Worker assignment is a suggestion until the admin explicitly sends the task.

The table describes recommended actions, not new server permissions:

- Manual/WhatsApp orders remain supported. Keep permitted early invoice creation,
  manual delivery and manual packing messages accessible through More or their
  existing detail screens when these are not the recommended action.
- Existing invoiced manual orders must not be routed into Send to worker; first
  publication currently rejects an existing invoice.
- Published tasks still require Packed before delivery; no new mandatory invoice
  or payment release gate is introduced. Where delivery before invoicing is
  currently permitted, it remains accessible through the existing controls.
- Record payment is independent of picking/delivery; payment in full is not a
  prerequisite for delivery or stock finalization.
- Stock checks are follow-up investigation, not a new packing/delivery gate.
- Opening a primary action uses exactly one existing operation/dialog. Do not
  automatically reserve, assign, invoice, deliver or finalize subsequent steps.
- The list is advisory. Existing server checks and fresh modal reads remain
  authoritative if reservations, roles, quantities or billing change meanwhile.

The confirmed Delivered-without-invoice -> Deduct mismatch is fixed by this
priority table. Do not enable Finalize stock merely because the order is Delivered.

## 4. Needs admin versus stock checks

Needs admin means an active help request under the existing packing-help rules,
with an unresolved current picking issue. Do not relabel the broad
packingSummary.needsHelp flag as an admin request: the worker may still have a
usable replacement and be handling it without assistance.

Use the existing activePackingHelp semantics for read metadata and queue
membership. Compute the summary using current help records/allocations in batches
or an aggregation, not one extra request per visible row. Filters must operate
before pagination and counts must cover every matching order.

Expose only the small admin-list summary needed for the screen, such as the count
of products awaiting admin help. Keep help notification internals and detailed
reports out of list responses. Customer/worker response privacy remains intact.

The preview's exact "30 rolls short" text is not a requirement to fetch every SKU,
slot and ordering unit into the list. Prefer a truthful "1 product needs review";
the existing packing page supplies exact products, quantities and locations.

Unchecked original stock reports remain independent: resolving customer/picking
work does not clear the stock-check link or count.

## 5. Secondary actions and naming

Put Record payment alongside Billing; reuse the existing payment dialog.
Link invoice/PDF access from the invoice reference rather than adding another
button in the main action cluster.

More contains only applicable tools:

- Open order.
- Worker assignment/change assignment for eligible active orders.
- View packing/history when available and not already the primary action.
- Delivery/courier details, using the existing editor and copy controls.
- Copy order summary, clearly identifying the admin summary with financial data.
- The existing manual packing-message path for eligible unpublished orders.
- Other currently permitted invoice/delivery actions when not the primary action.
- Review stock reports when pending.
- Delete order, separated at the bottom.

Do not hide deletion just because an order is reserved or Packed. Open the
existing delete preview and retain all typed confirmations, physical-return
acknowledgements, current-version checks and genuine blockers.

Use literal action names: Start preparation, Reserve stock, Review issue,
Send to worker, View packing, Create invoice, Mark delivered, Record payment,
Finalize stock and Copy order summary. Creating an invoice does not imply it has
been sent; copying courier details does not book a courier.

Reuse current modal content and mutation handlers; the mockup's simplified
dialogs must not replace them. Correct the conflicting instruction that tells
live-packing admins to deliver before invoicing, without redesigning order details.

## 6. Filters, counts and navigation

The top row contains All orders, Needs admin, Preparation, To invoice,
To deliver, Finalize stock and Stock checks. Allow wrapping on narrow screens
rather than removing the two distinct stock follow-ups.

| Shortcut | Meaning |
| --- | --- |
| All orders | All existing order statuses, including history |
| Needs admin | Current active worker-help requests |
| Preparation | Processing or Shipping work still awaiting reservation, assignment or packing; exclude finalized/closed orders and completed live packing |
| To invoice | Orders whose recommended next action is Create invoice, including Delivered orders missing an invoice |
| To deliver | Orders whose recommended next action is Mark delivered |
| Finalize stock | Orders whose recommended next action is Finalize stock; excludes missing-invoice and other known prerequisites |
| Stock checks | Any order with unchecked original reports, including closed orders |

These shortcuts can overlap; their counts are not a sum of distinct orders.
Every shortcut counts orders. Inside a row, the help count is affected products
and the stock count is unchecked reports; use labels that distinguish these.
The definitions must match the displayed progress/action cases, not use
"has no invoice" as a substitute for readiness.

Keep broad No invoice and Payment due filters under Billing. No invoice is not
customer debt; Payment due means an actual issued invoice with a known positive
balance that has not been marked Paid. Zero-balance and cancelled invoices do
not belong in it. Payment due does not mean overdue; only use an overdue label
when the due date actually establishes that.
Keep Billing and Status visible beside Search, wrapping on small screens. Put
Per page beside the grouped Previous / Page N of M / Next pagination control.
Reset filters clears the search, queue, billing and status while preserving the
selected page size. Keep newest-first sorting and pagination. Shared admin
pagination uses 44px controls and blue focus states across the admin lists.
Orders also repeats pagination below nonempty results when there are multiple
pages. Both controls share the same page/filter state; changing the page returns
focus and scroll position to the Orders heading.

Search, billing selection and shortcuts combine intentionally. Show a visible
active shortcut/filter state and a clear reset. Changing filters resets page 1.
Keep existing filter/bookmark URLs working; retain their original semantics
rather than silently reinterpreting old work parameters as stricter new queues.

Shortcut counts are global totals, unaffected by search/billing filters. The
near-table result count reflects the current filter combination; label these
scopes clearly. Compute each count and its corresponding filtered list from the
same server definition.

Make the API extension additive: retain existing response fields and work-filter
keys, add Needs admin / Preparation / To invoice / To deliver / Finalize stock
as distinct new keys (needsAdmin, preparation, toInvoice, toDeliver, toFinalize),
and reuse the
existing needsStockCheck definition. Add an all-orders total to the summary for
the All shortcut; a filtered page total cannot serve as that global count.
Add the small helpRequestedItems field to admin-list rows, following its existing
meaning in the packing API. Frontend parameter allowlists and URL parsing must
accept the new keys. Do not repurpose the older readyToDeliver or noInvoice
parameters to have stricter meanings for existing bookmarks.

Add a distinct paymentStatus=paymentDue filter for the visible Billing choice,
so it can combine with any work shortcut. Do not map it to notFullyPaid: the
existing notFullyPaid implementation deliberately also includes orders without
invoices. Keep old paymentStatus/work filter meanings for bookmarks; identify a
restored legacy filter accurately rather than labelling it as the new strict
Payment due or Finalize stock shortcut.

Carry search, shortcut, billing/status selection, page and page size into order
and packing destinations, and restore them on Back to orders. Use explicitly
allowed list parameters/relative paths, not arbitrary return URLs.

## 7. Loading, refreshing and interaction

- Use one accessible More menu component shared by rows and cards.
- Keyboard open/navigation, Escape, outside-click dismissal, focus restoration,
  touch targets and screen-edge placement must work. The table wrapper must not
  clip the menu. Open an existing dialog only after closing its menu.
- Disable the relevant action while its existing mutation is saving; keep the
  duplicate-Invoice fix and existing submission guards.
- Reuse query invalidation after confirmed saves. Keep list and global summary
  refresh/focus behavior aligned so another worker's progress updates both.
- Preserve previous rows during a same-view background refresh with an Updating
  indication. On a filter/search change, use data for the new query or show its
  loading state; never present the old queue's rows as results of the new queue.
- Do not reset open invoice/payment/assignment drafts during background refresh.
  A conflicting save uses the existing rejection/reload behavior.
- After an action removes the last row on a page, return to a valid page while
  keeping the active filters. Do not show a false empty result on an invalid page.
- Distinguish initial loading, a genuinely empty queue, no search matches and a
  failed refresh. Retain last successful data with a retry message when possible;
  do not show zero counts or "nothing to see" because an API call failed.
- Stock-check follow-up stays discoverable after all ordinary fulfillment work
  has completed.

## 8. Implementation sequence

Implement as one cohesive release with reviewable steps:

1. Lock the state/action/filter cases and add the narrow backend read support.
   Verify Needs admin, list/count agreement and privacy against isolated data.
2. Extend the existing action/presentation helpers. Add a small shared list
   rendering component for table/cards and one More menu component. Keep network,
   mutation and dialog orchestration in AdminOrdersPage.
3. Replace duplicate badge/action markup, wire every visible/menu action to the
   existing path, and preserve filters/return navigation.
4. Validate complete interactions on the compiled UI with intercepted APIs and
   a real-login flow against an explicitly named disposable localhost database.
   Never seed sample orders or issue test mutations against configured production.

Backend touch points: orderController list/work-summary reads, the existing
packing-help/stock-report helpers and targeted regression tests. Frontend touch
points: AdminOrdersPage, adminOrderActions/adminOrderWorkflow as needed,
ordersApiSlice filter support, the replacement for list-only
PackingProgressBadge, and narrow return-navigation/copy corrections.
Keep changes out of inventory writes, invoice/payment calculations and the worker
screen unless a specific discovered defect makes a correction necessary.

The real website uses its established styles; the preview's density/date tuning
controls and light/dark mockup infrastructure are not application requirements.

## 9. Acceptance checks

Use representative states, not only one ideal Packed order:

- Processing; missing/partial/full reservations; unpublished reserved orders.
- Live picking, a worker-managed shortage, explicit admin help, resolved help,
  multiple affected products, and unchecked stock reports.
- Packed without invoice; invoiced unpaid/partly paid/paid; both task modes.
- Invoiced manual orders; manual delivery before invoice where already allowed.
- Delivered missing invoice, awaiting stock finalization and fully finalized.
- Cancelled orders with stock reports; missing customer/worker/balance data;
  cancelled invoice and stale state rejected by existing backend guards.
- Zero-value/zero-balance invoices, old notFullyPaid bookmarks versus the new
  Payment due filter, and a missing invoice preventing the Finalize stock shortcut.

For every action verify its destination/handler, not merely its label:
open and submit invoice/payment/assignment/delivery/finalization dialogs as
appropriate, inspect PDF/copy behavior, and exercise safe deletion with returns.
Verify one invoice action, no duplicate mutation on rapid clicks, correct counts
and queue membership after saves, and no requirement to be paid before delivery.

Check multiple pages, filter combinations, old bookmarked URLs, Back navigation,
another device's updates, empty/error states, menu keyboard/touch operation,
long names/references, 320px/390px/tablet/desktop layouts and frontend lint/build.
Include the full Orders -> packing -> item editor -> packing/order -> Orders
return path so list context survives actual shortage resolution.
Existing worker, item-editing, delivery/copy and billing/stock regressions must
remain green.

After implementation, review the real-data desktop/mobile screens locally.
Deploy the compatible backend read support before the frontend. Retain manual
deployment and begin normal use with a small supervised set of actual orders.

## 10. Double-check outcome

The second pass checked the plan against order-list filters, current action
helpers, active-help resolution, invoice creation/payment data, worker publication,
delivery, stock-finalization guards and return navigation. It corrected:

1. The missing Finalize stock shortcut; Stock checks serves a different purpose.
2. The old notFullyPaid filter including uninvoiced orders; add a separate strict
   Payment due filter without changing old links.
3. Zero-balance not automatically proving Paid, including zero-value invoices.
4. Missing status/finalization qualifications and explicit precedence in the
   action table.
5. Order counts versus product/report counts, and old rows displayed under a
   newly selected filter.

That checkpoint was a plan review. Only this document changed during that
double-check; the existing local Invoice fix and its tests were preserved.


## Local implementation result

The five-column table/mobile cards, shared actions, accessible More menu, billing
placement, seven shortcuts, strict Payment due filter and preserved list context
are implemented. Existing mutation dialogs and server business guards are reused.
Admin-only read facts/shortcut counts share one aggregation; old query meanings
remain available. No new schema, dependency or stock/financial write flow was added.

Verification passed: admin-list integration covering 21 order states and pagination;
44 packing/browser tests including new list interactions; 17 delivery/copy browser
checks; worker packing integration; billing/stock integration; and real-login
worker, item-editing, shortage, partial payment, delivery and finalization flows.
Frontend lint/build and diff checks passed. Automated writes used named disposable
localhost databases or intercepted APIs. The existing large-bundle build advisory
remains. Final local screenshots are in the workspace output directory.
