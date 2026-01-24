import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import {
  useGetProductByIdQuery,
  useGetProductMetaQuery,
  useUpdateProductMutation,
} from "../../features/products/productsApiSlice";
import { useGetCategoriesQuery } from "../../features/categories/categoriesApiSlice";
import { useGetPriceRulesQuery } from "../../features/priceRules/priceRulesApiSlice";

const STEPS = [
  { key: "basics", label: "Basics", description: "Type, category, price rule" },
  {
    key: "attributes",
    label: "Attributes",
    description: "Fields that build SKU and name",
  },
  {
    key: "extras",
    label: "Extras",
    description: "Tags, images, status, merchandising",
  },
  { key: "review", label: "Review", description: "Confirm and save" },
];

const emptyForm = {
  productType: "",
  categoryId: "",
  priceRule: "",
  size: "",
  color: "",
  catalogCode: "",
  variant: "",
  grade: "",
  finish: "",
  packingUnit: "",
  tags: [],
  imagesText: "",
  description: "",
  isActive: true,
  isAvailable: true,
  isFeatured: false,
  featuredRank: "0",
  sort: "",
  moq: "1",
  cbm: "0",
};

const parseLines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sanitizeToken = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9./]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const skuToken = (skuTokens, field, value) => {
  if (!value) return "";
  const map = skuTokens?.[field];
  const mapped = map?.[value];
  if (mapped) return mapped;
  return sanitizeToken(value);
};

const buildSkuPreview = (skuTokens, {
  productType,
  categoryKey,
  size,
  color,
  catalogCode,
  variant,
  grade,
  finish,
  packingUnit,
}) => {
  const parts = [
    skuToken(skuTokens, "productType", productType),
    skuToken(skuTokens, "categoryKey", categoryKey),
    skuToken(skuTokens, "size", size),
    sanitizeToken(color),
    sanitizeToken(catalogCode),
    skuToken(skuTokens, "variant", variant),
    skuToken(skuTokens, "grade", grade),
    skuToken(skuTokens, "finish", finish),
    skuToken(skuTokens, "packingUnit", packingUnit),
  ].filter(Boolean);

  return parts.join("|") || "";
};

const buildNamePreview = ({
  productType,
  categoryLabel,
  size,
  color,
  finish,
  variant,
  grade,
}) => {
  const parts = [
    productType,
    categoryLabel,
    size,
    color,
    finish,
    variant,
    grade,
  ].filter(Boolean);
  return parts.join(" ");
};

