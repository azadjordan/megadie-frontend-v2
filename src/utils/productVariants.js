export function productVariantOptions(meta, productType) {
  const options = meta?.variantsByProductType?.[productType] ?? meta?.variants ?? [];
  // Also cover older cached metadata during deployment.
  return productType === 'Double Face Tape' ? options.filter(value => value !== 'Paper Core') : options;
}
