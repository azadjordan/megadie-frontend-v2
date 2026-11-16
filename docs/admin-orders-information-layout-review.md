# Admin Orders: full UI implementation plan

Date: 16 November 2026. Status: implementation complete and verified; deployment is manual.
This revision supersedes the earlier master-state proposal and its previews.
The website now follows this plan; the older standalone previews remain illustrative.
The earlier page-refresh document records the changes already made locally.

## 1. Design decision and scope

Each order explains who it belongs to, its preparation and delivery progress,
its financial position, its stock responsibilities, and the next useful action.
Preparation, delivery, billing and stock have independent colors. Rows have no
master badge, overall completion color, colored status edge, or manually maintained
summary status. A Delivered badge describes delivery only.

Use the existing admin shell, typography, work queues, filters, pagination,
workflow rules and dialogs. Reorganize the list and cards, not the business process.
Do not add dashboard metrics, inline editing, bulk actions, new roles, collections,
payment terms, or a new UI dependency in this change.

## 2. Page hierarchy

Keep this order from top to bottom:

1. **Orders** heading with one short description of the four responsibilities.
2. Existing work shortcuts with global counts: All orders, Worker help,
   Preparation, To invoice, To deliver, Finalize stock, Stock checks.
3. Search, Billing filter and Order stage filter together in a wrapping toolbar.
   Reset filters appears while any filter/shortcut is active.
4. Matching-results count, Per page control and top pagination.
5. Desktop table or mobile cards.
6. Matching bottom pagination at the end of the results.

Rename the visible Needs admin shortcut to **Worker help**; retain the `needsAdmin`
query key and its explicit worker-help meaning. Keep the count-scope explanation
small: counts cover all orders and shortcuts can overlap. Stock checks continues
to include relevant delivered/cancelled orders. A zero count stays visible.

Search remains client/email/order search. Filters stay visible rather than inside
another dropdown. Call the lifecycle filter **Order stage**, with human labels
for the existing Processing/Shipping/Delivered/Cancelled values; do not change URL
or server meanings. Keep the existing billing options, page sizes and sorting.
Do not add an overall-state or overdue filter in this scope.

Keep filtering/pagination on the server, URL-backed filter state, existing search
debouncing, return-to-list context and refresh behavior. Reset returns to page 1
and preserves the selected page size. Both pagers use the same page state and
accessible styling; a one-page result has disabled previous/next controls.

## 3. Desktop: five cells with stable content

| Cell | Visible hierarchy |
| --- | --- |
| **Order / client** | Linked client name; full order reference and date/time in secondary text; X items · Y units |
| **Preparation & delivery** | Preparation label + badge + relevant short worker/progress explanation; Delivery label + badge below it |
| **Billing** | Payment/invoice-state badge; one primary amount (Due when outstanding, Total otherwise); original total only when informative; invoice/PDF link; contextual payment link when useful |
| **Stock** | Deduction-state badge; a separate report/check line with a review link when needed |
| **Next action** | One recommended button and a visible More ⋯ control |

Move item/unit counts into Order / client, and move the former Total column into
Billing. Give Stock a dedicated cell. Remove the mixed Progress summary and its
whole-order Complete/Needs attention presentation.

### Order / client

- Use the order customer's name, not the delivery recipient's name. Make the name
  the obvious link to order details. Keep the reference readable/selectable as
  secondary text instead of adding a second equally prominent navigation link.
- Keep date/time secondary. Preserve full names and references through wrapping;
  do not use ellipsis to hide the only available identifier.
- Reuse existing order-size calculations: items = distinct products; units = sum
  of ordered quantities in their selling units. This is not a carton conversion.
- Client email, products, addresses, notes, slots and history remain in details.

### Preparation & delivery

- Use two labeled parts in fixed positions rather than one combined status.
- Show worker name and a single short context line only when useful. A picking
  bar appears only for an active published task with known product counts; its
  text explicitly counts products fully picked. Unknown progress is not 0%.
- Put a worker-help reason beside Preparation. Distinguish an explicit request
  for admin help from a shortage the worker is handling through the existing flow.
- Recorded Packed confirmation is required for Packed. Reservation or 100% picked
  does not create that confirmation. For manual delivery, use Done with a Manual
  note rather than inventing a worker Packed event or introducing another checkbox.

### Billing

- Show the financial state before the invoice link so all rows scan consistently.
- Show a known positive outstanding amount as the primary money line, labeled
  Due. Add the original Total as secondary text only when it differs and explains
  the financial position, such as a partial payment. A fully unpaid invoice whose
  total equals its balance shows one Due amount, not two identical amounts.
