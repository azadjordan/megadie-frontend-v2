import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiChevronLeft, FiPlus, FiSave } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import {
  useGetFilterConfigQuery,
  useUpdateFilterConfigMutation,
} from "../../features/filters/filterConfigsApiSlice";

const FILTER_FIELD_TYPES = ["enum", "boolean", "range", "text"];
const FILTER_UI_TYPES = ["chips", "select", "checkbox", "slider", "search"];

const createLocalId = () =>
  `field-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatDateTime = (iso) => {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
};

const normalizeNumber = (raw, fallback = 0) => {
  if (raw === "" || raw === null || typeof raw === "undefined") return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
};

const parseAllowedValueMeta = (raw) => {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const values = [];
  const labels = {};
  const explanations = {};

  lines.forEach((line) => {
    const parts = line
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) return;
    const value = parts[0];
    if (!value) return;
    if (!values.includes(value)) values.push(value);
    if (parts.length > 1 && parts[1]) {
      labels[value] = parts[1];
    }
    if (parts.length > 2 && parts[2]) {
      explanations[value] = parts.slice(2).join(", ").trim();
    }
  });

  return { values, labels, explanations };
};

const buildFieldRow = (field = {}) => {
  const labelsMap =
    field?.allowedValueLabels instanceof Map
      ? Object.fromEntries(field.allowedValueLabels)
      : field?.allowedValueLabels || {};
  const explanationsMap =
    field?.allowedValueExplanations instanceof Map
      ? Object.fromEntries(field.allowedValueExplanations)
      : field?.allowedValueExplanations || {};
  return {
    id: createLocalId(),
    key: field.key || "",
    label: field.label || "",
    type: field.type || "enum",
    ui: field.ui || "chips",
    multi: typeof field.multi === "boolean" ? field.multi : true,
    sort: Number.isFinite(Number(field.sort)) ? String(field.sort) : "0",
    allowedValueMetaText: Array.isArray(field.allowedValues)
      ? field.allowedValues
          .map((value) => {
            const label = labelsMap?.[value] || "";
            const explanation = explanationsMap?.[value] || "";
            if (!label && !explanation) return `${value}`;
            if (label && explanation) return `${value}, ${label}, ${explanation}`;
            return `${value}, ${label || ""}`.trim();
          })
          .filter(Boolean)
          .join("\n")
      : "",
  };
};

const buildFormState = (config, productTypeFallback) => ({
  productType: config?.productType || productTypeFallback || "",
  sort: Number.isFinite(Number(config?.sort)) ? String(config.sort) : "0",
  fields: Array.isArray(config?.fields)
    ? config.fields.map((field) => buildFieldRow(field))
    : [],
});

const inputClass = (hasError) =>
  [
    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900",
    "ring-1 ring-slate-200 placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-slate-900/20",
    "disabled:bg-slate-50 disabled:text-slate-500",
    hasError ? "ring-rose-300 focus:ring-rose-400" : "",
  ].join(" ");

export default function AdminFilterConfigEditPage() {
  const { productType } = useParams();
  const [form, setForm] = useState(() => buildFormState(null, productType));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const {
    data: config,
    isLoading,
    isFetching,
    error,
  } = useGetFilterConfigQuery(productType, { skip: !productType });

  const [updateFilterConfig, { isLoading: isSaving, error: saveError }] =
    useUpdateFilterConfigMutation();

  const summaryCards = useMemo(
    () => [
      { label: "Product type", value: form.productType || "-" },
      { label: "Fields", value: formatQty(form.fields.length) },
      {
        label: "Updated",
        value: formatDateTime(config?.updatedAt),
      },
    ],
    [form.productType, form.fields.length, config?.updatedAt]
  );

  useEffect(() => {
    if (!productType) return;
    if (!config || isDirty) return;
    setForm(buildFormState(config, productType));
    setFieldErrors({});
    setFormError("");
  }, [config, productType, isDirty]);

  const updateFormField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
    setIsDirty(true);
  };

  const updateFieldRow = (id, key, value) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field
      ),
    }));
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFormError("");
    setIsDirty(true);
  };

  const handleTypeChange = (id, value) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === id
          ? {
              ...field,
              type: value,
              allowedValueMetaText:
                value === "enum" ? field.allowedValueMetaText : "",
            }
          : field
      ),
    }));
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFormError("");
    setIsDirty(true);
  };

  const handleAddField = () => {
    setForm((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        buildFieldRow({
          type: "enum",
          ui: "chips",
          multi: true,
          sort: prev.fields.length,
        }),
      ],
    }));
    setFormError("");
    setIsDirty(true);
  };

  const handleRemoveField = (id) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== id),
    }));
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFormError("");
    setIsDirty(true);
  };

  const handleReset = () => {
    if (!config) return;
    setForm(buildFormState(config, productType));
    setFieldErrors({});
    setFormError("");
    setIsDirty(false);
  };

  const validateForm = () => {
    const nextErrors = {};
    let message = "";

    if (form.sort !== "" && !Number.isFinite(Number(form.sort))) {
      message = "Sort must be a number.";
    }

    const seenKeys = new Set();
    form.fields.forEach((field) => {
      const errors = {};
      const key = String(field.key || "").trim();
      const label = String(field.label || "").trim();

      if (!key) {
        errors.key = "Key is required.";
      } else {
        const normalized = key.toLowerCase();
        if (seenKeys.has(normalized)) {
          errors.key = "Key must be unique.";
        } else {
          seenKeys.add(normalized);
        }
      }

      if (!label) {
        errors.label = "Label is required.";
      }

      if (!field.type || !FILTER_FIELD_TYPES.includes(field.type)) {
        errors.type = "Select a valid type.";
      }

      if (field.ui && !FILTER_UI_TYPES.includes(field.ui)) {
        errors.ui = "Select a valid UI.";
      }

      if (Object.keys(errors).length) {
        nextErrors[field.id] = errors;
      }
    });

    if (!message && Object.keys(nextErrors).length) {
      message = "Fix the highlighted fields before saving.";
    }

    return { message, fieldErrors: nextErrors };
  };

  const handleSave = async () => {
    const { message, fieldErrors: nextErrors } = validateForm();
    setFieldErrors(nextErrors);
    setFormError(message);
    if (message) return;

    const payloadFields = form.fields.map((field) => {
      const meta =
        field.type === "enum"
          ? parseAllowedValueMeta(field.allowedValueMetaText)
          : { values: [], labels: {}, explanations: {} };
      return {
        key: String(field.key || "").trim(),
        label: String(field.label || "").trim(),
        type: field.type,
        ui: field.ui || "chips",
        multi: Boolean(field.multi),
        sort: normalizeNumber(field.sort, 0),
        allowedValues: meta.values,
        allowedValueLabels: meta.labels,
        allowedValueExplanations: meta.explanations,
      };
    });

    try {
      const res = await updateFilterConfig({
        productType: form.productType || productType,
        sort: normalizeNumber(form.sort, 0),
        fields: payloadFields,
      }).unwrap();
      const updated = res?.data || res;
      setForm(buildFormState(updated, productType));
      setFieldErrors({});
      setFormError("");
      setIsDirty(false);
      toast.success("Filter config saved.");
    } catch {
      // ErrorMessage handles API errors.
    }
  };

  if (!productType) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm text-slate-600">
          Product type is missing.
        </div>
      </div>
    );
  }

  if (isLoading && !config) {
    return <Loader />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin/filter-configs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to filter configs
          </Link>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            Edit filter config
          </div>
          <div className="text-sm text-slate-500">
            Update the fields and ordering for {form.productType || productType}.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFetching ? (
            <div className="text-xs font-semibold text-slate-400">
              Refreshing...
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition",
              !isDirty || isSaving
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-slate-900 text-white hover:bg-slate-800",
            ].join(" ")}
          >
            <FiSave className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || isSaving}
            className={[
              "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
              !isDirty || isSaving
                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:gap-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="min-w-0 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:p-4"
          >
            <div className="text-[10px] font-semibold text-slate-500 sm:text-xs">
              {card.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 sm:mt-2 sm:text-lg">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Config settings
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Product type
            </label>
            <input
              value={form.productType}
              readOnly
              className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Sort order
            </label>
            <input
              type="number"
              value={form.sort}
              onChange={(e) => updateFormField("sort", e.target.value)}
              className={inputClass(Boolean(formError))}
            />
            <div className="mt-1 text-[11px] text-slate-400">
              Lower numbers show first in the shop filter list.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fields
            </div>
            <div className="text-xs text-slate-400">
              Sort controls display order in the shop.
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <FiPlus className="h-4 w-4" />
            Add field
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {form.fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No fields yet. Add one to start building filters.
            </div>
          ) : (
            form.fields.map((field, index) => {
              const errors = fieldErrors[field.id] || {};
              const isEnum = field.type === "enum";
              return (
                <div
                  key={field.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-600">
                      Field {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Key
                      </label>
                      <input
                        value={field.key}
                        onChange={(e) =>
                          updateFieldRow(field.id, "key", e.target.value)
                        }
                        className={inputClass(Boolean(errors.key))}
                        placeholder="categoryKeys"
                      />
                      {errors.key ? (
                        <div className="mt-1 text-[11px] text-rose-600">
                          {errors.key}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-3">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Label
                      </label>
                      <input
                        value={field.label}
                        onChange={(e) =>
                          updateFieldRow(field.id, "label", e.target.value)
                        }
                        className={inputClass(Boolean(errors.label))}
                        placeholder="Category"
                      />
                      {errors.label ? (
                        <div className="mt-1 text-[11px] text-rose-600">
                          {errors.label}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          handleTypeChange(field.id, e.target.value)
                        }
                        className={inputClass(Boolean(errors.type))}
                      >
                        {FILTER_FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {errors.type ? (
                        <div className="mt-1 text-[11px] text-rose-600">
                          {errors.type}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        UI
                      </label>
                      <select
                        value={field.ui}
                        onChange={(e) =>
                          updateFieldRow(field.id, "ui", e.target.value)
                        }
                        className={inputClass(Boolean(errors.ui))}
                      >
                        {FILTER_UI_TYPES.map((ui) => (
                          <option key={ui} value={ui}>
                            {ui}
                          </option>
                        ))}
                      </select>
                      {errors.ui ? (
                        <div className="mt-1 text-[11px] text-rose-600">
                          {errors.ui}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Sort
                      </label>
                      <input
                        type="number"
                        value={field.sort}
                        onChange={(e) =>
                          updateFieldRow(field.id, "sort", e.target.value)
                        }
                        className={inputClass(false)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-8">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Values, labels, explanations
                      </label>
                      <textarea
                        rows={4}
                        value={field.allowedValueMetaText}
                        onChange={(e) =>
                          updateFieldRow(
                            field.id,
                            "allowedValueMetaText",
                            e.target.value
                          )
                        }
                        disabled={!isEnum}
                        placeholder={`1 inch, 1 inch, 25 mm\n1/2 inch, 1/2 inch, 12-13 mm`}
                        className={inputClass(false)}
                      />
                      <div className="mt-1 text-[11px] text-slate-400">
                        {isEnum
                          ? 'One per line: value, label, explanation (label/explanation optional).'
                          : "Only used for enum fields."}
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Multi-select
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(field.multi)}
                          onChange={(e) =>
                            updateFieldRow(field.id, "multi", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                        Allow multiple values
                      </label>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {formError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
          {formError}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <ErrorMessage error={saveError} />
        </div>
      ) : null}
    </div>
  );
}
