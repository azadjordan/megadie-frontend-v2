// src/hooks/useShopQueryState.js
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_PRODUCT_TYPE = "Ribbon";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 100;

// These are not “filters”
const CONTROL_KEYS = new Set(["productType", "page", "limit", "sort"]);

const parseList = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const toCsv = (arr) => {
  const clean = (arr || [])
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean);
  return clean.length ? clean.join(",") : "";
};

export default function useShopQueryState(options = {}) {
  const defaultProductType = options.defaultProductType || DEFAULT_PRODUCT_TYPE;
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;

  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const productType = searchParams.get("productType") || defaultProductType;

    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    const page = Math.max(parseInt(pageRaw || DEFAULT_PAGE, 10) || DEFAULT_PAGE, 1);

    const limitParsed = parseInt(limitRaw || defaultLimit, 10) || defaultLimit;
    const limit = Math.min(Math.max(limitParsed, 1), MAX_LIMIT);

    const sort = searchParams.get("sort") || "";

    // Everything else becomes filters (CSV multi-values)
    const filters = {};
    for (const [key, value] of searchParams.entries()) {
      if (CONTROL_KEYS.has(key)) continue;
      const list = parseList(value);
      if (list.length) filters[key] = list;
    }

    return { productType, page, limit, sort, filters };
  }, [searchParams, defaultProductType, defaultLimit]);

  const setPage = useCallback(
    (nextPage) => {
      const p = Math.max(Number(nextPage) || 1, 1);
      const next = new URLSearchParams(searchParams);
      next.set("page", String(p));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setProductType = useCallback(
    (nextProductType) => {
      const next = new URLSearchParams(searchParams);
      next.set("productType", String(nextProductType || defaultProductType));
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, defaultProductType]
  );

  const toggleFilterValue = useCallback(
    (key, value, multi = true) => {
      if (!key || CONTROL_KEYS.has(key)) return;

      const v = String(value || "").trim();
      if (!v) return;

      const curr = parseList(searchParams.get(key));

      let nextList = [];
      if (multi) {
        nextList = curr.includes(v) ? curr.filter((x) => x !== v) : [...curr, v];
      } else {
        const isSelected = curr.length === 1 && curr[0] === v;
        nextList = isSelected ? [] : [v];
      }

      const next = new URLSearchParams(searchParams);
      const csv = toCsv(nextList);

      if (csv) next.set(key, csv);
      else next.delete(key);

      next.set("page", "1"); // reset pagination on filter change
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setFilter = useCallback(
    (key, values) => {
      if (!key || CONTROL_KEYS.has(key)) return;

      const next = new URLSearchParams(searchParams);
      const csv = toCsv(values);

      if (csv) next.set(key, csv);
      else next.delete(key);

      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);

    for (const k of Array.from(next.keys())) {
      if (!CONTROL_KEYS.has(k)) next.delete(k);
    }

    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // This is what you pass into useGetProductsQuery(...)
  const productsQueryParams = useMemo(() => {
    const params = {
      productType: state.productType,
      page: state.page,
      limit: state.limit,
    };

    if (state.sort) params.sort = state.sort;

    // Encode multi-values as CSV (backend supports parseStringList)
    for (const [k, arr] of Object.entries(state.filters)) {
      const csv = toCsv(arr);
      if (csv) params[k] = csv;
    }

    return params;
  }, [state]);

  return {
    ...state,
    productsQueryParams,
    setPage,
    setProductType,
    toggleFilterValue,
    setFilter,
    clearAllFilters,
  };
}
