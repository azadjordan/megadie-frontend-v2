// src/pages/Public/CartPage.jsx
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

import {
  clearCart,
  removeFromCart,
  setCartItemQuantity,
} from "../../features/cart/cartSlice";
import QuantityControl from "../../components/common/QuantityControl";
import { useCreateQuoteMutation } from "../../features/quotes/quotesApiSlice";
import { useGetProductsAvailabilityQuery } from "../../features/products/productsApiSlice";
import {
  PRODUCT_AVAILABILITY_STATUS,
  resolveProductAvailability,
} from "../../utils/productAvailability";

const placeholder = "/placeholder.jpg";

const resolveProduct = (raw) => {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.name || raw.size || raw.packingUnit || raw.variant) return raw;
  const firstNested = Object.values(raw).find(
    (value) =>
      value &&
      typeof value === "object" &&
      (value.name || value.size || value.packingUnit || value.variant)
  );
  return firstNested || raw;
};

const availabilityClassByStatus = {
  [PRODUCT_AVAILABILITY_STATUS.CHECKING]:
    "bg-white text-slate-600 ring-slate-200",
  [PRODUCT_AVAILABILITY_STATUS.AVAILABLE]:
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [PRODUCT_AVAILABILITY_STATUS.PARTIAL]:
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [PRODUCT_AVAILABILITY_STATUS.MAYBE]:
    "bg-slate-50 text-slate-700 ring-slate-200",
  [PRODUCT_AVAILABILITY_STATUS.UNAVAILABLE]:
    "bg-rose-50 text-rose-700 ring-rose-200",
};

