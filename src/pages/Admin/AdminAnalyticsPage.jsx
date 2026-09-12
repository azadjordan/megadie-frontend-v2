import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCalendar, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ErrorMessage from "../../components/common/ErrorMessage";
import Loader from "../../components/common/Loader";
import {
  useGetAnalyticsCustomersQuery,
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsSkusQuery,
} from "../../features/analytics/analyticsApiSlice";
import { useGetUsersAdminQuery } from "../../features/users/usersApiSlice";
import { formatInvoiceMoneyMinor, minorToMajor } from "../../utils/invoiceMoney";

const BUSINESS_UTC_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PRESETS = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "last30Days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

const PRESET_VALUES = new Set(PRESETS.map((preset) => preset.value));
const COMPARE_MODES = {
  NONE: "none",
  PREVIOUS_PERIOD: "previousPeriod",
  SAME_DATES_LAST_YEAR: "sameDatesLastYear",
};
const COMPARE_OPTIONS = [
  { value: COMPARE_MODES.NONE, label: "None" },
  { value: COMPARE_MODES.PREVIOUS_PERIOD, label: "Previous period" },
  { value: COMPARE_MODES.SAME_DATES_LAST_YEAR, label: "Same dates last year" },
];
const COMPARE_VALUES = new Set(COMPARE_OPTIONS.map((option) => option.value));
const CUSTOMER_ID_RE = /^[a-f\d]{24}$/i;

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
  return dateKeyFromUtcMs(parsed.utcMs + days * DAY_MS);
}

function businessTodayKey(now = new Date()) {
  return dateKeyFromUtcMs(now.getTime() + BUSINESS_UTC_OFFSET_MS);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function sameDateLastYear(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  const year = parsed.year - 1;
  const day = Math.min(parsed.day, daysInMonth(year, parsed.month));
  return parseDateKey(`${year}-${pad2(parsed.month)}-${pad2(day)}`);
}

function dayCountBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to || from.utcMs > to.utcMs) return 0;
  return Math.round((to.utcMs - from.utcMs) / DAY_MS) + 1;
}

function isFullCalendarMonth(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  return Boolean(
    from &&
      to &&
      from.day === 1 &&
      from.year === to.year &&
      from.month === to.month &&
      to.day === daysInMonth(to.year, to.month)
  );
}

function canCompareSameDatesLastYear(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const previousTo = sameDateLastYear(toKey);
  const dayCount = dayCountBetween(fromKey, toKey);

  return Boolean(
    from &&
      previousTo &&
      dayCount > 0 &&
      dayCount <= 366 &&
      previousTo.utcMs < from.utcMs
  );
}

function defaultCompareForPreset(preset) {
  return preset === "custom"
    ? COMPARE_MODES.NONE
    : COMPARE_MODES.PREVIOUS_PERIOD;
}

function normalizeCompareMode(value, preset, from, to) {
  const raw = String(value || "");
  const fallback = defaultCompareForPreset(preset);
  const compare = COMPARE_VALUES.has(raw) ? raw : fallback;

  if (
    compare === COMPARE_MODES.SAME_DATES_LAST_YEAR &&
    !canCompareSameDatesLastYear(from, to)
  ) {
    return COMPARE_MODES.NONE;
  }

  return compare;
}

