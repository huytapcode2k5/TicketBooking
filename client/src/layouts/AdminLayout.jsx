import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import NotificationBell from '../components/common/NotificationBell.jsx';
import { imgUrl, vnd } from '../utils/format.js';
import { 
  Ticket, 
  LayoutDashboard, 
  Film, 
  Armchair, 
  Calendar, 
  Tag, 
  Users, 
  Receipt, 
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Bell,
  X,
  ChevronRight
} from 'lucide-react';

const links = [
  { to: '/admin', label: 'Tổng quan Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag },
  { to: '/admin/events', label: 'Quản lý sự kiện & phim', icon: Film },
  { to: '/admin/venues', label: 'Cụm rạp & sơ đồ ghế', icon: Armchair },
  { to: '/admin/showtimes', label: 'Quản lý suất chiếu', icon: Calendar },
  { to: '/admin/coupons', label: 'Voucher & Combo', icon: Tag },
  { to: '/admin/users', label: 'Khách hàng & nhân sự', icon: Users },
  { to: '/admin/payments', label: 'Đối soát & hoàn tiền', icon: Receipt },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  // Lắng nghe sự kiện khách đặt vé thành công theo thời gian thực
  useSocketEvent('admin:order_success', (data) => {
    const toastId = Date.now();
    const newToast = { id: toastId, ...data };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    // Âm thanh thông báo nhẹ nhàng qua Web Audio API (không phụ thuộc file ngoài)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* Bỏ qua nếu trình duyệt chặn autoplay audio */
    }

    // Tự động đóng toast sau 10 giây
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 10000);
  });

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="min-h-screen flex bg-bg text-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 bg-surface/95 border-r border-white/10 p-5 hidden md:flex flex-col justify-between">
        <div className="space-y-6">
          {/* Admin Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                Ticket<span className="text-accent">Hub</span>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded">
                  ADMIN
                </span>
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all select-none ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Info & Back to Client Storefront */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5">
              <div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={imgUrl(user.avatarUrl)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  user.fullName?.charAt(0) || 'A'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại trang người dùng</span>
          </Link>
        </div>
      </aside>

      {/* Admin Content Area with Top Utility Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-surface/40 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Hệ thống Quản trị & Điều hành TicketHub
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <Link
              to="/profile"
              className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5"
            >
              <span>{user?.fullName}</span>
            </Link>
          </div>
        </header>

        {/* Main View */}
        <main className="flex-1 p-6 lg:p-8 overflow-x-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Floating Realtime Order Success Toasts (Hiển thị thông báo khi khách đặt vé thành công) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto p-4 rounded-2xl bg-surface border border-emerald-500/30 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    Khách đặt vé mới thành công!
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Đơn #{t.orderCode}
                  </span>
                </div>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-0.5 pl-9">
              <p className="font-semibold text-slate-100">{t.fullName}</p>
              <p className="text-slate-400 line-clamp-1">{t.movieTitle} ({t.ticketCount} vé)</p>
              <p className="font-mono font-bold text-amber-300">{vnd(t.totalAmount)}</p>
            </div>

            <div className="pt-1 pl-9 flex items-center gap-2">
              <button
                onClick={() => {
                  removeToast(t.id);
                  navigate('/admin/orders');
                }}
                className="btn-primary !py-1.5 !px-3 text-[11px] font-semibold inline-flex items-center gap-1"
              >
                <span>Xem đơn hàng</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
