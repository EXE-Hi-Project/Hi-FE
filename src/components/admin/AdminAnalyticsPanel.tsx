import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendUp,
  Mouse,
  ChartLineUp,
  Funnel,
  Clock,
  Browser,
  UsersThree,
} from '@phosphor-icons/react';
import api from '../../lib/api';
import Spinner from '../ui/Spinner';

interface OverviewStats {
  totalSessions: number;
  convertedSessions: number;
  conversionRate: number;
  totalEvents: number;
  totalClicks: number;
  totalPageViews: number;
  dailyActiveUsersToday?: number;
  dailyActiveUsers7dAvg?: number;
}

interface TrafficPoint {
  date: string;
  label: string;
  pageViews: number;
}

interface DailyActiveUserPoint {
  date: string;
  label: string;
  activeUsers: number;
}

interface HourlyPoint {
  hour: string;
  pageViews: number;
}

interface TopPageItem {
  page: string;
  views: number;
}

interface ClickRankingItem {
  target: string;
  text: string;
  clicks: number;
  percentage: number;
}

interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
}

interface AnalyticsStats {
  overview: OverviewStats;
  trafficTrend: TrafficPoint[];
  dailyActiveUsersTrend?: DailyActiveUserPoint[];
  hourlyTraffic: HourlyPoint[];
  topPages: TopPageItem[];
  clickRanking: ClickRankingItem[];
  conversionFunnel: FunnelStep[];
}

