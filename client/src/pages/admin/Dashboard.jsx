import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { vnd, fmtDateTime } from '../../utils/format.js';
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

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats/summary'),
      api.get('/admin/stats/revenue-by-day?days=7'),
      api.get('/admin/stats/revenue-by-movie'),
      api.get('/admin/orders/recent'),
    ])
      .then(([s, day, movie, orders]) =>
        setD({
          s: s.data,
          day: day.data.map((x) => ({ ...x, label: String(x.date).slice(5, 10) })),
          movie: movie.data,
          orders: orders.data,
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
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Vé bán ra hôm nay',
      value: d.s.ticketsToday,
      icon: Ticket,
      color: 'text-accent',
      bgColor: 'bg-accent/10 border-accent/20',
    },
    {
      label: 'Đơn chờ thanh toán',
      value: d.s.pendingOrders,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10 border-amber-400/20',
    },
    {
      label: 'Tỷ lệ lấp đầy (suất sắp tới)',
      value: `${d.s.fillRate}%`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
            <LayoutDashboard className="h-4 w-4" />
            <span>Trung tâm quản trị</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
            Tổng quan Dashboard
          </h1>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map(({ label, value, icon: Icon, color, bgColor }) => (
          <div
            key={label}
            className="card p-5 sm:p-6 bg-surface/90 border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {label}
              </span>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${bgColor}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-black text-white">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-6 bg-surface/90 border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display font-bold text-base text-white">Doanh thu 7 ngày qua</h2>
            <span className="text-xs text-slate-400">Đơn vị: VNĐ</span>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={d.day}>
              <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#64748b" textAnchor="end" fontSize={11} />
              <YAxis stroke="#64748b" tickFormatter={(v) => `${v / 1000}k`} fontSize={11} />
              <Tooltip
                formatter={(v) => [vnd(v), 'Doanh thu']}
                contentStyle={{
                  background: '#11172A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF4564"
                strokeWidth={3}
                dot={{ fill: '#FF4564', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#fff', stroke: '#FF4564', strokeWidth: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 bg-surface/90 border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display font-bold text-base text-white">Vé bán theo sự kiện</h2>
            <span className="text-xs text-slate-400">Số lượng vé</span>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={d.movie}>
              <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
              <XAxis dataKey="title" stroke="#64748b" tick={false} />
              <YAxis stroke="#64748b" allowDecimals={false} fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#11172A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
              />
              <Bar dataKey="ticketsSold" name="Số vé bán" fill="#FBBF24" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card p-6 bg-surface/90 border-white/10 overflow-hidden space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" />
            <h2 className="font-display font-bold text-base text-white">Đơn hàng mới nhất</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-xs uppercase font-bold text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-2">Mã đơn</th>
                <th className="py-3 px-2">Khách hàng</th>
                <th className="py-3 px-2">Tổng tiền</th>
                <th className="py-3 px-2">Trạng thái</th>
                <th className="py-3 px-2">Thời gian đặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-2 font-mono font-bold text-slate-200">#{o.orderCode}</td>
                  <td className="py-3 px-2 font-medium text-white">{o.fullName}</td>
                  <td className="py-3 px-2 font-mono font-bold text-amber-300">{vnd(o.totalAmount)}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        STATUS[o.status]?.[1] || 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {STATUS[o.status]?.[0] ?? o.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-400 text-xs">{fmtDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
