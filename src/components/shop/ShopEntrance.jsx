import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiPackage } from 'react-icons/fi';
import ShopHeader from './ShopHeader';
import useShopScrollRestoration from '../../hooks/useShopScrollRestoration';
import { productTypeCatalogPath } from '../../utils/ribbonCatalogNavigation';

const PRODUCT_TYPE_IMAGES = {
  Ribbon: 'https://megadie.s3.eu-central-1.amazonaws.com/product+types/ribbon.png',
  'Creasing Matrix': 'https://megadie.s3.eu-central-1.amazonaws.com/product+types/creasing.png',
  'Double Face Tape': 'https://megadie.s3.eu-central-1.amazonaws.com/product+types/dft.png',
};

function ProductTypeImage({ type, priority }) {
  const [failed, setFailed] = useState(false);
  const src = PRODUCT_TYPE_IMAGES[type];

  return (
    <span className="flex aspect-video items-center justify-center overflow-hidden bg-slate-100">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width="640"
          height="360"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
        />
      ) : (
        <FiPackage aria-hidden="true" className="h-12 w-12 text-violet-400" />
      )}
    </span>
  );
}

export default function ShopEntrance({ productTypes, notice }) {
  useShopScrollRestoration();
  return (
    <section className="space-y-5">
      <ShopHeader title="Shop" description="Choose a product type to start browsing." breadcrumbs={[{label:'Home', to:'/'}, {label:'Shop'}]} />
      {notice && <p role="status" className="text-sm text-slate-600">{notice}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productTypes.map((type, index) => (
          <Link
            key={type}
            to={productTypeCatalogPath(type)}
            className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <ProductTypeImage type={type} priority={index === 0} />
            <span className="flex items-center justify-between gap-4 p-5">
              <span className="space-y-1"><span className="block text-xl font-semibold text-slate-900">{type}</span><span className="block text-sm text-slate-500">Browse products</span></span>
              <FiArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-violet-600" />
            </span>
          </Link>
        ))}
      </div>
      {productTypes.length === 0 && <p className="text-slate-600">No product types are available yet.</p>}
    </section>
  );
}