- With no outstanding balance or no invoice, show Total as the primary amount.
  If the balance is unavailable, show the known Total alongside that warning;
  never infer a zero balance or amount due. Reuse existing money helpers and
  actual currencies; only treat amounts as duplicates when their currency and
  monetary values match.
- Keep the invoice reference/PDF access as a small, clearly clickable text control.
  It invokes the existing PDF behavior; it does not create another invoice.
- Show a due date for overdue billing and when helpful for an outstanding balance.
  Use existing invoice due-date semantics; do not introduce a different deadline,
  grace period or timezone rule through this redesign.
- Keep Record payment here when another primary action is recommended. Remove
  that contextual copy when Record payment is already the row's main button.

### Stock

- The deduction badge reports **deduction only**. It can be green while an amber
  report link remains underneath: Deducted + 2 reports need checking.
- When the report count is known to be zero, omit the report line. Show an amber
  report link for a positive count. Missing report facts say Check status
  unavailable; an unknown count must not be treated as zero.
- Cancellation may make a new deduction unnecessary; it does not erase an actual
  deduction, unchecked report, linked invoice or outstanding financial record.
- Keep report review and finalization distinct. Replacing a slot, changing an item
  or deducting stock does not silently mark its original report checked.

## 4. Colors and exact vocabulary

Use the existing slate/blue/emerald/amber/rose palette consistently. Each badge has
a soft fill, a readable colored label and one small supporting icon. Color never
replaces wording. Use these meanings throughout the page:

| Color | Meaning |
| --- | --- |
| Blue | Active work or readiness for the next step |
| Green | The named responsibility has been confirmed finished |
| Amber | Normal follow-up, a stock check, or required information needing verification |
| Red | An explicit blocker, confirmed inconsistency, or verified overdue balance |
| Gray | Future step, inactive state, cancellation or not applicable |

| Part | Labels and colors |
| --- | --- |
| Preparation | Not started (gray); Needs reservation (amber, with Partly reserved when applicable); Reserved / Packing (blue); Packed (green); Done + Manual (green); Needs help (red for explicit worker help) |
| Delivery | Pending (gray while preparation is pending); Awaiting delivery (blue when ready under the existing workflow); Delivered (green); Cancelled (gray) |
| Billing | Not invoiced (gray before invoicing is the next step, amber when it is); Unpaid / Partly paid (amber); Paid / No balance due (green); Overdue (red); Invoice cancelled (gray on a cancelled order) |
| Stock deduction | Pending (gray before prerequisites, amber when eligible; After delivery/After invoice only when useful); Deducted (green); Not required (gray only where genuinely inapplicable) |
| Stock reports | N reports need checking (amber link); Check status unavailable (amber); omit the line for a known zero count |

Use Needs review with a specific explanation for exceptions: red for a known
contradiction, amber for required facts that are unavailable. Examples include a
missing linked invoice, Paid with a positive balance, a cancelled invoice on an
active order, or a delivered published task without Packed confirmation. Put the
explanation in the affected part and route review to its existing screen.

Missing optional worker details or an absent due date do not create a red alarm.
Overdue requires a known, positive, collectible balance and a valid due date under
the existing billing rules. A normal unpaid balance remains amber. An issued zero-
value/zero-balance invoice says No balance due when it is not actually recorded as
Paid. Missing financial data never becomes a zero balance or a successful state.

## 5. Buttons, links and icons

| Element | Appearance and behavior |
| --- | --- |
| Main action | Filled blue button, white text, clear verb label, about 44px minimum height. Review issue also uses blue; its related problem badge carries the red warning. |
| More ⋯ | Neutral outlined button with the word More always visible, including wide screens. One flat menu, not nested menus. |
| Invoice/payment/report controls | Blue underlined text for normal links/actions. A report-check link can use amber to match its warning, with underline and an action label to distinguish it from a badge. |
| Destructive action | Delete order in red at the bottom of More, separated by a divider; keep the existing preview/physical-return safeguards. |
| Status badge | Static display, visually distinct from a button, without a click cursor or interactive hover treatment. |

- Reuse the current Feather icons from `react-icons/fi`; no second icon library.
  Use consistent 16px icons, with smaller secondary icons only where necessary.
  Package/reservation, truck, payment/document, archive/check and warning icons
  should have stable meanings. Avoid a decorative icon on every piece of metadata.
