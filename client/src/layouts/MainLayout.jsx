import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import ChatWidget from '../components/chat/ChatWidget.jsx';
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
  Heart,
  Bot,
  ChevronUp,
  FileText,
  RotateCcw
} from 'lucide-react';
import {
  RefundPolicyModal,
  TermsModal,
  VenuesModal,
  PaymentInfoModal
} from '../components/common/FooterModals.jsx';

export default function MainLayout() {
  const [activeModal, setActiveModal] = useState(null); // 'refund' | 'terms' | 'venues' | 'payment'

  const onOpenChat = () => {
    window.dispatchEvent(new CustomEvent('open-chat'));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-bg text-slate-100 overflow-x-hidden">
      {/* Main Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <ChatWidget />

      {/* Footer Modals */}
      <RefundPolicyModal
        isOpen={activeModal === 'refund'}
        onClose={() => setActiveModal(null)}
      />
      <TermsModal
        isOpen={activeModal === 'terms'}
        onClose={() => setActiveModal(null)}
      />
      <VenuesModal
        isOpen={activeModal === 'venues'}
        onClose={() => setActiveModal(null)}
      />
      <PaymentInfoModal
        isOpen={activeModal === 'payment'}
        onClose={() => setActiveModal(null)}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-white/[0.08] bg-surface/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-white/[0.06]">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm">
                  <Ticket className="h-5 w-5" />
                </div>
                <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                  Ticket<span className="text-accent">Hub</span>
                </span>
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                Nền tảng đặt vé xem phim & sự kiện trực tuyến hàng đầu. Trải nghiệm giữ chỗ thời gian thực, thanh toán tự động qua Ví MoMo và nhận vé điện tử tức thì.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setActiveModal('payment')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bảo mật giao dịch 100% (Chi tiết)
                </button>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Khám phá
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li>
                  <Link to="/?status=NOW_SHOWING" className="hover:text-accent transition-colors block py-0.5">
                    Phim đang chiếu
                  </Link>
                </li>
                <li>
                  <Link to="/?status=COMING_SOON" className="hover:text-accent transition-colors block py-0.5">
                    Sắp khởi chiếu
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('venues')}
                    className="hover:text-accent transition-colors flex items-center gap-1.5 py-0.5 text-left"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>Cụm rạp & Địa điểm</span>
                  </button>
                </li>
                <li>
                  <Link to="/my-tickets" className="hover:text-accent transition-colors block py-0.5">
                    Tra cứu vé điện tử
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Care */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Hỗ trợ khách hàng
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li>
                  <a href="tel:19006868" className="flex items-center gap-2 hover:text-accent transition-colors py-0.5">
                    <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>Hotline/Zalo: <b className="text-slate-200">0396100121</b></span>
                  </a>
                </li>
                <li>
                  <a href="mailto:support@tickethub.vn" className="flex items-center gap-2 hover:text-accent transition-colors py-0.5">
                    <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>support@tickethub.vn</span>
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('refund')}
                    className="hover:text-accent transition-colors flex items-center gap-1.5 py-0.5 text-left"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>Chính sách đổi trả & hoàn vé</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('terms')}
                    className="hover:text-accent transition-colors flex items-center gap-1.5 py-0.5 text-left"
                  >
                    <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>Điều khoản dịch vụ</span>
                  </button>
                </li>
                <li className="pt-1">
                  <button
                    onClick={onOpenChat}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 border border-accent/30 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>Hỏi trợ lý AI 24/7</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Payment Partners */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Đối tác thanh toán
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => setActiveModal('payment')}
                  title="Xem quy định thanh toán MoMo"
                  className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 font-bold text-pink-400 hover:bg-pink-500/20 transition-colors"
                >
                  Ví MoMo
                </button>
                <button
                  onClick={() => setActiveModal('payment')}
                  title="Xem danh sách ngân hàng ATM nội địa"
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 font-bold text-blue-400 hover:bg-white/10 transition-colors"
                >
                  Thẻ ATM Nội Địa
                </button>
                <button
                  onClick={() => setActiveModal('payment')}
                  title="Xem quy định thẻ quốc tế"
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 font-bold text-amber-400 hover:bg-white/10 transition-colors"
                >
                  Visa / Mastercard
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-400 leading-normal">
                Hệ thống xác nhận thanh toán tức thời qua cổng Open Banking & Webhook bảo mật PCI DSS.
              </p>
              <button
                onClick={() => setActiveModal('payment')}
                className="mt-2 text-[11px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <span>Xem chi tiết cổng thanh toán</span>
                <ExternalLink className="h-3 w-3" />
              </button>
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
              <button
                onClick={scrollToTop}
                className="hover:text-accent flex items-center gap-1 transition-colors text-slate-300 font-medium"
                title="Cuộn lên đầu trang"
              >
                <span>Lên đầu trang</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
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
