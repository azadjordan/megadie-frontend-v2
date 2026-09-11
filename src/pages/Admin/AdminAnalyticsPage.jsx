import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCalendar, FiRefreshCw, FiTrendingUp } from "react-icons/fi";

import ErrorMessage from "../../components/common/ErrorMessage";
import Loader from "../../components/common/Loader";
import { useGetAnalyticsOverviewQuery } from "../../features/analytics/analyticsApiSlice";
import { formatInvoiceMoneyMinor } from "../../utils/invoiceMoney";

const BUSINESS_UTC_OFFSET_MS = 4 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PRESETS = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "last30Days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

const PRESET_VALUES = new Set(PRESETS.map((preset) => preset.value));

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateKeyFromUtcMs(ms) {
  const date = new Date(ms);
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join("-");
}

function parseDateKey(value) {
  if (!DATE_RE.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day);
  const date = new Date(utcMs);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, utcMs, key: String(value) };
}

function addDays(dateKey, days) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "";
  return dateKeyFromUtcMs(parsed.utcMs + days * 24 * 60 * 60 * 1000);
}

function businessTodayKey(now = new Date()) {
  return dateKeyFromUtcMs(now.getTime() + BUSINESS_UTC_OFFSET_MS);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getPresetRange(preset) {
  const today = parseDateKey(businessTodayKey());
  const thisMonthFrom = `${today.year}-${pad2(today.month)}-01`;

  if (preset === "lastMonth") {
    const month = today.month === 1 ? 12 : today.month - 1;
    const year = today.month === 1 ? today.year - 1 : today.year;
    return {
      from: `${year}-${pad2(month)}-01`,
      to: `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`,
    };
  }

  if (preset === "last30Days") {
    return {
      from: addDays(today.key, -29),
      to: today.key,
    };
  }

  return {
    from: thisMonthFrom,
    to: today.key,
  };
}

function readAnalyticsState(searchParams) {
  const presetRaw = searchParams.get("preset") || "thisMonth";
  const preset = PRESET_VALUES.has(presetRaw) ? presetRaw : "thisMonth";

  if (preset !== "custom") {
    return {
      preset,
      ...getPresetRange(preset),
    };
  }

  const defaults = getPresetRange("thisMonth");
  const rawFrom = searchParams.get("from") || "";
  const rawTo = searchParams.get("to") || "";

  return {
    preset,
    from: parseDateKey(rawFrom)?.key || defaults.from,
    to: parseDateKey(rawTo)?.key || defaults.to,
  };
}

function buildSearchParams(state) {
  const params = new URLSearchParams();
  const preset = PRESET_VALUES.has(state?.preset) ? state.preset : "thisMonth";
  const from = parseDateKey(state?.from)?.key || getPresetRange(preset).from;
  const to = parseDateKey(state?.to)?.key || getPresetRange(preset).to;

  if (preset !== "thisMonth") params.set("preset", preset);
  if (preset === "custom") {
    params.set("from", from);
    params.set("to", to);
  }

  return params;
}

function formatDateLabel(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "-";

  return new Date(parsed.utcMs).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatCount(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
}

function formatMajorMoney(value, currency = "AED") {
  const n = Number(value);
  const amount = Number.isFinite(n) ? n : 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "No comparison";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(2)}%`;
}

function ChangeBadge({ value }) {
  const n = Number(value);
  const hasChange = Number.isFinite(n);
  const tone = !hasChange
    ? "bg-slate-50 text-slate-500 ring-slate-200"
    : n > 0
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : n < 0
    ? "bg-rose-50 text-rose-700 ring-rose-200"
    : "bg-slate-50 text-slate-600 ring-slate-200";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        tone,
      ].join(" ")}
    >
      {formatPercent(value)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  previous,
  changePercent,
  basis,
  accent = "slate",
}) {
  const accentClass =
    accent === "emerald"
      ? "bg-emerald-400"
      : accent === "violet"
      ? "bg-violet-400"
      : accent === "amber"
      ? "bg-amber-400"
      : accent === "blue"
      ? "bg-blue-400"
      : "bg-slate-400";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass}`} />
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900 tabular-nums">
        {value}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ChangeBadge value={changePercent} />
        {previous ? (
          <span className="text-xs text-slate-500">Prev: {previous}</span>
        ) : null}
      </div>
      {basis ? <div className="mt-2 text-xs text-slate-500">{basis}</div> : null}
    </div>
  );
}