function getComparisonRange(fromKey, toKey, compareMode) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const dayCount = dayCountBetween(fromKey, toKey);

  if (!from || !to || dayCount <= 0 || compareMode === COMPARE_MODES.NONE) {
    return null;
  }

  if (compareMode === COMPARE_MODES.SAME_DATES_LAST_YEAR) {
    const previousFrom = sameDateLastYear(fromKey);
    const previousTo = sameDateLastYear(toKey);
    if (!canCompareSameDatesLastYear(fromKey, toKey)) return null;
    return {
      from: previousFrom.key,
      to: previousTo.key,
    };
  }

  if (isFullCalendarMonth(fromKey, toKey)) {
    const month = from.month === 1 ? 12 : from.month - 1;
    const year = from.month === 1 ? from.year - 1 : from.year;
    return {
      from: `${year}-${pad2(month)}-01`,
      to: `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`,
    };
  }

  return {
    from: addDays(fromKey, -dayCount),
    to: addDays(fromKey, -1),
  };
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
  const customerIdRaw = searchParams.get("customerId") || "";
  const customerId = CUSTOMER_ID_RE.test(customerIdRaw) ? customerIdRaw : "";
  const compareRaw = searchParams.get("compare") || "";

  if (preset !== "custom") {
    const range = getPresetRange(preset);
    return {
      preset,
      customerId,
      compare: normalizeCompareMode(compareRaw, preset, range.from, range.to),
      ...range,
    };
  }

  const defaults = getPresetRange("thisMonth");
  const rawFrom = searchParams.get("from") || "";
  const rawTo = searchParams.get("to") || "";

  const from = parseDateKey(rawFrom)?.key || defaults.from;
  const to = parseDateKey(rawTo)?.key || defaults.to;

  return {
    preset,
    from,
    to,
    customerId,
    compare: normalizeCompareMode(compareRaw, preset, from, to),
  };
}

function buildSearchParams(state) {
  const params = new URLSearchParams();
  const preset = PRESET_VALUES.has(state?.preset) ? state.preset : "thisMonth";
  const from = parseDateKey(state?.from)?.key || getPresetRange(preset).from;
  const to = parseDateKey(state?.to)?.key || getPresetRange(preset).to;
  const compare = normalizeCompareMode(state?.compare, preset, from, to);
  const customerId = CUSTOMER_ID_RE.test(String(state?.customerId || ""))
    ? String(state.customerId)
    : "";

  if (preset !== "thisMonth") params.set("preset", preset);
  if (preset === "custom") {
    params.set("from", from);
    params.set("to", to);
  }
  if (preset === "custom" || compare !== defaultCompareForPreset(preset)) {
    params.set("compare", compare);
  }
  if (customerId) params.set("customerId", customerId);

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

function formatShortDateLabel(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "";

  return new Date(parsed.utcMs).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
  });
}

function formatMonthLabel(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "";

  return new Date(parsed.utcMs).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  });
}

function formatBucketRangeLabel(fromKey, toKey) {
  if (!fromKey) return "";
  if (!toKey || fromKey === toKey) return formatDateLabel(fromKey);
  return `${formatDateLabel(fromKey)} to ${formatDateLabel(toKey)}`;
}

function formatBucketTickLabel(fromKey, toKey, granularity) {
  if (!fromKey) return "";

  if (granularity === "month") {
    const from = parseDateKey(fromKey);
    const to = parseDateKey(toKey);
    if (
      from &&
      to &&
      from.year === to.year &&
      from.month === to.month
    ) {
      return formatMonthLabel(fromKey);
    }
  }

  if (granularity === "week" && toKey && fromKey !== toKey) {
    return `${formatShortDateLabel(fromKey)}-${formatShortDateLabel(toKey)}`;
  }

  return formatShortDateLabel(fromKey);
}

function formatGranularityLabel(granularity) {
  if (granularity === "month") return "Monthly";
  if (granularity === "week") return "Weekly";
  return "Daily";
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

function formatCompactMoney(value) {
  const n = Number(value);
  const amount = Number.isFinite(n) ? n : 0;

  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return String(Math.round(amount));
  }
}

function getUserId(user) {
  return String(user?._id || user?.id || "");
}

function getCustomerLabel(customer) {
  if (!customer) return "";
  const name = String(customer.name || "").trim();
  const email = String(customer.email || "").trim();
  if (name && email) return `${name} - ${email}`;
  return name || email || getUserId(customer);
}

