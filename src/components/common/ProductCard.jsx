// src/components/common/ProductCard.jsx
import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { FaShoppingCart, FaCheck, FaPlus } from 'react-icons/fa'
import { addToCart } from '../../features/cart/cartSlice'
import QuantityControl from './QuantityControl'

export default function ProductCard({ product }) {
  const dispatch = useDispatch()
  const image = product.images?.[0] || '/placeholder.jpg'
  const name = product?.name || 'Untitled product'
  const productId = product?._id || product?.id || product?.sku
  const detailsPath = productId
    ? `/shop/${encodeURIComponent(productId)}`
    : null

  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)

  const tags = useMemo(
    () =>
      [
        product.packingUnit,
        product.grade,
        product.catalogCode ? `Code ${product.catalogCode}` : null,
      ].filter(Boolean),
    [product],
  )

  const qtyNum =
    typeof quantity === 'number' ? quantity : parseInt(quantity, 10) || 1

  const handleAddToCart = () => {
    if (isAdded) return

    dispatch(addToCart({ ...product, quantity: qtyNum }))
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 900)
    setQuantity(1)
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Image */}
      {detailsPath ? (
        <Link
          to={detailsPath}
          state={{ fromShop: true }}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
          aria-label={`View details for ${name}`}
        >
          <div className="h-40 w-full overflow-hidden bg-slate-100">
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/placeholder.jpg'
              }}
            />
          </div>
        </Link>
      ) : (
        <div className="h-40 w-full overflow-hidden bg-slate-100">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/placeholder.jpg'
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-3">
        <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">
          {detailsPath ? (
            <Link
              to={detailsPath}
              state={{ fromShop: true }}
              className="transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </h2>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                title={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom controls */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QuantityControl
            quantity={quantity}
            setQuantity={setQuantity}
            min={1}
            size="sm"
          />

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdded}
            aria-label={isAdded ? 'Added to cart' : 'Add to cart'}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ring-1 ring-inset',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
              isAdded
                ? 'cursor-default bg-violet-100 text-violet-700 ring-violet-200'
                : 'bg-white text-violet-700 ring-violet-300 hover:bg-violet-600 hover:text-white hover:ring-violet-600',
            ].join(' ')}
          >
            {isAdded ? <FaCheck size={14} /> : <FaShoppingCart size={14} />}
            {!isAdded && <FaPlus size={10} />}
          </button>
        </div>
      </div>
    </article>
  )
}
