import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import { 
  Ticket, 
  ShieldCheck, 
  CreditCard, 
  Headphones, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Sparkles,
  Heart
} from 'lucide-react';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col relative bg-bg text-slate-100 overflow-x-hidden">
      {/* Ambient Radial Background Mesh Glows */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[350px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-[500px] h-[350px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Enterprise-Grade Modern Footer */}
      <footer className="mt-16 border-t border-white/[0.08] bg-surface/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-white/[0.06]">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-accent to-rose-600 flex items-center justify-center text-white shadow-glow-sm">
                  <Ticket className="h-5 w-5" />
                </div>
                <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                  Ticket<span className="text-accent">Hub</span>
                </span>
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                Nền tảng đặt vé xem phim & sự kiện trực tuyến hàng đầu. Trải nghiệm giữ chỗ thời gian thực, thanh toán tự động qua mã VietQR PayOS và nhận vé điện tử tức thì.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bảo mật giao dịch 100%
                </span>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Khám phá
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><Link to="/?status=NOW_SHOWING" className="hover:text-accent transition-colors">Phim đang chiếu</Link></li>
                <li><Link to="/?status=COMING_SOON" className="hover:text-accent transition-colors">Sắp khởi chiếu</Link></li>
                <li><Link to="/" className="hover:text-accent transition-colors">Cụm rạp & Địa điểm</Link></li>
                <li><Link to="/my-tickets" className="hover:text-accent transition-colors">Tra cứu vé điện tử</Link></li>
              </ul>
            </div>

            {/* Column 3: Customer Care */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Hỗ trợ khách hàng
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-accent" />
                  <span>Hotline: 1900 6868</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-accent" />
                  <span>support@tickethub.vn</span>
                </li>
                <li><span className="hover:text-accent cursor-pointer">Chính sách đổi trả & hoàn vé</span></li>
                <li><span className="hover:text-accent cursor-pointer">Điều khoản dịch vụ</span></li>
              </ul>
            </div>

            {/* Column 4: Payment Partners */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Đối tác thanh toán
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 font-bold text-slate-200">
                  PayOS
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 font-bold text-emerald-400">
                  VietQR
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 font-bold text-blue-400">
                  Napas 247
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 font-bold text-rose-400">
                  MoMo / ZaloPay
                </span>
              </div>
              <p className="mt-3 text-[11px] text-slate-400 leading-normal">
                Hệ thống xác nhận thanh toán tức thời qua cổng Open Banking & Webhook bảo mật.
              </p>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © 2026 <b className="text-white">TicketHub</b>. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Được xây dựng với React, Node.js & SQL Server</span>
              <span>•</span>
              <span className="text-accent flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3" />
                Phiên bản 2.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
