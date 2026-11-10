import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios.js';
import TicketCard from '../components/ticket/TicketCard.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { Ticket, Calendar, CheckCircle2, XCircle, Compass, AlertCircle } from 'lucide-react';

const TABS = [
  { k: 'upcoming', label: 'Vé sắp xem', icon: Calendar },
  { k: 'used', label: 'Đã dùng / Đã qua', icon: CheckCircle2 },
  { k: 'cancelled', label: 'Đã hủy', icon: XCircle },
];

export default function MyTickets() {
  const [tickets, setTickets] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [error, setError] = useState('');

  const load = useCallback(
    () => api.get('/tickets/me').then((r) => setTickets(r.data)).catch((e) => setError(e.message)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const group = (t) =>
    t.status === 'CANCELLED' ? 'cancelled' : t.status === 'USED' || new Date(t.endTime).getTime() < now ? 'used' : 'upcoming';

  const refund = async (t) => {
    if (!window.confirm(`Hủy toàn bộ vé của đơn #${t.orderCode}? Chỉ hoàn được khi còn hơn 24 giờ trước giờ chiếu.`)) return;
    try {
      await api.post(`/orders/${t.orderId}/refund`, {});
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!tickets && !error) return <Spinner label="Đang tải danh sách vé..." />;
  const list = (tickets ?? []).filter((t) => group(t) === tab);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
            <Ticket className="h-4 w-4" />
            <span>Ví vé điện tử</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Vé của tôi</h1>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface2/80 border border-white/10">
          {TABS.map(({ k, label, icon: Icon }) => {
            const active = tab === k;
            return (
              <button
                key={k}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-accent to-rose-600 text-white shadow-glow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setTab(k)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {list.length === 0 && (
        <div className="card py-16 px-6 text-center space-y-4">
          <Ticket className="h-12 w-12 text-slate-600 mx-auto stroke-[1.5]" />
          <h3 className="font-display font-bold text-lg text-slate-200">
            Chưa có vé trong mục này
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Khám phá các bộ phim bom tấn và sự kiện giải trí mới nhất để đặt chỗ ngay hôm nay.
          </p>
          <div className="pt-2">
            <Link to="/" className="btn-primary !px-5 !py-2.5 text-xs sm:text-sm shadow-glow-sm inline-flex items-center gap-2">
              <Compass className="h-4 w-4" />
              <span>Khám phá phim & sự kiện</span>
            </Link>
          </div>
        </div>
      )}

      {/* Ticket Cards */}
      <div className="space-y-5">
        {list.map((t) => (
          <TicketCard key={t.ticketId} t={t} canRefund={tab === 'upcoming'} onRefund={refund} />
        ))}
      </div>
    </div>
  );
}