function formatPercent(value) {
  if (value === null || value === undefined) return "No comparison";
  const n = Number(value);
  if (!Number.isFinite(n)) return "No comparison";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(2)}%`;
}

function ChangeBadge({ value }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
        No comparison
      </span>
    );
  }

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
  comparisonEnabled,
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
      {comparisonEnabled ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ChangeBadge value={changePercent} />
          {previous ? (
            <span className="text-xs text-slate-500">Prev: {previous}</span>
          ) : null}
        </div>
      ) : null}
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
        Current open invoice balance today, not historical for the selected period.
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload || {};
  const currency = row.currency || "AED";
  const factor = row.minorUnitFactor || 100;

  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <div className="font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-slate-600">
        Current:{" "}
        <span className="font-semibold text-slate-900">
          {formatInvoiceMoneyMinor(row.currentAmountMinor, currency, factor)}
        </span>
      </div>
      <div className="mt-1 text-slate-600">
        {row.currentRangeLabel}
        {row.currentCount ? `, ${formatCount(row.currentCount)} invoice${
          row.currentCount === 1 ? "" : "s"
        }` : ""}
      </div>
      {row.comparisonEnabled ? (
        <>
          <div className="mt-2 text-slate-600">
            Prev:{" "}
            <span className="font-semibold text-slate-900">
              {formatInvoiceMoneyMinor(
                row.previousAmountMinor,
                currency,
                factor
              )}
            </span>
          </div>
          <div className="mt-1 text-slate-600">
            {row.previousRangeLabel}
            {row.previousCount ? `, ${formatCount(row.previousCount)} invoice${
              row.previousCount === 1 ? "" : "s"
            }` : ""}
          </div>
        </>
      ) : null}
    </div>
  );
}

function TrendChart({ trend, comparisonEnabled }) {
  const rows = Array.isArray(trend?.points) ? trend.points : [];
  const granularity = trend?.granularity || "day";

  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        No trend data for this range.
      </div>
    );
  }

  const chartRows = rows.map((row) => {
    const currency = row.currency || "AED";
    const factor = row.minorUnitFactor || 100;
    return {
      label: formatBucketTickLabel(
        row.currentFrom,
        row.currentTo,
        granularity
      ),
      currentRangeLabel: formatBucketRangeLabel(
        row.currentFrom,
        row.currentTo
      ),
      previousRangeLabel: formatBucketRangeLabel(
        row.previousFrom,
        row.previousTo
      ),
      currentAmountMinor: Number(row.currentAmountMinor || 0),
      previousAmountMinor:
        row.previousAmountMinor === null || row.previousAmountMinor === undefined
          ? null
          : Number(row.previousAmountMinor || 0),
      currentAmountMajor:
        minorToMajor(row.currentAmountMinor || 0, factor) ?? 0,
      previousAmountMajor:
        row.previousAmountMinor === null || row.previousAmountMinor === undefined
          ? null
          : minorToMajor(row.previousAmountMinor || 0, factor) ?? 0,
      currentCount: Number(row.currentCount || 0),
      previousCount: Number(row.previousCount || 0),
      comparisonEnabled: Boolean(
        comparisonEnabled && row.previousFrom && row.previousTo
      ),
      currency,
      minorUnitFactor: factor,
    };
  });
  const showComparison = chartRows.some((row) => row.comparisonEnabled);
  const chartWidth = Math.max(720, chartRows.length * (showComparison ? 44 : 30));
  const tickInterval =
    chartRows.length > 48 ? Math.ceil(chartRows.length / 16) : 0;

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <div className="h-[340px] min-w-full p-4" style={{ width: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              margin={{ top: 8, right: 12, left: 0, bottom: 12 }}
              barCategoryGap="22%"
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                minTickGap={16}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCompactMoney(value)}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                content={<TrendTooltip />}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "#475569" }}
              />
              {showComparison ? (
                <Bar
                  dataKey="previousAmountMajor"
                  name="Prev"
                  fill="#94a3b8"
                  radius={[5, 5, 0, 0]}
                  minPointSize={2}
                />
              ) : null}
              <Bar
                dataKey="currentAmountMajor"
                name="Current"
                fill="#2563eb"
                radius={[5, 5, 0, 0]}
                minPointSize={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        {formatGranularityLabel(granularity)} totals use issued invoices by
        invoice date.
      </div>
    </div>
  );
}

function CustomerFilter({ value, users, selectedCustomer, onChange }) {
  const optionMap = new Map();
  for (const user of users || []) {
    const userId = getUserId(user);
    if (!userId || user?.isAdmin) continue;
    optionMap.set(userId, user);
  }
  if (selectedCustomer?._id && !optionMap.has(String(selectedCustomer._id))) {
    optionMap.set(String(selectedCustomer._id), selectedCustomer);
  }

  const options = Array.from(optionMap.values()).sort((a, b) =>
    getCustomerLabel(a).localeCompare(getCustomerLabel(b))
  );

  return (
    <div>
      <label
        htmlFor="analytics-customer"
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
      >
        Customer
      </label>
      <select
        id="analytics-customer"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
      >
        <option value="">All Customers</option>
        {options.map((customer) => {
          const customerId = getUserId(customer);
          return (
            <option key={customerId} value={customerId}>
              {getCustomerLabel(customer)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function CompareFilter({ value, sameDatesLastYearDisabled, onChange }) {
  return (
    <div>
      <label
        htmlFor="analytics-compare"
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
      >
        Compare
      </label>
      <select
        id="analytics-compare"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
      >
        {COMPARE_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={
              option.value === COMPARE_MODES.SAME_DATES_LAST_YEAR &&
              sameDatesLastYearDisabled
            }
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CustomerPerformanceTable({ rows = [], onSelectCustomer }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        No customer performance data for this range.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Booked Sales</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Delivered</th>
              <th className="px-4 py-3 text-right">Invoiced</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const customer = row.customer || {};
              const customerId = getUserId(customer);
              const currency = row.currency || "AED";
              const factor = row.minorUnitFactor || 100;

              return (
                <tr
                  key={customerId}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => onSelectCustomer(customerId)}
                  title="Filter analytics by this customer"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {customer.name || "Unknown customer"}
                    </div>
                    {customer.email ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {customer.email}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatMajorMoney(row.bookedSales)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatCount(row.orderCount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatMajorMoney(row.deliveredValue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatInvoiceMoneyMinor(row.invoicedMinor, currency, factor)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatInvoiceMoneyMinor(row.collectedMinor, currency, factor)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-rose-700">
                    {formatInvoiceMoneyMinor(
                      row.currentOutstandingMinor,
                      currency,
                      factor
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkuPerformanceTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        No SKU performance data for this scope.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Units Sold</th>
              <th className="px-4 py-3 text-right">Product Revenue</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Avg Selling Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const currency = row.currency || "AED";

              return (
                <tr key={row.sku} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {row.sku || "-"}
                    </div>
                    {row.productName ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {row.productName}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatCount(row.unitsSold)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatMajorMoney(row.bookedRevenue, currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatCount(row.orderCount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatMajorMoney(row.averageSellingPrice, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readAnalyticsState(searchParams);
  const { preset, from, to, customerId, compare } = state;
  const fromParsed = parseDateKey(from);
  const toParsed = parseDateKey(to);
  const rangeIsValid = Boolean(
    fromParsed && toParsed && fromParsed.utcMs <= toParsed.utcMs
  );
  const sameDatesLastYearDisabled = !canCompareSameDatesLastYear(from, to);

  const {
    currentData: data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetAnalyticsOverviewQuery(
    { from, to, customerId, compare },
    { skip: !rangeIsValid }
  );
  const {
    data: customerData,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    error: customersError,
  } = useGetAnalyticsCustomersQuery(
    { from, to, customerId, limit: 10 },
    { skip: !rangeIsValid }
  );
  const {
    data: usersData,
  } = useGetUsersAdminQuery({
    page: 1,
    limit: 100,
    role: "user",
    sort: "name",
  });
  const {
    data: skuData,
    isLoading: isSkusLoading,
    isError: isSkusError,
    error: skusError,
  } = useGetAnalyticsSkusQuery(
    { from, to, customerId, limit: 10 },
    { skip: !rangeIsValid }
  );

  const overviewIsLoading = isLoading || (isFetching && !data);
  const metrics = useMemo(() => data?.metrics || {}, [data?.metrics]);
  const range = data?.range || {};
  const comparison = range?.comparison || {};
  const comparisonEnabled = Boolean(comparison.enabled);
  const requestedComparisonRange = getComparisonRange(from, to, compare);
  const visibleComparisonEnabled =
    comparisonEnabled || Boolean(requestedComparisonRange);
  const selectedCustomer = data?.scope?.customer || null;
  const customerRows = customerData?.customers || [];
  const customerOptions = usersData?.data || usersData?.items || [];
  const skuRows = skuData?.skus || [];
  const trend = data?.trend || {};
  const trendRows = Array.isArray(trend?.points) ? trend.points : [];
  const trendGranularity = trend?.granularity || "day";
  const selectedRangeLabel = `${formatDateLabel(from)} to ${formatDateLabel(to)}`;
  const selectedCustomerLabel = selectedCustomer
    ? getCustomerLabel(selectedCustomer)
    : "All Customers";
  const customerPerformanceTitle = selectedCustomer
    ? "Selected Customer Performance"
    : "Customer Performance";
  const customerPerformanceDescription = selectedCustomer
    ? `Performance for ${selectedCustomerLabel} in this period. Booked Sales includes delivery and extra fees. Outstanding is today's open balance.`
    : "Top customers by booked sales in this period, including delivery and extra fees. Outstanding is today's open balance.";
  const comparisonLabel =
    requestedComparisonRange || (comparison?.from && comparison?.to)
      ? `${formatDateLabel(
          requestedComparisonRange?.from || comparison.from
        )} to ${formatDateLabel(
          requestedComparisonRange?.to || comparison.to
        )}`
      : "";

  const kpis = useMemo(
    () => [
      {
        label: "Booked Sales",
        value: formatMajorMoney(metrics.bookedSales?.current),
        previous: formatMajorMoney(metrics.bookedSales?.previous),
        changePercent: metrics.bookedSales?.changePercent,
        comparisonEnabled: visibleComparisonEnabled,
        basis: "Non-cancelled orders by order created date, including delivery and extra fees.",
        accent: "violet",
      },
      {
        label: "Delivered Value",
        value: formatMajorMoney(metrics.deliveredValue?.current),
        previous: formatMajorMoney(metrics.deliveredValue?.previous),
        changePercent: metrics.deliveredValue?.changePercent,
        comparisonEnabled: visibleComparisonEnabled,
        basis: "Delivered orders by delivered date, including delivery and extra fees.",
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
        comparisonEnabled: visibleComparisonEnabled,
        basis: "Issued invoices by invoice date, including manual invoices.",
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
        comparisonEnabled: visibleComparisonEnabled,
        basis: "Payments received by payment date.",
        accent: "amber",
      },
      {
        label: "Orders",
        value: formatCount(metrics.orders?.current),
        previous: formatCount(metrics.orders?.previous),
        changePercent: metrics.orders?.changePercent,
        comparisonEnabled: visibleComparisonEnabled,
        basis: "Non-cancelled orders by order created date.",
        accent: "slate",
      },
    ],
    [metrics, visibleComparisonEnabled]
  );

  const updatePreset = (nextPreset) => {
    const nextCompare = defaultCompareForPreset(nextPreset);
    if (nextPreset === "custom") {
      setSearchParams(
        buildSearchParams({
          preset: "custom",
          from,
          to,
          customerId,
          compare: nextCompare,
        }),
        { replace: true }
      );
      return;
    }

    const nextRange = getPresetRange(nextPreset);
    setSearchParams(
      buildSearchParams({
        preset: nextPreset,
        customerId,
        compare: nextCompare,
        ...nextRange,
      }),
      { replace: true }
    );
  };

  const updateCustomDate = (key, value) => {
    const compareWasPresetDefault = compare === defaultCompareForPreset(preset);
    const nextCompare =
      preset !== "custom" && compareWasPresetDefault
        ? defaultCompareForPreset("custom")
        : compare;
    const next = {
      preset: "custom",
      from,
      to,
      customerId,
      [key]: value,
    };
    next.compare = normalizeCompareMode(
      nextCompare,
      next.preset,
      next.from,
      next.to
    );
    setSearchParams(buildSearchParams(next), { replace: true });
  };

  const updateCompare = (nextCompare) => {
    setSearchParams(
      buildSearchParams({
        preset,
        from,
        to,
        customerId,
        compare: nextCompare,
      }),
      { replace: true }
    );
  };

  const updateCustomer = (nextCustomerId) => {
    setSearchParams(
      buildSearchParams({
        preset,
        from,
        to,
        customerId: nextCustomerId,
        compare,
      }),
      { replace: true }
    );
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
            Business performance for the selected period.
          </div>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <FiCalendar className="h-3.5 w-3.5" />
          {range?.timezone || "Asia/Dubai"} calendar days
        </div>
      </div>

      <section className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end xl:grid-cols-[210px_210px_minmax(260px,1fr)_auto]">
          <div>
            <label
              htmlFor="analytics-preset"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Period
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

          <CompareFilter
            value={compare}
            sameDatesLastYearDisabled={sameDatesLastYearDisabled}
            onChange={updateCompare}
          />

          <CustomerFilter
            value={customerId}
            users={customerOptions}
            selectedCustomer={selectedCustomer}
            onChange={updateCustomer}
          />

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

        {preset === "custom" ? (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <FiCalendar className="h-3.5 w-3.5 text-slate-400" />
              Custom dates
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[190px_190px]">
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
                  onChange={(event) =>
                    updateCustomDate("from", event.target.value)
                  }
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
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            Selected period:{" "}
            <span className="font-semibold text-slate-700">
              {selectedRangeLabel}
            </span>
          </span>
          {comparisonLabel ? (
            <span>
              Prev period:{" "}
              <span className="font-semibold text-slate-700">
                {comparisonLabel}
              </span>
            </span>
          ) : null}
          <span>
            Customer scope:{" "}
            <span className="font-semibold text-slate-700">
              {selectedCustomerLabel}
            </span>
          </span>
          {isFetching && !isLoading ? <span>Updating...</span> : null}
        </div>

        {!rangeIsValid ? (
          <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
            From date must be before or equal to To date.
          </div>
        ) : null}
      </section>

      {overviewIsLoading ? (
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
                  Invoiced Value Over Time
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Issued invoices by invoice date, grouped by{" "}
                  {trendGranularity}.
                </div>
              </div>
              {trendRows.length ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {formatGranularityLabel(trendGranularity)}
                </div>
              ) : null}
            </div>
            <TrendChart
              trend={trend}
              comparisonEnabled={comparisonEnabled}
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {customerPerformanceTitle}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {customerPerformanceDescription}
                </div>
              </div>
              {isCustomersLoading ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Loading...
                </div>
              ) : null}
            </div>
            {isCustomersError ? (
              <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <ErrorMessage error={customersError} />
              </div>
            ) : (
              <CustomerPerformanceTable
                rows={customerRows}
                onSelectCustomer={updateCustomer}
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  SKU Performance
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Top SKUs by product-line revenue in this period using order
                  created date and current customer scope.
                </div>
              </div>
              {isSkusLoading ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Loading...
                </div>
              ) : null}
            </div>
            {isSkusError ? (
              <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <ErrorMessage error={skusError} />
              </div>
            ) : (
              <SkuPerformanceTable rows={skuRows} />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
