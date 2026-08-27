import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { bestProductName, cleanProductTitle } from '../../utils/affiliateDisplay';
import { openExternalUrl } from '../../lib/desktop';

interface AffiliateProduct {
  _id: number;
  name: string;
  description?: string;
  platform?: string;
  affiliateUrl: string;
  imageUrl?: string;
  price?: number;
  symptomTags?: string[];
  phaseTags?: string[];
  goalTags?: string[];
  sourceName?: string;
}

const RECOMMENDATION_LIMIT = 8;
const COMPACT_VISIBLE_COUNT = 4;

function money(value?: number) {
  if (!value) return '';
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

async function openAffiliateProduct(product: AffiliateProduct) {
  let targetUrl = product.affiliateUrl;
  try {
    const { data } = await api.post(`/affiliate-products/${product._id}/click`);
    targetUrl = data.data?.affiliateUrl || targetUrl;
  } catch {
    // Tracking is best-effort; users should still be able to open the product.
  }
  await openExternalUrl(targetUrl);
}

export default function AffiliateRecommendations({
  symptomCategory,
  phase,
  compact = false,
}: {
  symptomCategory?: string;
  phase?: string;
  compact?: boolean;
}) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const productsQuery = useQuery({
    queryKey: ['affiliate-recommendations', symptomCategory, phase],
    queryFn: () => api.get('/affiliate-products/recommendations', {
      params: { symptomCategory, phase, limit: RECOMMENDATION_LIMIT },
    }).then(({ data }) => data.products as AffiliateProduct[]),
    staleTime: 5 * 60_000,
  });

  const fallbackProductsQuery = useQuery({
    queryKey: ['affiliate-recommendation-fallbacks'],
    queryFn: () => api.get('/affiliate-products', {
      params: { active: true, limit: 12 },
    }).then(({ data }) => data.products as AffiliateProduct[]),
    enabled: !productsQuery.isLoading && (productsQuery.data?.length ?? 0) < RECOMMENDATION_LIMIT,
    staleTime: 5 * 60_000,
  });

  const recommendedProducts = productsQuery.data ?? [];
  const fallbackProducts = fallbackProductsQuery.data ?? [];
  const products = [...recommendedProducts, ...fallbackProducts]
    .filter((product, index, list) => {
      const key = product._id ?? product.affiliateUrl;
      return list.findIndex((item) => (item._id ?? item.affiliateUrl) === key) === index;
    })
    .slice(0, RECOMMENDATION_LIMIT);
  const visibleProducts = useMemo(() => {
    if (!compact) return products;
    return products.slice(carouselIndex, carouselIndex + COMPACT_VISIBLE_COUNT);
  }, [carouselIndex, compact, products]);
  const canSlide = compact && products.length > COMPACT_VISIBLE_COUNT;
  const isLoading = productsQuery.isLoading || (recommendedProducts.length < RECOMMENDATION_LIMIT && fallbackProductsQuery.isLoading);

  if (isLoading || products.length === 0) return null;

  return (
    <section className="rounded-[2rem] border border-pink-100/80 bg-gradient-to-br from-white via-pink-50/70 to-sky-50/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-500">Hi gợi ý chăm sóc</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Sản phẩm hỗ trợ & quà tặng tinh tế</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Gợi ý đồ chăm sóc khi tới kỳ, món nhỏ dịp lễ hoặc quà quan tâm nhẹ nhàng. Không thay thế tư vấn y khoa.
          </p>
        </div>
        <Link
          to="/products"
          className="rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-black text-pink-600 shadow-sm transition hover:bg-pink-50"
        >
          Xem tất cả sản phẩm
        </Link>
      </div>
      {canSlide && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCarouselIndex((value) => Math.max(value - 1, 0))}
            disabled={carouselIndex === 0}
            className="grid size-10 place-items-center rounded-full border border-pink-100 bg-white text-pink-500 shadow-sm transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Sản phẩm trước"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => setCarouselIndex((value) => Math.min(value + 1, products.length - COMPACT_VISIBLE_COUNT))}
            disabled={carouselIndex >= products.length - COMPACT_VISIBLE_COUNT}
            className="grid size-10 place-items-center rounded-full border border-pink-100 bg-white text-pink-500 shadow-sm transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Sản phẩm sau"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      )}

      <div className={`mt-5 grid gap-4 ${compact ? 'sm:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {visibleProducts.map((product) => (
          <article key={product._id} className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} loading="lazy" className={`${compact ? 'aspect-[5/3]' : 'aspect-[4/3]'} w-full object-cover`} />
            ) : (
              <div className={`flex ${compact ? 'aspect-[5/3]' : 'aspect-[4/3]'} w-full items-center justify-center bg-gradient-to-br from-pink-100 to-sky-100 text-pink-400`}>
                <span className="material-symbols-outlined text-5xl">local_mall</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-pink-50 px-3 py-1 text-[10px] font-black uppercase text-pink-600">{product.platform ?? 'Sản phẩm'}</span>
                {product.price ? <span className="text-xs font-black text-slate-600">{money(product.price)}</span> : null}
              </div>
              <h3 className="mt-3 line-clamp-2 text-base font-black text-slate-900">{bestProductName(product)}</h3>
              {!compact && product.description && <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">{cleanProductTitle(product.description, 110)}</p>}
              <div className={`${compact ? 'mt-2' : 'mt-3'} flex flex-wrap gap-1.5`}>
                {[...(product.symptomTags ?? []), ...(product.phaseTags ?? []), ...(product.goalTags ?? [])].slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{tag}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openAffiliateProduct(product)}
                className="hi-btn-primary mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black"
              >
                Xem sản phẩm
              </button>
              <p className="mt-2 text-[10px] font-semibold text-slate-400">Cửa hàng: {cleanProductTitle(product.sourceName || product.platform, 40) || 'Đang cập nhật'}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