function SnapshotCard({ metric }) {
  const amount = formatInvoiceMoneyMinor(
    metric?.amountMinor ?? 0,
    metric?.currency || "AED",
    metric?.minorUnitFactor || 100
  );
  const count = formatCount(metric?.count || 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
      <div className="absolute inset-x-0 top-0 h-1 bg-rose-400" />
      <div className="text-xs font-semibold text-rose-700">
        Current Outstanding
      </div>
      <div className="mt-2 text-xl font-semibold text-rose-900 tabular-nums">
        {amount}
      </div>
      <div className="mt-3 text-xs text-rose-700">
        {count} issued invoice{count === "1" ? "" : "s"} with a balance
      </div>
      <div className="mt-2 text-xs text-rose-700/80">
        Current balance, not historical for the selected range.
      </div>
    </div>
  );
}

function TrendList({ rows = [] }) {
  const maxBookedSales = Math.max(
    1,
    ...rows.map((row) => Number(row?.bookedSales) || 0)
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        No trend data for this range.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="grid grid-cols-[96px_minmax(140px,1fr)_118px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
        <div>Date</div>
        <div>Booked Sales</div>
        <div className="text-right">Orders</div>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {rows.map((row) => {
          const bookedSales = Number(row?.bookedSales) || 0;
          const width = `${Math.max(2, (bookedSales / maxBookedSales) * 100)}%`;

          return (
            <div
              key={row.date}
              className="grid grid-cols-[96px_minmax(140px,1fr)_118px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
            >
              <div className="text-xs font-semibold text-slate-600">
                {formatDateLabel(row.date)}
              </div>
              <div className="min-w-0">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width }}
                  />
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-900 tabular-nums">
                  {formatMajorMoney(bookedSales)}
                </div>
              </div>
              <div className="text-right text-xs font-semibold text-slate-700">
                {formatCount(row?.orderCount || 0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readAnalyticsState(searchParams);
  const { preset, from, to } = state;
  const fromParsed = parseDateKey(from);
  const toParsed = parseDateKey(to);
  const rangeIsValid = Boolean(
    fromParsed && toParsed && fromParsed.utcMs <= toParsed.utcMs
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetAnalyticsOverviewQuery(
    { from, to },
    { skip: !rangeIsValid }
  );

  const metrics = useMemo(() => data?.metrics || {}, [data?.metrics]);
  const range = data?.range || {};
  const trendRows = data?.trend || [];
  const selectedRangeLabel = `${formatDateLabel(from)} to ${formatDateLabel(to)}`;
  const comparisonLabel =
    range?.previousFrom && range?.previousTo
      ? `${formatDateLabel(range.previousFrom)} to ${formatDateLabel(
          range.previousTo
        )}`
      : "";

  const kpis = useMemo(
    () => [
      {
        label: "Booked Sales",
        value: formatMajorMoney(metrics.bookedSales?.current),
        previous: formatMajorMoney(metrics.bookedSales?.previous),
        changePercent: metrics.bookedSales?.changePercent,
        basis: "Non-cancelled orders by order created date.",
        accent: "violet",
      },
      {
        label: "Delivered Value",
        value: formatMajorMoney(metrics.deliveredValue?.current),
        previous: formatMajorMoney(metrics.deliveredValue?.previous),
        changePercent: metrics.deliveredValue?.changePercent,
        basis: "Delivered orders by delivered date.",
        accent: "emerald",
      },
      {
        label: "Invoiced",
        value: formatInvoiceMoneyMinor(
          metrics.invoiced?.currentMinor ?? 0,
          metrics.invoiced?.currency || "AED",
          metrics.invoiced?.minorUnitFactor || 100
        ),
        previous: formatInvoiceMoneyMinor(
          metrics.invoiced?.previousMinor ?? 0,
          metrics.invoiced?.currency || "AED",
          metrics.invoiced?.minorUnitFactor || 100
        ),
        changePercent: metrics.invoiced?.changePercent,
        basis: "Issued invoices by invoice date.",
        accent: "blue",
      },
      {
        label: "Collected",
        value: formatInvoiceMoneyMinor(
          metrics.collected?.currentMinor ?? 0,
          metrics.collected?.currency || "AED",
          metrics.collected?.minorUnitFactor || 100
        ),
        previous: formatInvoiceMoneyMinor(
          metrics.collected?.previousMinor ?? 0,
          metrics.collected?.currency || "AED",
          metrics.collected?.minorUnitFactor || 100
        ),
        changePercent: metrics.collected?.changePercent,
        basis: "Payments by payment date.",
        accent: "amber",
      },
      {
        label: "Orders",
        value: formatCount(metrics.orders?.current),
        previous: formatCount(metrics.orders?.previous),
        changePercent: metrics.orders?.changePercent,
        basis: "Non-cancelled orders by order created date.",
        accent: "slate",
      },
    ],
    [metrics]
  );

  const updatePreset = (nextPreset) => {
    if (nextPreset === "custom") {
      setSearchParams(buildSearchParams({ preset: "custom", from, to }), {
        replace: true,
      });
      return;
    }

    setSearchParams(
      buildSearchParams({ preset: nextPreset, ...getPresetRange(nextPreset) }),
      { replace: true }
    );
  };

  const updateCustomDate = (key, value) => {
    const next = {
      preset: "custom",
      from,
      to,
      [key]: value,
    };
    setSearchParams(buildSearchParams(next), { replace: true });
  };

  const resetRange = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Analytics</div>
          <div className="text-sm text-slate-500">
            Business performance for a selected date range.
          </div>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <FiCalendar className="h-3.5 w-3.5" />
          {range?.timezone || "Asia/Dubai"} calendar days
        </div>
      </div>

      <section className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_170px_170px_auto] md:items-end">
          <div>
            <label
              htmlFor="analytics-preset"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Date Range
            </label>
            <select
              id="analytics-preset"
              value={preset}
              onChange={(event) => updatePreset(event.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              {PRESETS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="analytics-from"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              value={from}
              onChange={(event) => updateCustomDate("from", event.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div>
            <label
              htmlFor="analytics-to"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => updateCustomDate("to", event.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              type="button"
              onClick={resetRange}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <FiRefreshCw className="h-3.5 w-3.5 text-slate-400" />
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            Selected:{" "}
            <span className="font-semibold text-slate-700">
              {selectedRangeLabel}
            </span>
          </span>
          {comparisonLabel ? (
            <span>
              Compared with{" "}
              <span className="font-semibold text-slate-700">
                {comparisonLabel}
              </span>
            </span>
          ) : null}
          {isFetching && !isLoading ? <span>Updating...</span> : null}
        </div>

        {!rangeIsValid ? (
          <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
            From date must be before or equal to To date.
          </div>
        ) : null}
      </section>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : rangeIsValid ? (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
            <SnapshotCard metric={metrics.currentOutstanding} />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiTrendingUp className="h-4 w-4 text-slate-500" />
                  Business Performance
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Daily booked sales and order count using order created date.
                </div>
              </div>
              {trendRows.length > 120 ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Daily view may be dense for long ranges.
                </div>
              ) : null}
            </div>
            <TrendList rows={trendRows} />
          </section>
        </>
      ) : null}
    </div>
  );
}
