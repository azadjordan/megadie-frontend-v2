export const productTypeCatalogPath = productType => `/shop/catalog/${encodeURIComponent(productType)}`;

// Catalog browsing state belongs to the catalog, never to product API filters.
export function ribbonCatalogLocation(search = '') {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams();
  for (const key of ['material', 'page', 'q', 'searchPage']) {
    if (source.has(key)) params.set(key, source.get(key));
  }
  const query = params.toString();
  return {pathname: productTypeCatalogPath('Ribbon'), search: query ? `?${query}` : ''};
}

export function hasRibbonProductFilters(entry) {
  const filters = entry?.filters;
  return filters?.productType === 'Ribbon' &&
    typeof filters.categoryKeys === 'string' && Boolean(filters.categoryKeys) &&
    typeof filters.catalogCode === 'string' && filters.catalogCode === entry.code;
}
