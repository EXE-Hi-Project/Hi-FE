import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CirclesFour,
  FirstAidKit,
  ForkKnife,
  Gift,
  Heart,
  Heartbeat,
  MagnifyingGlass,
  Ticket,
} from '@phosphor-icons/react';
import api from '../lib/api';
import { getUserFacingError } from '../lib/userFacingError';
import { useAuthStore } from '../store/authStore';
import { bestProductName, cleanProductTitle } from '../utils/affiliateDisplay';

type ProductFilter = 'all' | 'food' | 'outing' | 'care' | 'wellness' | 'gifts' | 'partner';
type GenderTheme = 'female' | 'male';
type FilterIcon = typeof CirclesFour;

interface AffiliateProduct {
  _id?: number;
  id?: number;
  name: string;
  description?: string;
  platform?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  price?: number;
  symptomCategory?: string;
  category?: string;
  symptomTags?: string[];
  phaseTags?: string[];
  goalTags?: string[];
  sourceName?: string;
  audience?: string;
}

interface VoucherOrder {
  _id: number;
  productName: string;
  productImageUrl?: string;
  sourceName?: string;
  totalAmount?: number;
  status: string;
  voucherCode?: string;
  voucherLink?: string;
  failureReason?: string;
}

const filters: Array<{ key: ProductFilter; label: string; hint: string; icon: FilterIcon }> = [
  { key: 'all', label: 'Tất cả', hint: 'Gợi ý phù hợp', icon: CirclesFour },
  { key: 'food', label: 'Ăn uống', hint: 'Cafe, nhà hàng', icon: ForkKnife },
  { key: 'outing', label: 'Đi chơi', hint: 'Phim, spa, giải trí', icon: Ticket },
  { key: 'care', label: 'Chăm sóc cơ thể', hint: 'Kỳ kinh, đau bụng', icon: FirstAidKit },
  { key: 'wellness', label: 'Sức khỏe mỗi ngày', hint: 'Thư giãn, phục hồi', icon: Heartbeat },
  { key: 'gifts', label: 'Quà theo dịp', hint: 'Sinh nhật, ngày lễ', icon: Gift },
  { key: 'partner', label: 'Cho người ấy', hint: 'Quan tâm tinh tế', icon: Heart },
];

const themes = {
  female: {
    page: 'from-pink-50 via-white to-sky-50',
    panel: 'border-rose-200 bg-white shadow-lg shadow-rose-200/35',
    softPanel: 'border-rose-200 bg-white shadow-sm shadow-rose-100/40',
    accentText: 'text-pink-600',
    accentBg: 'bg-rose-50',
    accentBorder: 'border-rose-200',
    cta: 'bg-[#eb477e] shadow-rose-200 hover:bg-pink-600',
    chipActive: 'border-rose-300 bg-rose-50 text-pink-600 shadow-sm shadow-rose-100',
    chipHover: 'hover:border-rose-200 hover:bg-white hover:text-pink-600',
    heroIcon: 'from-rose-50 to-violet-50 text-pink-500',
    title: 'Sản phẩm chăm sóc sức khỏe cho bạn',
    subtitle: 'Gợi ý dịu nhẹ cho kỳ kinh, chăm sóc hằng ngày, quà tặng và voucher ăn uống đi chơi từ đối tác.',
    statLabel: 'sản phẩm',
  },
  male: {
    page: 'from-sky-50 via-white to-blue-50',
    panel: 'border-sky-100 bg-white shadow-lg shadow-sky-100/60',
    softPanel: 'border-sky-100 bg-[#f8fcff] shadow-sm shadow-sky-100/40',
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    cta: 'bg-blue-600 shadow-blue-200 hover:bg-blue-700',
    chipActive: 'border-blue-200 bg-blue-50 text-blue-600',
    chipHover: 'hover:border-blue-100 hover:text-blue-600',
    heroIcon: 'from-blue-100 to-indigo-100 text-blue-500',
    title: 'Sản phẩm chăm sóc và quà tặng cho người ấy',
    subtitle: 'Một góc gọn để chọn đồ chăm sóc, voucher hẹn hò và món quà nhỏ giúp bạn quan tâm tinh tế hơn.',
    statLabel: 'gợi ý',
  },
} satisfies Record<GenderTheme, Record<string, string>>;

