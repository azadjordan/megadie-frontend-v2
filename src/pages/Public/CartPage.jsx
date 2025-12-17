// src/pages/Public/CartPage.jsx
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaShoppingCart } from "react-icons/fa";
import { toast } from "react-toastify";

import {
  clearCart,
  removeFromCart,
  setCartItemQuantity,
} from "../../features/cart/cartSlice";
import QuantityControl from "../../components/common/QuantityControl";

// ✅ Quotes API
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

  const setQty = (productId, val) => {
    const num = typeof val === "number" ? val : parseInt(val, 10);
    if (!Number.isFinite(num)) return;
    dispatch(setCartItemQuantity({ productId, quantity: num }));
  };

  const submit = async () => {
    // Wait for auth bootstrap before deciding
    if (!isInitialized) return;

    // Must be logged in to create a quote
    if (!userInfo) {
      return navigate("/login", { state: { from: location }, replace: true });
    }

    if (items.length === 0) return;

    const requestedItems = items
      .filter((i) => i?.productId && Number(i?.quantity) > 0)
      .map((i) => ({
        product: i.productId, // backend expects ObjectId string
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FaShoppingCart className="text-slate-900" size={18} />
            <h1 className="text-xl font-semibold text-slate-900">Cart</h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {summary.lines} item{summary.lines !== 1 && "s"} · {summary.units}{" "}
            unit
            {summary.units !== 1 && "s"}
          </p>
        </div>

        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 hover:underline"
        >
          <FaArrowLeft size={12} />
          Back to Shop
        </Link>
      </div>

      {/* Empty */}
      {items.length === 0 ? (
        <div className="mt-2 rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
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
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <>
          {/* Main panel */}
          <div className="mt-2 rounded-xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 space-y-6">
            {/* Items */}
            <div className="space-y-3">
              {items.map(({ productId, product, quantity }) => {
                const image =
                  product?.images?.[0] || product?.imageUrl || placeholder;
                const name = product?.name || "Untitled product";

                return (
                  <div
                    key={productId}
                    className="rounded-lg bg-slate-50 p-3 sm:p-4 ring-1 ring-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      {/* X */}
                      <button
                        type="button"
                        onClick={() => dispatch(removeFromCart(productId))}
                        className="inline-flex h-8 w-fit shrink-0 items-center justify-center rounded-md text-slate-500 transition
                                   hover:bg-white hover:text-slate-900
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <span className=" p-2 font-semibold leading-none text-lg sm:text-xl">
                          ×
                        </span>
                      </button>

                      {/* Image */}
                      <img
                        src={image}
                        alt={name}
                        className="h-12 w-12 shrink-0 rounded-md bg-white object-cover ring-1 ring-slate-200"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = placeholder;
                        }}
                      />

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug text-slate-900">
                          {name}
                        </p>
                      </div>

                      {/* Quantity */}
                      <QuantityControl
                        quantity={quantity}
                        setQuantity={(val) => setQty(productId, val)}
                        min={1}
                        size="sm"
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note */}
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-900">
                Note (optional)
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Add any special request or details for your quote.
              </p>

              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional…"
                className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition
                           placeholder:text-slate-400 hover:ring-slate-300
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => dispatch(clearCart())}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                disabled={isSubmitting}
              >
                <FaTrash size={12} />
                Clear Cart
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !isInitialized}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
