import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { 
  Ticket, 
  Film, 
  QrCode, 
  ShieldCheck, 
  Search, 
  LogOut, 
  User as UserIcon, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const search = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/?q=${encodeURIComponent(q.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-accent/15 text-accent border border-accent/30 shadow-glow-sm'
        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4 py-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-accent via-rose-500 to-amber-400 p-[1px] shadow-glow-sm group-hover:shadow-glow transition-all duration-300 group-hover:scale-105">
            <div className="h-full w-full bg-surface rounded-[11px] flex items-center justify-center">
              <Ticket className="h-5 w-5 text-accent transition-transform group-hover:rotate-12 duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
              Ticket<span className="text-accent">Hub</span>
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1 hidden sm:block">
              Cinema & Events
            </span>
          </div>
        </Link>

        {/* Global Search Box */}
        <form onSubmit={search} className="flex-1 max-w-md hidden md:block relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full rounded-full bg-surface2/90 border border-white/10 pl-10 pr-12 py-2 text-sm text-slate-100 placeholder:text-slate-400 transition-all focus:outline-none focus:border-accent/80 focus:ring-2 focus:ring-accent/20 focus:bg-surface2"
              placeholder="Tìm kiếm phim, rạp chiếu, ca nhạc..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <kbd className="absolute right-3.5 hidden lg:inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              ↵
            </kbd>
          </div>
        </form>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-2">
          <NavLink to="/" end className={navLinkClass}>
            <Film className="h-4 w-4" />
            <span>Phim & Sự kiện</span>
          </NavLink>
          {user && (
            <NavLink to="/my-tickets" className={navLinkClass}>
              <Ticket className="h-4 w-4" />
              <span>Vé của tôi</span>
            </NavLink>
          )}
          {user && ['STAFF', 'ADMIN'].includes(user.role) && (
            <NavLink to="/staff/check-in" className={navLinkClass}>
              <QrCode className="h-4 w-4" />
              <span>Soát vé</span>
            </NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className={navLinkClass}>
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300">Quản trị</span>
            </NavLink>
          )}
        </nav>

        {/* Actions / User Profile */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2.5">
              <NotificationBell />
              
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all text-sm font-medium text-slate-200"
              >
                <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-accent to-rose-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                  {user.fullName?.charAt(0) || 'U'}
                </div>
                <span className="max-w-[120px] truncate">{user.fullName}</span>
              </Link>

              <button
                className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost !py-2 !px-3.5 text-xs sm:text-sm">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 text-xs sm:text-sm shadow-glow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Đăng ký</span>
              </Link>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-surface/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <form onSubmit={search} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className="input !pl-10 !py-2 text-sm"
              placeholder="Tìm phim, sự kiện..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <div className="flex flex-col gap-1.5 pt-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/[0.08]"
            >
              <Film className="h-4 w-4 text-accent" />
              <span>Phim & Sự kiện</span>
            </Link>
            {user && (
              <Link
                to="/my-tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/[0.08]"
              >
                <Ticket className="h-4 w-4 text-accent" />
                <span>Vé của tôi</span>
              </Link>
            )}
            {user && ['STAFF', 'ADMIN'].includes(user.role) && (
              <Link
                to="/staff/check-in"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/[0.08]"
              >
                <QrCode className="h-4 w-4 text-accent" />
                <span>Soát vé</span>
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-amber-300 hover:bg-white/[0.08]"
              >
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Khu vực Quản trị</span>
              </Link>
            )}
            {user && (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/[0.08]"
              >
                <UserIcon className="h-4 w-4 text-slate-400" />
                <span>Hồ sơ cá nhân</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
