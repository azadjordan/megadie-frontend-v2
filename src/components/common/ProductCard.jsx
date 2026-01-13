// src/components/common/ProductCard.jsx
import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { FaShoppingCart, FaCheck, FaPlus } from 'react-icons/fa'
import { addToCart } from '../../features/cart/cartSlice'
import QuantityControl from './QuantityControl'

const FALLBACK_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#f1f5f9"/><text x="50%" y="50%" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20" font-weight="600" text-anchor="middle" dominant-baseline="middle">No image</text></svg>',
)}`

export default function ProductCard({ product }) {
  const dispatch = useDispatch()
  const image =
    product?.images?.find((src) => typeof src === 'string' && src.trim()) ||
    (typeof product?.imageUrl === 'string' && product.imageUrl.trim()
      ? product.imageUrl
      : FALLBACK_IMAGE)
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
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Image */}
      {detailsPath ? (
        <Link
          to={detailsPath}
          state={{ fromShop: true }}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
          aria-label={`View details for ${name}`}
        >
          <div className="h-40 w-full overflow-hidden bg-slate-50">
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = FALLBACK_IMAGE
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
              e.currentTarget.src = FALLBACK_IMAGE
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-3">
        <h2 className="line-clamp-3 text-sm font-semibold text-slate-900">
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
              className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200/70"
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