const normalizeNumber = (value) => {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export default function AdminProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);

  const {
    data: productData,
    isLoading: productLoading,
    error: productError,
  } = useGetProductByIdQuery(id, { skip: !id });
  const {
    data: metaData,
    isLoading: metaLoading,
    error: metaError,
  } = useGetProductMetaQuery();
  const {
    data: priceRulesData,
    isLoading: priceRulesLoading,
    error: priceRulesError,
  } = useGetPriceRulesQuery();
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetCategoriesQuery(
    form.productType
      ? { productType: form.productType, isActive: true, limit: 200 }
      : undefined,
    { skip: !form.productType }
  );

  const [updateProduct, { isLoading: isSaving }] =
    useUpdateProductMutation();

  const step = STEPS[stepIndex];
  const productTypes = metaData?.productTypes ?? [];
  const sizes = metaData?.sizes ?? [];
  const grades = metaData?.grades ?? [];
  const variants = metaData?.variants ?? [];
  const finishes = metaData?.finishes ?? [];
  const packingUnits = metaData?.packingUnits ?? [];
  const tags = metaData?.tags ?? [];
  const catalogCodes = metaData?.ribbonCatalogCodes ?? [];
  const skuTokens = metaData?.skuTokens ?? {};

  const priceRules = priceRulesData?.data ?? [];
  const categories = categoriesData ?? [];

  const product = productData ?? null;

  const tagOptions = useMemo(() => {
    const map = new Map();
    tags.forEach((tag) => {
      map.set(tag, { value: tag, isLegacy: false });
    });
    form.tags.forEach((tag) => {
      if (!map.has(tag)) {
        map.set(tag, { value: tag, isLegacy: true });
      }
    });
    return Array.from(map.values());
  }, [tags, form.tags]);

  useEffect(() => {
    if (!product || hasInitialized) return;
    const categoryId =
      product.category?._id ||
      product.category?.id ||
      product.category ||
      "";
    setForm({
      productType:
        product.productType || product.category?.productType || "",
      categoryId,
      priceRule: product.priceRule || "",
      size: product.size || "",
      color: product.color || "",
      catalogCode: product.catalogCode || "",
      variant: product.variant || "",
      grade: product.grade || "",
      finish: product.finish || "",
      packingUnit: product.packingUnit || "",
      tags: Array.isArray(product.tags) ? product.tags : [],
      imagesText: Array.isArray(product.images)
        ? product.images.join("\n")
        : "",
      description: product.description || "",
      isActive: typeof product.isActive === "boolean" ? product.isActive : true,
      isAvailable:
        typeof product.isAvailable === "boolean" ? product.isAvailable : true,
      isFeatured:
        typeof product.isFeatured === "boolean" ? product.isFeatured : false,
      featuredRank: String(product.featuredRank ?? "0"),
      sort: product.sort != null ? String(product.sort) : "",
      moq: String(product.moq ?? "1"),
      cbm: String(product.cbm ?? "0"),
    });
    setFieldErrors({});
    setHasInitialized(true);
  }, [product, hasInitialized]);

  const selectedCategory = useMemo(() => {
    if (!form.categoryId) return null;
    return (
      categories.find(
        (cat) => String(cat._id || cat.id) === String(form.categoryId)
      ) || null
    );
  }, [categories, form.categoryId]);

  const sizeOptions = sizes;

  const preview = useMemo(() => {
    const resolvedType = selectedCategory?.productType || form.productType;
    const categoryLabel = selectedCategory?.label || selectedCategory?.key || "";
    const sku = buildSkuPreview(skuTokens, {
      productType: resolvedType,
      categoryKey: selectedCategory?.key,
      size: form.size,
      color: form.color,
      catalogCode: form.catalogCode,
      variant: form.variant,
      grade: form.grade,
      finish: form.finish,
      packingUnit: form.packingUnit,
    });
    const name = buildNamePreview({
      productType: resolvedType,
      categoryLabel,
      size: form.size,
      color: form.color,
      finish: form.finish,
      variant: form.variant,
      grade: form.grade,
    });

    const missing = [];
    if (!selectedCategory) missing.push("category");
    if (!form.size) missing.push("size");
    if (!form.packingUnit) missing.push("packing unit");
    const note = missing.length
      ? `Add ${missing.join(" and ")} to improve the preview.`
      : "SKU and name will update automatically on save.";

    return {
      sku,
      name,
      note,
    };
  }, [
    form.catalogCode,
    form.color,
    form.finish,
    form.grade,
    form.packingUnit,
    form.productType,
    form.size,
    form.variant,
    selectedCategory,
    skuTokens,
  ]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleProductTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      productType: value,
      categoryId: "",
    }));
    setFieldErrors((prev) => ({
      ...prev,
      productType: "",
      categoryId: "",
    }));
  };

  const toggleTag = (tag) => {
    setForm((prev) => {
      const exists = prev.tags.includes(tag);
      const nextTags = exists
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: nextTags };
    });
  };

  const validateBasics = () => {
    const errors = {};
    if (!form.productType) errors.productType = "Select a product type.";
    if (!form.categoryId) errors.categoryId = "Select a category.";
    if (!form.priceRule) errors.priceRule = "Select a price rule.";
    return errors;
  };

  const validateAttributes = () => {
    const errors = {};
    if (!form.size) errors.size = "Size is required.";
    if (!form.packingUnit) errors.packingUnit = "Packing unit is required.";
    if (form.catalogCode && !catalogCodes.includes(form.catalogCode)) {
      errors.catalogCode = "Select a valid catalog code.";
    }
    return errors;
  };

  const validateExtras = () => {
    const errors = {};
    const moqValue = normalizeNumber(form.moq);
    if (moqValue !== null && moqValue < 1) {
      errors.moq = "MOQ must be 1 or higher.";
    }
    const cbmValue = normalizeNumber(form.cbm);
    if (cbmValue !== null && cbmValue < 0) {
      errors.cbm = "CBM must be 0 or higher.";
    }
    const featuredRankRaw = String(form.featuredRank ?? "").trim();
    const featuredRankValue = normalizeNumber(featuredRankRaw);
    if (featuredRankRaw && featuredRankValue === null) {
      errors.featuredRank = "Featured rank must be a number.";
    } else if (featuredRankValue !== null && featuredRankValue < 0) {
      errors.featuredRank = "Featured rank must be 0 or higher.";
    }
    const sortRaw = String(form.sort ?? "").trim();
    const sortValue = normalizeNumber(sortRaw);
    if (sortRaw && sortValue === null) {
      errors.sort = "Sort must be a number.";
    }
    return errors;
  };

  const handleNext = () => {
    if (step.key === "basics") {
      const errors = validateBasics();
      if (Object.keys(errors).length) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        return;
      }
    }
    if (step.key === "attributes") {
      const errors = validateAttributes();
      if (Object.keys(errors).length) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        return;
      }
    }
    if (step.key === "extras") {
      const errors = validateExtras();
      if (Object.keys(errors).length) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        return;
      }
    }

    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleUpdate = async () => {
    const errorsByStep = {
      basics: validateBasics(),
      attributes: validateAttributes(),
      extras: validateExtras(),
    };
    const mergedErrors = {
      ...errorsByStep.basics,
      ...errorsByStep.attributes,
      ...errorsByStep.extras,
    };
    if (Object.keys(mergedErrors).length) {
      setFieldErrors((prev) => ({ ...prev, ...mergedErrors }));
      const firstErrorIndex = STEPS.findIndex(
        (s) => Object.keys(errorsByStep[s.key] || {}).length
      );
      if (firstErrorIndex >= 0) setStepIndex(firstErrorIndex);
      return;
    }

    const payload = {
      category: form.categoryId,
      priceRule: form.priceRule,
      size: form.size,
      color: form.color?.trim() || undefined,
      catalogCode: String(form.catalogCode || "").trim(),
      variant: form.variant || undefined,
      grade: form.grade || undefined,
      finish: form.finish || undefined,
      packingUnit: form.packingUnit?.trim() || undefined,
      tags: form.tags,
      images: parseLines(form.imagesText),
      description: form.description?.trim() || undefined,
      isActive: form.isActive,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
    };

    const moqValue = normalizeNumber(form.moq);
    if (moqValue !== null) payload.moq = moqValue;
    const cbmValue = normalizeNumber(form.cbm);
    if (cbmValue !== null) payload.cbm = cbmValue;
    const featuredRankValue = normalizeNumber(form.featuredRank);
    if (featuredRankValue !== null) payload.featuredRank = featuredRankValue;
    const sortValue = normalizeNumber(form.sort);
    if (sortValue !== null) payload.sort = sortValue;

    try {
      setSubmitError("");
      await updateProduct({ id, ...payload }).unwrap();
      navigate("/admin/inventory/products");
    } catch (err) {
      setSubmitError(
        err?.data?.message || err?.error || "Unable to update product."
      );
    }
  };

  if (productLoading || metaLoading) {
    return <Loader />;
  }

  if (productError) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <ErrorMessage message="Unable to load product." error={productError} />
      </div>
    );
  }

  if (metaError || !metaData) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <ErrorMessage
          message="Product metadata is unavailable. Editing is disabled."
          error={metaError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin/inventory/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to inventory
          </Link>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            Edit product
          </div>
          <div className="text-sm text-slate-500">
            SKU and name are derived from the attributes below.
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {STEPS.map((item, index) => {
          const active = index === stepIndex;
          const completed = index < stepIndex;
          return (
            <div
              key={item.key}
              className={[
                "rounded-2xl border px-4 py-3 text-sm",
                active
                  ? "border-slate-900 bg-white text-slate-900"
                  : completed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-500",
              ].join(" ")}
            >
              <div className="text-xs font-semibold uppercase tracking-wide">
                {item.label}
              </div>
              <div className="mt-1 text-xs">{item.description}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Live preview
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              SKU
            </div>
            <div className="mt-1 break-all text-sm font-semibold text-slate-900">
              {preview.sku || product?.sku || "SKU will be generated"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">
              Name
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {preview.name || product?.name || "Name will be generated"}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">{preview.note}</div>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        {step.key === "basics" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Product type
              </label>
              <select
                value={form.productType}
                onChange={(e) => handleProductTypeChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="">Select type</option>
                {form.productType &&
                !productTypes.includes(form.productType) ? (
                  <option value={form.productType}>
                    Legacy: {form.productType}
                  </option>
                ) : null}
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {fieldErrors.productType ? (
                <div className="mt-1 text-xs text-rose-600">
                  {fieldErrors.productType}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Category
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}
                disabled={!form.productType || categoriesLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
              >
                {!form.productType ? (
                  <option value="">Select product type first</option>
                ) : categoriesLoading ? (
                  <option value="">Loading categories...</option>
                ) : (
                  <option value="">Select category</option>
                )}
                {categories.map((cat) => (
                  <option key={cat._id || cat.id} value={cat._id || cat.id}>
                    {cat.label || cat.key}
                  </option>
                ))}
              </select>
              {categoriesError ? (
                <div className="mt-1 text-xs text-rose-600">
                  Unable to load categories.
                </div>
              ) : null}
              {fieldErrors.categoryId ? (
                <div className="mt-1 text-xs text-rose-600">
                  {fieldErrors.categoryId}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Price rule
              </label>
              <select
                value={form.priceRule}
                onChange={(e) => updateField("priceRule", e.target.value)}
                disabled={priceRulesLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
              >
                {priceRulesLoading ? (
                  <option value="">Loading price rules...</option>
                ) : (
                  <option value="">Select price rule</option>
                )}
                {priceRules.map((rule) => (
                  <option key={rule._id || rule.code} value={rule.code}>
                    {rule.code}
                  </option>
                ))}
              </select>
              {priceRulesError ? (
                <div className="mt-1 text-xs text-rose-600">
                  Unable to load price rules.
                </div>
              ) : null}
              {fieldErrors.priceRule ? (
                <div className="mt-1 text-xs text-rose-600">
                  {fieldErrors.priceRule}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step.key === "attributes" ? (
          <div className="space-y-4">
            <div className="text-xs text-slate-500">
              These fields influence the SKU and product name. SKU and name are
              updated automatically on save.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Size
                </label>
                <select
                  value={form.size}
                  onChange={(e) => updateField("size", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Select size</option>
                  {form.size && !sizeOptions.includes(form.size) ? (
                    <option value={form.size}>Legacy: {form.size}</option>
                  ) : null}
                  {sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {fieldErrors.size ? (
                  <div className="mt-1 text-xs text-rose-600">
                    {fieldErrors.size}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Color
                </label>
                <input
                  value={form.color}
                  onChange={(e) => updateField("color", e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Catalog code
                </label>
                <select
                  value={form.catalogCode}
                  onChange={(e) => updateField("catalogCode", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Select catalog code</option>
                  {form.catalogCode &&
                  !catalogCodes.includes(form.catalogCode) ? (
                    <option value={form.catalogCode}>
                      Legacy: {form.catalogCode}
                    </option>
                  ) : null}
                  {catalogCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                {fieldErrors.catalogCode ? (
                  <div className="mt-1 text-xs text-rose-600">
                    {fieldErrors.catalogCode}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Variant
                </label>
                <select
                  value={form.variant}
                  onChange={(e) => updateField("variant", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">None</option>
                  {form.variant && !variants.includes(form.variant) ? (
                    <option value={form.variant}>
                      Legacy: {form.variant}
                    </option>
                  ) : null}
                  {variants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Grade
                </label>
                <select
                  value={form.grade}
                  onChange={(e) => updateField("grade", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">None</option>
                  {form.grade && !grades.includes(form.grade) ? (
                    <option value={form.grade}>Legacy: {form.grade}</option>
                  ) : null}
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Finish
                </label>
                <select
                  value={form.finish}
                  onChange={(e) => updateField("finish", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">None</option>
                  {form.finish && !finishes.includes(form.finish) ? (
                    <option value={form.finish}>Legacy: {form.finish}</option>
                  ) : null}
                  {finishes.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Packing unit
                </label>
                <select
                  value={form.packingUnit}
                  onChange={(e) => updateField("packingUnit", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Select packing unit</option>
                  {form.packingUnit && !packingUnits.includes(form.packingUnit) ? (
                    <option value={form.packingUnit}>
                      Legacy: {form.packingUnit}
                    </option>
                  ) : null}
                  {packingUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                {fieldErrors.packingUnit ? (
                  <div className="mt-1 text-xs text-rose-600">
                    {fieldErrors.packingUnit}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {step.key === "extras" ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  MOQ
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.moq}
                  onChange={(e) => updateField("moq", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                {fieldErrors.moq ? (
                  <div className="mt-1 text-xs text-rose-600">
                    {fieldErrors.moq}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  CBM
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cbm}
                  onChange={(e) => updateField("cbm", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                {fieldErrors.cbm ? (
                  <div className="mt-1 text-xs text-rose-600">
                    {fieldErrors.cbm}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                Active in inventory
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => updateField("isAvailable", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                Available in shop
              </label>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Merchandising
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => updateField("isFeatured", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  Featured
                </label>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Featured rank
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.featuredRank}
                    onChange={(e) => updateField("featuredRank", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                  {fieldErrors.featuredRank ? (
                    <div className="mt-1 text-xs text-rose-600">
                      {fieldErrors.featuredRank}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Sort order
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={form.sort}
                    onChange={(e) => updateField("sort", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                  {fieldErrors.sort ? (
                    <div className="mt-1 text-xs text-rose-600">
                      {fieldErrors.sort}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Tags
              </label>
              <div className="grid gap-2 md:grid-cols-3">
                {tagOptions.map((tag) => (
                  <label
                    key={tag.value}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag.value)}
                      onChange={() => toggleTag(tag.value)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    {tag.isLegacy ? `Legacy: ${tag.value}` : tag.value}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Images (one URL per line)
              </label>
              <textarea
                rows={4}
                value={form.imagesText}
                onChange={(e) => updateField("imagesText", e.target.value)}
                placeholder="https://... or /uploads/..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Description
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
          </div>
        ) : null}

        {step.key === "review" ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              SKU and name will be updated automatically from the fields you
              entered.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Basics
                </div>
                <div className="mt-2 space-y-1">
                  <div>Type: {form.productType || "-"}</div>
                  <div>
                    Category: {selectedCategory?.label || selectedCategory?.key || "-"}
                  </div>
                  <div>Price rule: {form.priceRule || "-"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Attributes
                </div>
                <div className="mt-2 space-y-1">
                  <div>Size: {form.size || "-"}</div>
                  <div>Color: {form.color || "-"}</div>
                  <div>Catalog code: {form.catalogCode || "-"}</div>
                  <div>Variant: {form.variant || "-"}</div>
                  <div>Grade: {form.grade || "-"}</div>
                  <div>Finish: {form.finish || "-"}</div>
                  <div>Packing unit: {form.packingUnit || "-"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Extras
                </div>
                <div className="mt-2 space-y-1">
                  <div>MOQ: {form.moq || "-"}</div>
                  <div>CBM: {form.cbm || "-"}</div>
                  <div>Active: {form.isActive ? "Yes" : "No"}</div>
                  <div>Available: {form.isAvailable ? "Yes" : "No"}</div>
                  <div>Featured: {form.isFeatured ? "Yes" : "No"}</div>
                  <div>Featured rank: {form.featuredRank || "-"}</div>
                  <div>Sort order: {form.sort || "-"}</div>
                  <div>Tags: {form.tags.length ? form.tags.join(", ") : "-"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Content
                </div>
                <div className="mt-2 space-y-1">
                  <div>
                    Images: {parseLines(form.imagesText).length || "-"}
                  </div>
                  <div>Description: {form.description || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {submitError ? <ErrorMessage message={submitError} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold",
            stepIndex === 0
              ? "cursor-not-allowed bg-slate-100 text-slate-400"
              : "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          Back
        </button>

        {step.key === "review" ? (
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isSaving}
            className={[
              "rounded-xl px-5 py-2 text-sm font-semibold text-white",
              isSaving
                ? "cursor-not-allowed bg-slate-400"
                : "bg-slate-900 hover:bg-slate-800",
            ].join(" ")}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