export default function AdminAnalyticsPanel() {
  const { data, isLoading, error } = useQuery<AnalyticsStats>({
    queryKey: ['admin-analytics-stats'],
    queryFn: () => api.get('/admin/analytics/stats').then((res) => res.data),
    refetchInterval: 120000,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-3 text-xs text-slate-400">Đang tính toán số liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-rose-600">
        <p className="font-bold">Không thể tải báo cáo phân tích</p>
        <p className="text-xs mt-1">Vui lòng kiểm tra lại kết nối mạng hoặc server.</p>
      </div>
    );
  }

  const { overview, trafficTrend, dailyActiveUsersTrend = [], hourlyTraffic, topPages, clickRanking, conversionFunnel } = data;
  const dailyActiveUsersByDate = new Map(dailyActiveUsersTrend.map((point) => [point.date, point.activeUsers]));
  const trafficAndUsersTrend = trafficTrend.map((point) => ({
    ...point,
    activeUsers: dailyActiveUsersByDate.get(point.date) ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* ─── CARDS OVERVIEW ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Unique Sessions */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100/50 text-sky-500">
            <Browser size={24} weight="bold" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {overview.totalSessions.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Khách truy cập (Sessions)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Số phiên duyệt web duy nhất</p>
          </div>
        </div>

        {/* Card 2: Total Clicks */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-100/50 text-violet-500">
            <Mouse size={24} weight="bold" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {overview.totalClicks.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Số lượt Click chuột</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tổng số lần tương tác nút bấm</p>
          </div>
        </div>

        {/* Card 3: Conversion Rate */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 bg-gradient-to-br from-pink-50/20 via-white to-violet-50/20 border-pink-100/50">
          <div className="p-3 rounded-xl bg-pink-50 border border-pink-100/50 text-[#eb477e]">
            <TrendUp size={24} weight="bold" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#eb477e] tracking-tight leading-none">
              {overview.conversionRate}%
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Tỷ lệ Chuyển đổi Chung</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {overview.convertedSessions} / {overview.totalSessions} sessions kích hoạt thành công
            </p>
          </div>
        </div>

        <div className="bg-white border border-emerald-100/70 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100/70 text-emerald-500">
            <UsersThree size={24} weight="bold" />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600 tracking-tight leading-none">
              {(overview.dailyActiveUsersToday ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Người dùng hôm nay</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              TB 7 ngày: {overview.dailyActiveUsers7dAvg ?? 0} user đăng nhập
            </p>
          </div>
        </div>
      </div>

      {/* ─── ROW 1: FUNNEL & DAILY TRAFFIC ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Funnel size={18} className="text-[#eb477e]" weight="bold" />
            <h3 className="text-sm font-bold text-slate-800">Phễu chuyển đổi (Conversion Funnel)</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-5">
            Hiệu quả chuyển đổi từng bước từ khách truy cập thành người dùng đã thiết lập chu kỳ.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={conversionFunnel}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="step" type="category" width={120} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(235,71,126,0.02)' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: 11 }}
                  formatter={(value, name, props) => {
                    if (name === 'percentage') return [`${value}%`, 'Tỷ lệ so với tổng'];
                    if (name === 'count') return [`${props.payload.count} sessions`, 'Số lượng'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="percentage" fill="#eb477e" radius={[0, 6, 6, 0]} barSize={24}>
                  {conversionFunnel.map((_, index) => {
                    const colors = ['#a78bfa', '#8b5cf6', '#a78bfa', '#f472b6', '#eb477e'];
                    return <Cell key={`cell-${index}`} fill={colors[index] || '#eb477e'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Page Views Trend */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <ChartLineUp size={18} className="text-sky-500" weight="bold" />
            <h3 className="text-sm font-bold text-slate-800">Traffic & DAU (30 ngày gần đây)</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-5">
            Lượt xem trang và số user đã đăng nhập có hoạt động trong từng ngày.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficAndUsersTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9e8f8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#c9e8f8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: 11 }}
                  formatter={(value, name) => {
                    if (name === 'Người dùng hoạt động') return [`${value} user`, 'Người dùng hoạt động'];
                    return [`${value} lượt`, 'Lượt xem'];
                  }}
                />
                <Area type="monotone" dataKey="pageViews" name="Lượt xem" stroke="#60a5fa" strokeWidth={2} fill="url(#pvGrad)" />
                <Area type="monotone" dataKey="activeUsers" name="Người dùng hoạt động" stroke="#10b981" strokeWidth={2} fill="url(#dauGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: PEAK HOURS & TOP PAGES ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Peak Hours PV */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={18} className="text-amber-500" weight="bold" />
            <h3 className="text-sm font-bold text-slate-800">Mật độ xem trang theo Giờ</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-5">
            Xác định khung giờ người dùng hoạt động tích cực nhất trong ngày (giờ Việt Nam).
          </p>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTraffic} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(167,139,250,0.04)' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: 11 }}
                />
                <Bar dataKey="pageViews" name="Lượt xem" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Browser size={18} className="text-emerald-500" weight="bold" />
              <h3 className="text-sm font-bold text-slate-800">Trang xem nhiều nhất</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Xếp hạng lượt truy cập theo các đường dẫn.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-56 pr-1">
            {topPages.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black text-slate-400 w-5 text-center">{idx + 1}</span>
                  <span className="text-xs font-semibold text-slate-700 truncate block bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                    {item.page}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  {item.views.toLocaleString()} lượt
                </span>
              </div>
            ))}
            {topPages.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-10">Chưa có dữ liệu lượt xem trang</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── ROW 3: CLICK HEATMAP/RANKING ─────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <Mouse size={18} className="text-[#eb477e]" weight="bold" />
          <h3 className="text-sm font-bold text-slate-800">Xếp hạng nhấp chuột nhiều nhất (Click Ranking)</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          Theo dõi các nút bấm, nút kêu gọi hành động (CTAs), hoặc liên kết nào nhận được nhiều tương tác nhất từ khách truy cập.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Hạng</th>
                <th className="py-3 px-4">Tên phần tử / Nút bấm</th>
                <th className="py-3 px-4">Định danh phần tử (Element ID / Target)</th>
                <th className="py-3 px-4 text-center">Số lượt Click</th>
                <th className="py-3 px-4 text-right">Tỷ lệ tương tác</th>
              </tr>
            </thead>
            <tbody>
              {clickRanking.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-black text-slate-400 text-center">{idx + 1}</td>
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    <span className="inline-block px-2 py-1 rounded bg-[#fdf0f4] text-[#eb477e] border border-[#fdf0f4]">
                      {item.text}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 max-w-xs truncate">{item.target}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">
                    {item.clicks.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-bold text-slate-600">{item.percentage}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#a78bfa] to-[#eb477e]"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {clickRanking.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Chưa ghi nhận sự kiện click chuột nào từ người dùng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