- Give every primary/menu action and contextual action control a matching icon,
  using one shared action-to-icon mapping. Keep button text visible. Keep
  icon-only controls limited to familiar existing dialog controls with accessible
  names. Use an external-link arrow only when the action really opens a new tab.
- Links navigate; buttons perform an action or open a dialog. Each clickable label
  must describe its actual behavior. Do not make the whole row clickable.
- Apply the same radius, button height, gaps and focus treatment to all controls.
  Hover is subtle; keyboard focus is clearly visible. Touch targets are about
  44px and do not overlap. Tooltips supplement rather than contain essential text.
- Show Working…/existing loading feedback and disable repeat submission while an
  operation runs. Preserve error messages and the user's existing dialog input.
- More retains keyboard navigation, Escape, outside dismissal, focus restoration
  and viewport-aware positioning above clipped/scrolling table containers.

## 6. Primary action and secondary-action placement

Use the same hierarchy at every screen size; a larger screen does not expose every
button. Show the primary action first, followed by More. Let whole controls wrap
if necessary rather than clipping their labels or reducing text size.

Choose one recommendation from existing facts and permitted actions:

1. A real blocker or confirmed inconsistency leads to Review issue or the existing
   relevant order-review screen, including on an otherwise delivered order.
2. Otherwise retain the server's existing operational recommendation: Start
   preparation, Reserve stock, Send to worker, View packing, Create invoice,
   Mark delivered or Finalize stock.
3. When ordinary operational work is finished, suggest Review stock reports if
   reports remain, then Record payment for a known payable balance.
4. When no applicable work remains, use quiet Open order and More access. Cancelled
   orders retain their allowed review routes without restarting fulfillment.

Unresolved required facts lead to an appropriate review action, not an assumption
that the order is finished. Keep report counts linked in Stock even when report
review is the primary action; deduplication targets repeated buttons/menu entries.

Payment remains accessible in Billing while another step is recommended. An
overdue badge does not block or replace an otherwise permitted delivery/finalization
operation. Recording payment still records money actually received.

More retains currently permitted actions: order details, worker assignment,
packing/history, delivery/courier details, copy order summary, manual packing
message and existing operational alternatives, followed by deletion. Apply the
current conditions to each; do not make every item permanently available. Remove
the primary action and its equivalent aliases from More so invoicing/assignment
do not appear twice. Keep invoice PDF and stock-report access in their home cells.

Badge colors never grant permission or execute work. Keep fresh server validation,
the existing dialogs, invoice guards, physical-return confirmations and supported
manual workflow. Payment/report review do not become new finalization gates.

## 7. Spacing, typography and responsive behavior

- Keep the current admin font and shell. Use roughly 14px body text, 14–16px
  semibold client names, 13px badge/button labels and at least 12px secondary text.
  Keep monetary values aligned and tabular; keep currency visible.
- Top-align cell content. Use approximately 16px vertical row padding, subtle
  horizontal separators, and alternating white/light-gray desktop rows. Use a
  quiet row hover/focus-within highlight, not a status-colored fill or left edge.
- Keep small, consistent gaps between a badge and its explanation. Do not nest
  cards around individual desktop cells or add another summary strip per order.
- Give identity, preparation/delivery and billing enough width for real content;
  reserve usable space for the primary button and More. Stock is the compact
  column. Row height follows content, including legitimate warnings and long names.
- Use a table only where the five cells fit with the actual sidebar width. The
  existing 1280px breakpoint is a starting point; verify real usable width and use
  cards sooner if needed. Do not force a compressed table onto tablets.
- Mobile/tablet cards: identity at the top; Preparation, Delivery, Billing and
  Stock in a labeled two-column arrangement; primary action and More in a footer.
  Use white cards, neutral borders and spacing, without an overall status edge.
  Allow text to wrap, or stack parts when needed, while retaining all four parts.
- Search uses the full phone width; filters wrap beneath it. Work shortcuts wrap
  without hiding their counts. Pagers remain usable at 320px. Avoid page-level
  horizontal scrolling, hover-only controls and essential information in accordions.

## 8. Loading, empty, error and refresh states

- Keep the existing initial loading treatment until results are known. Do not
  briefly display an empty list or successful green badges while data is loading.
- Distinguish No orders yet, No orders match these filters, and an empty work
  shortcut. Keep filters/shortcuts visible so the admin can recover; offer Reset
  filters where applicable.
