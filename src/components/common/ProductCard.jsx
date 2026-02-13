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
const OPTIMIZED_IMAGE_HINT =
  /(?:^|[\\/_-])(medium|optimized)(?:[\\/_-]|$)|[?&](?:size|variant)=medium|[?&](?:w|width|q|quality)=\d+/i
const HIGH_RES_IMAGE_HINT =
  /(?:^|[\\/_-])(original|full|large)(?:[\\/_-]|$)|@2x|@3x|[_-](?:2x|3x)/i

const normalizeImageUrl = (src) => {
  const trimmed = typeof src === 'string' ? src.trim() : ''
  if (!trimmed || trimmed.startsWith('data:')) return trimmed

  let next = trimmed
  next = next.replace(/\/(original|full|large)\//i, '/medium/')
  next = next.replace(
    /([._-])(original|full|large)(?=([._-]|\.[a-z]+$|$))/i,
    '$1medium',
  )
  next = next.replace(
    /([?&](?:size|variant)=)(original|full|large)/i,
    '$1medium',
  )
  return next
}

const pickOptimizedImage = (product) => {
  const candidates = Array.isArray(product?.images) ? product.images : []
  const cleaned = candidates
    .filter((src) => typeof src === 'string')
    .map((src) => src.trim())
    .filter(Boolean)

  const optimized = cleaned.filter((src) => OPTIMIZED_IMAGE_HINT.test(src))
  const baseList = optimized.length ? optimized : cleaned
  const fallback =
    baseList.find((src) => !HIGH_RES_IMAGE_HINT.test(src)) || baseList[0]

  const raw =
    fallback ||
    (typeof product?.imageUrl === 'string' && product.imageUrl.trim()
      ? product.imageUrl
      : FALLBACK_IMAGE)

  return normalizeImageUrl(raw)
}

const resolveProduct = (raw) => {
  if (!raw || typeof raw !== 'object') return raw
  if (raw.name || raw.size || raw.packingUnit || raw.variant) return raw
  const firstNested = Object.values(raw).find(
    (value) =>
      value &&
      typeof value === 'object' &&
      (value.name || value.size || value.packingUnit || value.variant),
  )
  return firstNested || raw
}

export default function ProductCard({ product }) {
  const dispatch = useDispatch()
  const item = useMemo(() => resolveProduct(product), [product])
  const image = pickOptimizedImage(item)
  const name = item?.name || 'Untitled product'
  const productId = item?._id || item?.id || item?.sku
  const detailsPath = productId
    ? `/shop/${encodeURIComponent(productId)}`
    : null

  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)

  const tags = useMemo(
    () =>
      Array.from(
        new Set(
          [
            item?.size,
            item?.packingUnit,
            item?.variant,
            item?.grade,
            item?.catalogCode ? `Code ${item.catalogCode}` : null,
          ].filter(Boolean),
        ),
      ),
    [item],
  )

  const qtyNum =
    typeof quantity === 'number' ? quantity : parseInt(quantity, 10) || 1

  const handleAddToCart = () => {
    if (isAdded) return

    dispatch(addToCart({ ...item, quantity: qtyNum }))
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
          <div className="relative h-40 w-full overflow-hidden bg-slate-50">
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ userSelect: 'none', WebkitUserDrag: 'none' }}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = FALLBACK_IMAGE
              }}
            />
            <div
              className="absolute inset-0 bg-transparent"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              aria-hidden="true"
            />
          </div>
        </Link>
      ) : (
        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{ userSelect: 'none', WebkitUserDrag: 'none' }}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = FALLBACK_IMAGE
            }}
          />
          <div
            className="absolute inset-0 bg-transparent"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            aria-hidden="true"
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
        <div className="mt-auto flex flex-col gap-2 pt-2 lg:flex-row lg:items-center">
          <QuantityControl
            quantity={quantity}
            setQuantity={setQuantity}
            min={1}
            size="sm"
            className="w-full lg:w-auto"
          />

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdded}
            aria-label={isAdded ? 'Added to cart' : 'Add to cart'}
            className={[
              'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ring-1 ring-inset lg:w-24 lg:px-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
              isAdded
                ? 'cursor-default bg-emerald-600 text-white ring-emerald-600'
                : 'bg-white text-violet-700 ring-violet-300 hover:bg-violet-600 hover:text-white hover:ring-violet-600',
            ].join(' ')}
          >
            {isAdded ? (
              <>
                <FaCheck size={14} className="lg:hidden" />
                <span className="lg:hidden">Added</span>
                <FaCheck size={16} className="hidden lg:inline" />
              </>
            ) : (
              <>
                <FaShoppingCart size={14} />
                <FaPlus size={10} className="hidden lg:inline" />
                <span className="lg:hidden">Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
