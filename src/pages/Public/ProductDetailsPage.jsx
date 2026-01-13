import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaPlus, FaShoppingCart } from "react-icons/fa";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import QuantityControl from "../../components/common/QuantityControl";
import { addToCart } from "../../features/cart/cartSlice";
import { useGetProductByIdQuery } from "../../features/products/productsApiSlice";

const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#f1f5f9"/><text x="50%" y="50%" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20" font-weight="600" text-anchor="middle" dominant-baseline="middle">No image</text></svg>'
)}`;

export default function ProductDetailsPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useGetProductByIdQuery(id, { skip: !id });

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const name = product?.name || "Untitled product";
  const images = useMemo(() => {
    const list = Array.isArray(product?.images)
      ? product.images.filter(Boolean)
      : [];
    const fallback = product?.imageUrl || placeholder;
    return list.length ? list : [fallback];
  }, [product]);
  const activeImage =
    images[Math.min(activeImageIndex, Math.max(images.length - 1, 0))];
  const categoryLabel =
    product?.category?.displayName ||
    product?.category?.name ||
    product?.category?.label ||
    product?.category?.key ||
    "";

  const isAvailable = product?.isAvailable !== false;

  const moqValue = Number(product?.moq);
  const moq = Number.isFinite(moqValue) && moqValue > 0 ? moqValue : null;

  const minQty = Math.max(moq || 1, 1);
  const description = product?.description?.trim();

  const specs = useMemo(() => {
    if (!product) return [];
    const rows = [
      { label: "Size", value: product.size },
      { label: "Variant", value: product.variant },
      { label: "Grade", value: product.grade },
      { label: "Color", value: product.color },
      { label: "Finish", value: product.finish },
      { label: "Packing unit", value: product.packingUnit },
      { label: "Catalog code", value: product.catalogCode },
    ];
    return rows.filter(
      (row) => row.value != null && String(row.value).trim() !== ""
    );
  }, [product]);

  const breadcrumbLabel = categoryLabel || product?.productType || "Product";

  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(minQty);
  }, [product?.id, minQty]);

  const qtyNum =
    typeof quantity === "number" ? quantity : parseInt(quantity, 10) || 1;

  const handleAddToCart = () => {
    if (!product || isAdded || !isAvailable) return;

    const safeQty = Math.max(qtyNum, minQty);
    dispatch(addToCart({ ...product, quantity: safeQty }));
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 900);
    setQuantity(minQty);
  };

  const handleBack = () => {
    if (location.state?.fromShop) {
      navigate(-1);
      return;
    }

    navigate("/shop");
  };

  if (isLoading) return <Loader />;

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  if (!product) {
    return <ErrorMessage message="Product not found." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80 hover:bg-white"
        >
          <FaArrowLeft size={12} />
          Back to shop
        </button>
        <div className="text-xs text-slate-500">Shop / {breadcrumbLabel}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl bg-white/90 shadow-sm ring-1 ring-slate-200/80">
            <div className="grid min-h-[320px] place-items-center p-4 sm:min-h-[360px]">
              <img
                src={activeImage}
                alt={name}
                className="h-auto w-auto max-h-[420px] max-w-full object-contain"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = placeholder;
                }}
              />
            </div>
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {images.map((src, idx) => {
                const isActive = idx === activeImageIndex;
                return (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={[
                      "h-16 w-16 overflow-hidden rounded-xl border transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
                      isActive
                        ? "border-violet-400 ring-2 ring-violet-200"
                        : "border-slate-200 hover:border-slate-300",
                    ].join(" ")}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img
                      src={src}
                      alt={`${name} thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = placeholder;
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            {categoryLabel || product?.productType ? (
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {categoryLabel || product?.productType}
              </div>
            ) : null}
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {name}
            </h1>
          </div>

          {specs.length > 0 ? (
            <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/80">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Specs
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {specs.map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs text-slate-500">{row.label}</dt>
                    <dd className="font-semibold text-slate-900">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/80">
            <div className="text-xs text-slate-500">
              MOQ: {moq || minQty}
              {product?.packingUnit ? ` ${product.packingUnit}` : ""}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <QuantityControl
                quantity={quantity}
                setQuantity={setQuantity}
                min={minQty}
                size="md"
                disabled={!isAvailable}
              />
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdded || !isAvailable}
                className={[
                  "inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
                  isAdded || !isAvailable
                    ? "cursor-not-allowed bg-violet-100 text-violet-700"
                    : "bg-violet-600 text-white hover:bg-violet-700",
                ].join(" ")}
              >
                {isAdded ? (
                  <>
                    <FaCheck size={14} />
                    Added
                  </>
                ) : !isAvailable ? (
                  "Unavailable"
                ) : (
                  <>
                    <FaShoppingCart size={14} />
                    <FaPlus size={10} />
                    Add to cart
                  </>
                )}
              </button>
            </div>

            {!isAvailable ? (
              <div className="mt-2 text-xs text-rose-600">
                This product is currently unavailable.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {description ? (
        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200/80">
          <div className="text-sm font-semibold text-slate-900">
            Description
          </div>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
            {description}
          </p>
        </section>
      ) : null}
    </div>
  );
}