- A failed refresh retains the last successful results with a visible retry notice.
  Unknown counts use an unavailable marker, never a fabricated zero. Keep shortcut
  refresh errors separate from order-result errors and retain access checks.
- Preserve list/filter context when opening details and returning. Background
  refresh must not steal typing focus, reset the page, or discard dialog input.

## 9. Implementation boundaries and order

Existing list data already includes reservation/packing fields, actual invoice
money and dueDate, stock-finalization facts, report counts, listReviewReason and
server listAction. The existing `isInvoiceOverdue` helper supplies billing policy.
No backend or schema change is currently needed for this UI plan.

1. Update `adminOrderActions.js` to expose separate preparation/delivery/stock
   presentation facts alongside billing, retaining the existing financial and
   workflow helpers. Reuse one derivation for desktop and mobile. Retire the old
   mixed progress presentation and add report/payment primary-action fallbacks;
   do not build a second workflow engine or duplicate server queue calculations.
2. Update `AdminOrderList.jsx` into the five-cell table and four-part cards. Reuse
   small presentational functions for badges, identity, money, parts and actions.
3. Update `AdminOrderMoreMenu.jsx` only for consistent visible More styling and
   action deduplication; retain its existing positioning and keyboard behavior.
4. Make focused label/layout changes in `AdminOrdersPage.jsx`, preserving handlers,
   URL state, polling, accurate shortcut counts and top/bottom pagination. Reuse
   `AdminPagination`; leave other admin pages and shared navigation unchanged.
5. Update meaningful presentation/action regression coverage and check the actual
   table/cards with isolated sample responses. Run the production build and
   targeted existing checks. Local verification is recorded below.

## 10. Acceptance checks

| Situation | Required UI and action behavior |
| --- | --- |
| New / partially reserved order | Honest preparation state and context; existing preparation/reservation action; no invented Packed state |
| Active worker picking, including 100% picked | Packing until Packed is confirmed; accurate product progress; existing View packing route |
| Worker shortage and explicit help request | Preparation carries the red problem/reason; Review issue; keep independent stock report access |
| Packed but not delivered | Packed green; Delivery pending/awaiting delivery; actual billing/stock values; existing Create invoice/Mark delivered recommendation |
| Delivered, stock pending | Delivered green; Stock Pending (amber when eligible); existing finalization action; payment remains independent |
| Packed, delivered and deducted, ordinary unpaid balance | Three finished parts green; Unpaid amber with actual due amount; exactly one main Record payment button |
| Same order, verified overdue balance | Billing alone turns red and shows due date; fulfillment/stock remain truthful; no overall order color |
| Deducted with unchecked reports | Green Deducted plus a distinct amber report link; remaining review is discoverable |
| Everything settled | Each applicable part shows its own confirmed result; quiet Open order/More; no master Complete badge |
| Zero balance / missing balance / inconsistent Paid status | No balance due / Balance unavailable / Needs review respectively; no false Paid or payment collection action |
| Money summary | Full unpaid balance: one Due amount; partial payment: Due plus the different Total; paid or uninvoiced: Total; unknown balance: known Total plus warning, without an inferred Due |
| Manual delivery / cancelled order with reports | Preserve manual facts and cancellation context; no invented worker events, lost reports or retired financial obligations |
| Wide, narrow, 390px and 320px layouts | Readable content, full action labels, no duplicate actions, usable links/menu/focus and no page overflow |

Also check long client names/references, large totals, partial payments, empty
queues, refresh failure, keyboard-only use, return-to-list state, both pagers and
the prior duplicate-Invoice regression. Use mocked/isolated data for mutations;
do not create test orders, payments or stock changes in the configured production DB.

## Local verification — 16 November 2026

- Implemented the five-cell table, neutral mobile cards, independent part colors,
  deduction/report separation, compact money summary and one primary action.
- Kept visible More labels, existing dialogs and fresh server safeguards, URL
  context, work-queue meanings and synchronized pagination at both ends.
- Passed 17 state/action tests and 65 browser checks across packing, admin
  navigation and order delivery, including the previous duplicate-Invoice and
  physical-return deletion regressions.
- Browser checks exercise actual desktop/mobile components at 1280px, 390px and
  320px, the promoted payment button, partial-payment amounts and overflow.
- Production build, targeted ESLint and whitespace checks pass. Browser APIs are
  intercepted; no production records were created or changed for verification.
- No backend application, schema or database migration changes were made for
  this UI revision. Single-page pagination is opt-in on Orders; other shared
  pagination consumers retain their existing behavior.
