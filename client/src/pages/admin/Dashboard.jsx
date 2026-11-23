import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { vnd, fmtDateTime, fmtTime, dayKey } from '../../utils/format.js';
import { 
  DollarSign, 
  Ticket, 
  Clock, 
  TrendingUp, 
  Receipt, 
  AlertCircle,
  LayoutDashboard
} from 'lucide-react';

const STATUS = {
  PAID: ['Đã thanh toán', 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'],
  PENDING: ['Chờ thanh toán', 'bg-amber-400/15 text-amber-300 border border-amber-400/30'],
  EXPIRED: ['Hết hạn', 'bg-slate-500/15 text-slate-400 border border-slate-500/30'],
  CANCELLED: ['Đã hủy', 'bg-rose-500/15 text-rose-300 border border-rose-500/30'],
  REFUNDED: ['Đã hoàn tiền', 'bg-blue-500/15 text-blue-300 border border-blue-500/30'],
};

// Tên trong ngoặc kép là tên ngắn của sự kiện ("Hạ Vàng"), không có thì cắt bớt
const shortTitle = (t = '') => {
  const s = t.match(/"([^"]+)"/)?.[1] ?? t;
  return s.length > 18 ? `${s.slice(0, 17).trimEnd()}…` : s;
};

// "DD/MM" theo giờ Việt Nam
const shortDay = (d) => {
  const k = dayKey(d);
  return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
};

// Màu theo mức lấp đầy: gần hết vé đỏ, khá vàng, còn nhiều xanh
const fillColor = (rate) => (rate >= 90 ? '#FF4564' : rate >= 50 ? '#FBBF24' : '#60A5FA');

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats/summary'),
      api.get('/admin/stats/revenue-by-day?days=7'),
      api.get('/admin/stats/revenue-by-movie'),
      api.get('/admin/orders/recent'),
      api.get('/admin/stats/fill-rate?limit=10'),
    ])
      .then(([s, day, movie, orders, fill]) =>
        setD({
          s: s.data,
          day: day.data.map((x) => ({ ...x, label: String(x.date).slice(5, 10) })),
          movie: movie.data,
          orders: orders.data,
          fill: fill.data.map((x) => ({
            ...x,
            label: `${shortTitle(x.movieTitle)} · ${shortDay(x.startTime)} ${fmtTime(x.startTime)}`,
          })),
        })
      )
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="error-box">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span>{error}</span>
      </div>
    );
  if (!d) return <Spinner label="Đang tải dữ liệu báo cáo thống kê..." />;

  const statCards = [
    {
      label: 'Doanh thu hôm nay',
      value: vnd(d.s.revenueToday),
      sub: 'Đơn hàng đã thanh toán',
      icon: DollarSign,
    },
    {
      label: 'Vé bán ra hôm nay',
      value: d.s.ticketsToday,
      sub: 'Suất chiếu trong ngày',
      icon: Ticket,
    },
    {
      label: 'Đơn chờ thanh toán',
      value: d.s.pendingOrders,
      sub: 'Đang giữ chỗ',
      icon: Clock,
      highlight: d.s.pendingOrders > 0,
    },
    {
      label: 'Tỷ lệ lấp đầy ghế',
      value: `${d.s.fillRate}%`,
      sub: 'Suất chiếu sắp tới',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
            <span>Khu vực quản trị</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">
            Tổng quan hệ thống
          </h1>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, highlight }) => (
          <div
            key={label}
            className="rounded-xl p-5 bg-surface2/30 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                {label}
              </span>
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2.5 font-mono text-2xl font-bold text-white tracking-tight">
              {value}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
              {highlight && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
              <span>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid xl:grid-cols-2 gap-5">
        <div className="rounded-xl p-5 bg-surface2/30 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-semibold text-sm text-white">Doanh thu 7 ngày qua</h2>
            <span className="text-[11px] text-slate-500">Đơn vị: VNĐ</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={d.day}>
              <CartesianGrid stroke="#ffffff08" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" textAnchor="end" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" tickFormatter={(v) => `${v / 1000}k`} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v) => [vnd(v), 'Doanh thu']}
                contentStyle={{
                  background: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#F43F5E"
                strokeWidth={2}
                dot={{ fill: '#F43F5E', strokeWidth: 1, r: 3 }}
                activeDot={{ r: 5, fill: '#fff', stroke: '#F43F5E', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5 bg-surface2/30 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-semibold text-sm text-white">Vé bán theo sự kiện</h2>
            <span className="text-[11px] text-slate-500">Số lượng vé</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.movie}>
              <CartesianGrid stroke="#ffffff08" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="title" stroke="#64748b" tick={false} axisLine={false} />
              <YAxis stroke="#64748b" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                }}
              />
              <Bar dataKey="ticketsSold" name="Số vé bán" fill="#38BDF8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fill rate per upcoming showtime */}
      <div className="rounded-xl p-5 bg-surface2/30 border border-white/5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <h2 className="font-semibold text-sm text-white">Tỷ lệ lấp đầy suất chiếu sắp tới</h2>
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" /> ≥ 90%</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" /> 50–89%</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" /> &lt; 50%</span>
          </div>
        </div>
        {d.fill.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">Chưa có suất nào sắp diễn ra.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, d.fill.length * 34 + 30)}>
            <BarChart data={d.fill} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke="#ffffff08" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={260} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#ffffff05' }}
                formatter={(v, _n, p) => [`${v}% (${p.payload.soldSeats}/${p.payload.totalSeats} ghế)`, 'Lấp đầy']}
                labelFormatter={(_l, p) => p?.[0]?.payload?.movieTitle ?? ''}
                contentStyle={{
                  background: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                }}
              />
              <Bar dataKey="fillRate" radius={[0, 4, 4, 0]} barSize={16}>
                {d.fill.map((x) => (
                  <Cell key={x.showtimeId} fill={fillColor(x.fillRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-xl p-5 bg-surface2/30 border border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" />
            <h2 className="font-semibold text-sm text-white">Đơn hàng mới nhất</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] font-medium text-slate-400 border-b border-white/5">
              <tr>
                <th className="py-2.5 px-3">Mã đơn</th>
                <th className="py-2.5 px-3">Khách hàng</th>
                <th className="py-2.5 px-3">Tổng tiền</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-200">#{o.orderCode}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{o.fullName}</td>
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-200">{vnd(o.totalAmount)}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${
                        STATUS[o.status]?.[1] || 'bg-white/5 text-slate-300'
                      }`}
                    >
                      {STATUS[o.status]?.[0] ?? o.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">{fmtDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
