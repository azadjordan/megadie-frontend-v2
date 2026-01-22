// src/pages/Public/CartPage.jsx
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaShoppingCart, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

import {
  clearCart,
  removeFromCart,
  setCartItemQuantity,
} from "../../features/cart/cartSlice";
import QuantityControl from "../../components/common/QuantityControl";
import { useCreateQuoteMutation } from "../../features/quotes/quotesApiSlice";

const placeholder = "/placeholder.jpg";

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const items = useSelector((state) => state.cart.items || []);
  const { userInfo, isInitialized } = useSelector((state) => state.auth);

  const [note, setNote] = useState("");
  const [createQuote, { isLoading: isSubmitting }] = useCreateQuoteMutation();

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
    if (!isInitialized) return;

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

    try {
      await createQuote({
        requestedItems,
        clientToAdminNote: note?.trim() ? note.trim() : undefined,
      }).unwrap();

      dispatch(clearCart());
      setNote("");
      navigate("/account/requests", { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Failed to submit request");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <FaShoppingCart size={18} />
            Cart
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {summary.lines} item{summary.lines !== 1 && "s"}, {summary.units}{" "}
            unit{summary.units !== 1 && "s"} in cart
          </div>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Items</div>
              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {items.map(({ productId, product, quantity }) => {
                  const image =
                    product?.images?.[0] || product?.imageUrl || placeholder;
                  const name = product?.name || "Untitled product";
                  const tags = [
                    product?.packingUnit,
                    product?.grade,
                    product?.catalogCode
                      ? `Code ${product.catalogCode}`
                      : null,
                  ].filter(Boolean);

                  return (
                    <div
                      key={productId}
                      className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
                    >
                      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => dispatch(removeFromCart(productId))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove item"
                          title="Remove item"
                        >
                          <FaTimes size={13} />
                        </button>
                        <img
                          src={image}
                          alt={name}
                          className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover ring-1 ring-slate-200"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = placeholder;
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                            {name}
                          </p>
                          {tags.length > 0 && (
                            <div className="mt-1 flex min-w-0 flex-nowrap gap-1 overflow-hidden text-[11px] text-slate-600">
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

                        <div className="flex items-center gap-2">
                          <QuantityControl
                            quantity={quantity}
                            setQuantity={(val) => setQty(productId, val)}
                            min={1}
                            size="sm"
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-sm font-semibold text-slate-900">
                Note (optional)
              </label>

              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any special request or details for your quote."
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-[calc(var(--app-header-h,0px)+1.5rem)]">
              <div className="text-sm font-semibold text-slate-900">
                Summary
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="space-y-2">
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
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !isInitialized}
                className="mt-5 w-full rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit request"}
              </button>

              <button
                type="button"
                onClick={() => dispatch(clearCart())}
                disabled={isSubmitting}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Clear cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