function normalize(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function productText(product: AffiliateProduct) {
  return normalize([
    product.name,
    product.description,
    product.category,
    product.symptomCategory,
    ...(product.symptomTags ?? []),
    ...(product.phaseTags ?? []),
    ...(product.goalTags ?? []),
  ].filter(Boolean).join(' '));
}

function matchesFilter(product: AffiliateProduct, filter: ProductFilter) {
  if (filter === 'all') return true;
  const text = productText(product);
  if (filter === 'food') return ['an uong', 'cafe', 'coffee', 'tra sua', 'nha hang', 'restaurant', 'food'].some((keyword) => text.includes(keyword));
  if (filter === 'outing') return ['di choi', 'giai tri', 'phim', 'cinema', 'spa', 'experience'].some((keyword) => text.includes(keyword));
  if (filter === 'care') return ['dau bung', 'kinh', 'chuom', 'mieng dan', 'tra gung', 'cham soc'].some((keyword) => text.includes(keyword));
  if (filter === 'wellness') return ['suc khoe', 'thu gian', 'ngu ngon', 'vitamin', 'phuc hoi', 'wellness'].some((keyword) => text.includes(keyword));
  if (filter === 'gifts') return ['qua', 'gift', 'sinh nhat', 'valentine', '8/3', '20/10', 'hoa'].some((keyword) => text.includes(keyword));
  return ['nguoi ay', 'partner', 'ban gai', 'ban trai', 'yeu thuong', 'quan tam'].some((keyword) => text.includes(keyword))
    || ['BOTH', 'FEMALE', 'MALE'].includes((product.audience ?? '').toUpperCase());
}

function money(value?: number) {
  if (!value || Number.isNaN(value)) return 'Chưa có giá';
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function isGotItVoucher(product: AffiliateProduct) {
  return (product.platform ?? '').toUpperCase() === 'GOTIT';
}

function voucherStatusText(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'DELIVERED') return 'Đã gửi';
  if (normalized === 'ISSUED') return 'Sẵn sàng';
  if (normalized === 'ISSUING') return 'Đang phát hành';
  if (normalized === 'PAYMENT_PENDING') return 'Chờ thanh toán';
  if (normalized === 'REFUND_REQUIRED') return 'Cần hỗ trợ';
  return status;
}

async function openAffiliateProduct(product: AffiliateProduct) {
  const productId = product._id ?? product.id;
  let targetUrl = product.affiliateUrl;
  try {
    if (productId) {
      const { data } = await api.post(`/affiliate-products/${productId}/click`);
      targetUrl = data.data?.affiliateUrl || targetUrl;
    }
  } catch {
    // Tracking is best-effort; users should still be able to open the product.
  }
  if (!targetUrl) {
    toast.error('Sản phẩm chưa có liên kết để mở');
    return;
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function ProductImage({ product, theme }: { product: AffiliateProduct; theme: (typeof themes)[GenderTheme] }) {
  const [failed, setFailed] = useState(false);
  const title = bestProductName(product);
  if (!product.imageUrl || failed) {
    return (
      <div className={`flex aspect-[4/3] w-full items-center justify-center rounded-[1.75rem] bg-gradient-to-br ${theme.heroIcon}`}>
        <span className="material-symbols-outlined text-5xl">{isGotItVoucher(product) ? 'local_activity' : 'local_mall'}</span>
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={title}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-[1.75rem] object-cover"
    />
  );
}

function ProductCard({
  product,
  themeName,
  onBuyVoucher,
  buying,
}: {
  product: AffiliateProduct;
  themeName: GenderTheme;
  onBuyVoucher: (product: AffiliateProduct) => void;
  buying: boolean;
}) {
  const theme = themes[themeName];
  const tags = [...(product.symptomTags ?? []), ...(product.phaseTags ?? []), ...(product.goalTags ?? [])].filter(Boolean).slice(0, 4);
  const title = bestProductName(product);
  const description = cleanProductTitle(product.description, 120);
  const gotItVoucher = isGotItVoucher(product);

  return (
    <article className={`group flex h-full flex-col rounded-[2rem] border p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${theme.panel}`}>
      <ProductImage product={product} theme={theme} />
      <div className="flex flex-1 flex-col p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase text-white">
            {gotItVoucher ? 'Got It' : product.platform ?? 'Sản phẩm'}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${theme.accentBg} ${theme.accentText}`}>
            {cleanProductTitle(product.sourceName || product.category, 34) || 'Cửa hàng'}
          </span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-lg font-black leading-snug text-slate-950">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
          {description || 'Sản phẩm đã được admin duyệt, đang chờ bổ sung mô tả chi tiết.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.length > 0 ? tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${theme.accentBg} ${theme.accentText}`}>
              {cleanProductTitle(tag, 28)}
            </span>
          )) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">Chăm sóc nhẹ nhàng</span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{gotItVoucher ? 'Mệnh giá voucher' : 'Giá sản phẩm'}</p>
            <p className="mt-1 text-xl font-black text-slate-950">{money(product.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => gotItVoucher ? onBuyVoucher(product) : openAffiliateProduct(product)}
            disabled={buying}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70 ${theme.cta}`}
          >
            {gotItVoucher ? (buying ? 'Đang tạo thanh toán...' : 'Mua voucher') : 'Mở sản phẩm'}
            <span className="material-symbols-outlined text-[18px]">{gotItVoucher ? 'payments' : 'open_in_new'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-3 shadow-sm">
      <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-100" />
      <div className="p-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-6 w-4/5 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="mt-6 h-11 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<ProductFilter>('all');
  const [search, setSearch] = useState('');
  const themeName: GenderTheme = user?.gender === 'male' ? 'male' : 'female';
  const theme = themes[themeName];
  const firstName = user?.name?.split(' ').pop() ?? 'bạn';

  const productsQuery = useQuery({
    queryKey: ['affiliate-products-marketplace'],
    queryFn: () => api.get('/affiliate-products', { params: { active: true, limit: 100 } }).then(({ data }) => data.products as AffiliateProduct[]),
    staleTime: 5 * 60_000,
  });

  const voucherOrdersQuery = useQuery({
    queryKey: ['voucher-orders-mine'],
    queryFn: () => api.get('/voucher-orders/mine').then(({ data }) => data.data as VoucherOrder[]),
    staleTime: 60_000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (product: AffiliateProduct) => {
      const productId = product._id ?? product.id;
      if (!productId) throw new Error('Voucher chưa có mã sản phẩm');
      return api.post('/voucher-orders/checkout', { productId, quantity: 1 }).then(({ data }) => data.data as { checkoutUrl?: string });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['voucher-orders-mine'] });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.error('Chưa nhận được link thanh toán voucher');
    },
    onError: (error: unknown) => {
      toast.error(getUserFacingError(error, 'Không tạo được thanh toán voucher'));
    },
  });

  useEffect(() => {
    const voucherOrderId = searchParams.get('voucherOrderId');
    const voucherCanceled = searchParams.get('voucherCanceled');
    if (!voucherOrderId && !voucherCanceled) return;
    if (voucherOrderId) {
      toast.success('Đã ghi nhận thanh toán. Voucher sẽ xuất hiện trong ví sau khi webhook hoàn tất.');
      void queryClient.invalidateQueries({ queryKey: ['voucher-orders-mine'] });
    }
    if (voucherCanceled) {
      toast('Bạn đã hủy thanh toán voucher.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('voucherOrderId');
    next.delete('voucherCanceled');
    setSearchParams(next, { replace: true });
  }, [queryClient, searchParams, setSearchParams]);

  const products = productsQuery.data ?? [];
  const voucherOrders = voucherOrdersQuery.data ?? [];
  const visibleProducts = useMemo(() => {
    const keyword = normalize(search.trim());
    return products.filter((product) => matchesFilter(product, activeFilter) && (!keyword || productText(product).includes(keyword)));
  }, [activeFilter, products, search]);

  const buyingProductId = checkoutMutation.variables?._id ?? checkoutMutation.variables?.id;

  return (
    <div className={`rounded-[2.5rem] border border-white/80 bg-gradient-to-br p-3 shadow-inner md:p-4 ${theme.page}`}>
      <div className="space-y-6">
        <section className={`rounded-2xl border p-4 shadow-sm backdrop-blur ${theme.panel}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={`text-xs font-black ${theme.accentText}`}>Hi Shop gợi ý</p>
              <h1 className="mt-1 max-w-3xl text-2xl font-black leading-tight text-slate-950 md:text-3xl">
                {theme.title}, {firstName}
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">{theme.subtitle}</p>
            </div>
            <span className={`w-fit rounded-xl px-3 py-2 text-xs font-black ${theme.accentBg} ${theme.accentText}`}>{products.length} {theme.statLabel}</span>
          </div>
        </section>

        <section data-guide="product-filters" className={`rounded-[2rem] border p-4 shadow-sm backdrop-blur ${theme.panel}`}>
          <div className="flex flex-col gap-3">
            <label className="relative min-w-0 w-full">
              <MagnifyingGlass size={20} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm túi chườm, quà, trà, voucher..."
                className={`h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 ${theme.accentBorder}`}
              />
            </label>
            <div className="scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-transparent flex max-w-full gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => {
                const active = activeFilter === filter.key;
                const FilterIcon = filter.icon;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-left transition active:translate-y-[1px] ${
                      active ? theme.chipActive : `border-slate-100 bg-white text-slate-500 ${theme.chipHover}`
                    }`}
                  >
                    <FilterIcon size={22} weight={active ? 'fill' : 'duotone'} className="shrink-0" />
                    <span>
                      <span className="block text-sm font-black">{filter.label}</span>
                      <span className="hidden text-xs font-semibold opacity-75 sm:block">{filter.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {voucherOrders.length > 0 ? (
          <section className={`rounded-[2rem] border p-5 shadow-sm backdrop-blur ${theme.softPanel}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.22em] ${theme.accentText}`}>Ví voucher</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Voucher Got It của bạn</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${theme.accentBg} ${theme.accentText}`}>
                {voucherOrders.length} voucher
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {voucherOrders.slice(0, 3).map((order) => (
                <article key={order._id} className="rounded-3xl border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-black text-slate-950">{order.productName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">{order.sourceName || 'Got It'} · {money(order.totalAmount)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${theme.accentBg} ${theme.accentText}`}>
                      {voucherStatusText(order.status)}
                    </span>
                  </div>
                  {order.voucherCode ? (
                    <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Mã voucher</p>
                      <p className="mt-1 break-all text-lg font-black">{order.voucherCode}</p>
                    </div>
                  ) : null}
                  {order.voucherLink ? (
                    <a href={order.voucherLink} target="_blank" rel="noreferrer" className={`mt-3 flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black text-white ${theme.cta}`}>
                      Mở voucher
                    </a>
                  ) : null}
                  {order.failureReason ? <p className="mt-3 text-xs font-semibold text-red-500">{order.failureReason}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div data-guide="product-list">
        {productsQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }, (_, index) => <ProductSkeleton key={index} />)}
          </div>
        ) : productsQuery.isError ? (
          <section className="rounded-[2rem] border border-red-100 bg-red-50 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400">error</span>
            <h2 className="mt-3 text-xl font-black text-red-700">Chưa tải được danh sách sản phẩm</h2>
            <p className="mt-2 text-sm font-semibold text-red-500">Bạn thử tải lại trang hoặc quay lại sau ít phút nhé.</p>
          </section>
        ) : visibleProducts.length === 0 ? (
          <section className={`rounded-[2rem] border bg-white p-8 text-center shadow-sm ${theme.accentBorder}`}>
            <span className={`material-symbols-outlined text-5xl ${theme.accentText}`}>inventory_2</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">Chưa có sản phẩm phù hợp</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Hãy thử chọn “Tất cả” hoặc đổi từ khóa tìm kiếm.</p>
            <button type="button" onClick={() => { setActiveFilter('all'); setSearch(''); }} className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Xem tất cả sản phẩm
            </button>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => {
              const productId = product._id ?? product.id;
              return (
                <ProductCard
                  key={productId ?? product.affiliateUrl ?? product.name}
                  product={product}
                  themeName={themeName}
                  onBuyVoucher={(selectedProduct) => checkoutMutation.mutate(selectedProduct)}
                  buying={checkoutMutation.isPending && buyingProductId === productId}
                />
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
