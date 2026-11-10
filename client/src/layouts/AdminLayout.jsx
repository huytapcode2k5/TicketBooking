import { NavLink, Outlet, Link } from 'react-router-dom';
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
  ShieldCheck
} from 'lucide-react';

const links = [
  { to: '/admin', label: 'Tổng quan Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/events', label: 'Quản lý sự kiện & phim', icon: Film },
  { to: '/admin/venues', label: 'Cụm rạp & sơ đồ ghế', icon: Armchair },
  { to: '/admin/showtimes', label: 'Quản lý suất chiếu', icon: Calendar },
  { to: '/admin/coupons', label: 'Voucher & Combo', icon: Tag },
  { to: '/admin/users', label: 'Khách hàng & nhân sự', icon: Users },
  { to: '/admin/payments', label: 'Đối soát & hoàn tiền', icon: Receipt },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-bg text-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 bg-surface/95 border-r border-white/10 p-5 hidden md:flex flex-col justify-between">
        <div className="space-y-6">
          {/* Admin Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-accent to-rose-600 flex items-center justify-center text-white shadow-glow-sm">
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
          <nav className="space-y-1.5">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-accent to-rose-600 text-white shadow-glow-sm'
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

        {/* Back to Client Storefront */}
        <div className="pt-4 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại trang người dùng</span>
          </Link>
        </div>
      </aside>

      {/* Admin Main View */}
      <main className="flex-1 p-6 lg:p-8 overflow-x-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