const getAvailabilityLabel = (availability) => {
  if (availability.status === PRODUCT_AVAILABILITY_STATUS.AVAILABLE) {
    return `Available: ${availability.availableNow}`;
  }
  if (availability.status === PRODUCT_AVAILABILITY_STATUS.PARTIAL) {
    return `Available: ${availability.availableNow}`;
  }
  return availability.summary;
};

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const items = useSelector((state) => state.cart.items || []);
  const { userInfo, isInitialized } = useSelector((state) => state.auth);

  const [note, setNote] = useState("");
  const [createQuote, { isLoading: isSubmitting }] = useCreateQuoteMutation();

  const productIds = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item?.productId).filter(Boolean))
      ),
    [items]
  );

  const { data: availabilityRows = [] } = useGetProductsAvailabilityQuery(
    productIds,
    { skip: productIds.length === 0 }
  );

  const availabilityByProductId = useMemo(
    () =>
      new Map(
        availabilityRows.map((row) => [String(row.productId), row])
      ),
    [availabilityRows]
  );

  const summary = useMemo(() => {
    const lines = items.length;
    const units = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    return { lines, units };
  }, [items]);

  const typeSummary = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const type = item?.product?.productType || "Other";
      const qty = Number(item?.quantity) || 0;
      if (qty <= 0) return;
      map.set(type, (map.get(type) || 0) + qty);
    });
    return Array.from(map.entries());
  }, [items]);

  const setQty = (productId, val) => {
    const num = typeof val === "number" ? val : parseInt(val, 10);
    if (!Number.isFinite(num)) return;
    dispatch(setCartItemQuantity({ productId, quantity: num }));
  };

  const submit = async () => {
    if (!isInitialized || isSubmitting) return;

    if (!userInfo) {
      return navigate("/login", { state: { from: location }, replace: true });
    }

    if (items.length === 0) return;

    const requestedItems = items
      .filter((i) => i?.productId && Number(i?.quantity) > 0)
      .map((i) => ({
        product: i.productId,
        qty: Number(i.quantity),
      }));

    if (requestedItems.length === 0) return;

    const request = createQuote({
      requestedItems,
      clientToAdminNote: note?.trim() ? note.trim() : undefined,
    });

    const timeoutMs = 20000;
    let timeoutId;
    if (typeof request?.abort === "function") {
      timeoutId = setTimeout(() => request.abort(), timeoutMs);
    }

    try {
      const result = await request.unwrap();
      const quoteId = result?.data?._id || result?.data?.id;
      dispatch(clearCart());
      setNote("");
      navigate(
        quoteId
          ? `/account/requests?quote=${encodeURIComponent(quoteId)}`
          : "/account/requests",
        { replace: true }
      );
    } catch (err) {
      const isTimeout =
        err?.name === "AbortError" || err?.error?.name === "AbortError";
      toast.error(
        isTimeout
          ? "Request timed out. Please try again."
          : err?.data?.message || err?.error || "Failed to submit request"
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-0 py-8 sm:px-4 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <FaShoppingCart size={18} />
            Cart
          </div>
          <div className="text-sm text-slate-600">
            {summary.lines} item{summary.lines !== 1 && "s"}, {summary.units}{" "}
            unit{summary.units !== 1 && "s"}
          </div>
        </div>
        <Link
          to="/shop"
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FaArrowLeft size={12} />
          Back to shop
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
            <FaShoppingCart className="text-slate-600" size={18} />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-900">
            Your cart is empty
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Add a few items to continue.
          </p>

          <Link
            to="/shop"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-slate-900">Items</div>
                <div className="text-xs text-slate-500">
                  {summary.lines} items • {summary.units} units
                </div>
              </div>
              <div className="mt-4 space-y-4 lg:max-h-[calc(100vh-320px)] lg:overflow-y-auto lg:pr-2">
                {items.map(({ productId, product, quantity }) => {
                  const item = resolveProduct(product);
                  const availabilityRow = availabilityByProductId.get(
                    String(productId)
                  );
                  const itemForAvailability = availabilityRow
                    ? {
                        ...item,
                        isAvailable: availabilityRow.isAvailable,
                        availability: availabilityRow.availability,
                      }
                    : item;
                  const availability = resolveProductAvailability(
                    itemForAvailability,
                    quantity
                  );
                  const availabilityLabel = getAvailabilityLabel(availability);
                  const availabilityClass =
                    availabilityClassByStatus[availability.status];
                  const showAvailabilityBadge =
                    availability.status !== PRODUCT_AVAILABILITY_STATUS.CHECKING;
                  const showSourcingBadge =
                    availability.status === PRODUCT_AVAILABILITY_STATUS.PARTIAL &&
                    availability.shortageQty > 0;
                  const showZeroStockBadge =
                    availability.status === PRODUCT_AVAILABILITY_STATUS.MAYBE &&
                    availability.availableNow === 0;
                  const availabilityBadge = showAvailabilityBadge ? (
                    <div className="flex max-w-full shrink-0 flex-col items-start gap-1 lg:items-end">
                      {showZeroStockBadge ? (
                        <span className="inline-flex max-w-full items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-none text-amber-800 ring-1 ring-amber-200">
                          <span className="truncate">Current stock: 0</span>
                        </span>
                      ) : null}
                      <span
                        className={[
                          "inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-semibold leading-none ring-1",
                          availabilityClass,
                        ].join(" ")}
                      >
                        <span className="truncate">{availabilityLabel}</span>
                      </span>
                      {showSourcingBadge ? (
                        <span className="inline-flex max-w-full items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-none text-amber-800 ring-1 ring-amber-200">
                          <span className="truncate">
                            We'll try to find {availability.requestedQty}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  ) : null;
                  const image =
                    item?.images?.[0] || item?.imageUrl || placeholder;
                  const name = item?.name || "Untitled product";
                  const tags = Array.from(
                    new Set(
                      [
                        item?.size,
                        item?.packingUnit,
                        item?.variant,
                        item?.grade,
                        item?.catalogCode
                          ? `Code ${item.catalogCode}`
                          : null,
                      ].filter(Boolean)
                    )
                  );

                  return (
                    <div
                      key={productId}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      {/* Mobile layout */}
                      <div className="min-w-0 lg:hidden">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-base font-semibold text-slate-900 sm:text-sm">
                              {name}
                            </p>
                            {tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
                                {tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200/70"
                                    title={tag}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => dispatch(removeFromCart(productId))}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:hidden"
                            aria-label="Remove item"
                            title="Remove item"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>

                        <div className="mt-4 sm:mt-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={image}
                              alt={name}
                              className="h-16 w-16 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-slate-200"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = placeholder;
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Quantity
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    dispatch(removeFromCart(productId))
                                  }
                                  className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:inline-flex"
                                  aria-label="Remove item"
                                  title="Remove item"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                              <div className="mt-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <QuantityControl
                                    quantity={quantity}
                                    setQuantity={(val) => setQty(productId, val)}
                                    min={1}
                                    size="sm"
                                    variant="shop"
                                    className="w-full max-w-[140px]"
                                  />
                                  {availabilityBadge}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden min-w-0 lg:grid lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:items-start lg:gap-4">
                        <button
                          type="button"
                          onClick={() => dispatch(removeFromCart(productId))}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 self-center"
                          aria-label="Remove item"
                          title="Remove item"
                        >
                          <FiTrash2 size={18} />
                        </button>
                        <img
                          src={image}
                          alt={name}
                          className="h-20 w-20 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-slate-200"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = placeholder;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-900">
                            {name}
                          </p>
                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200/70"
                                  title={tag}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 self-center">
                          <QuantityControl
                            quantity={quantity}
                            setQuantity={(val) => setQty(productId, val)}
                            min={1}
                            size="sm"
                            variant="shop"
                            className="w-full max-w-[140px]"
                          />
                          {availabilityBadge}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-sm font-semibold text-slate-900">
                Note (optional)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any special request or details for your quote."
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-[calc(var(--app-header-h,0px)+1.5rem)]">
              <div className="text-base font-semibold text-slate-900">
                Summary
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {typeSummary.map(([type, qty]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{type}</span>
                    <span className="font-semibold text-slate-900">
                      x {qty}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !isInitialized}
                className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit request"}
              </button>

              <button
                type="button"
                onClick={() => dispatch(clearCart())}
                disabled={isSubmitting}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Clear cart
              </button>
            </div>
          </aside>
        </div>
      )}

    </div>
  );
}
