import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { clearCart, setCartItemQuantity } from '../../features/cart/cartSlice'

export default function CartPage() {
  const dispatch = useDispatch()
  const items = useSelector((state) => state.cart.items)

  if (!items.length) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-slate-600">Add some products from the shop.</p>
        <Link
          to="/shop"
          className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
        >
          Go to Shop
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Cart</h1>
        <button
          type="button"
          onClick={() => dispatch(clearCart())}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Clear cart
        </button>
      </div>

      <div className="rounded-xl border bg-white">
        {items.map(({ productId, product, quantity }) => {
          const image = product?.images?.[0] || '/placeholder.jpg'
          const tags = [
            product?.packingUnit,
            product?.grade,
            product?.catalogCode ? `Code ${product.catalogCode}` : null,
          ].filter(Boolean)

          return (
            <div key={productId} className="flex gap-4 border-b p-4 last:border-b-0">
              <img
                src={image}
                alt={product?.name || 'Product'}
                className="h-16 w-16 rounded-lg bg-slate-100 object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = '/placeholder.jpg'
                }}
              />

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {product?.name || 'Unnamed Product'}
                    </p>

                    {tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs text-slate-600">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      dispatch(
                        setCartItemQuantity({
                          productId,
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        }),
                      )
                    }
                    className="w-24 rounded-lg border px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
