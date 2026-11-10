import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/axios.js';
import Spinner from '../components/common/Spinner.jsx';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  Ticket, 
  Home, 
  Sparkles 
} from 'lucide-react';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [status, setStatus] = useState(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (params.get('cancelled')) api.post(`/orders/${orderId}/cancel`, {}).catch(() => {});
  }, [orderId, params]);

  useEffect(() => {
    let timer;
    const poll = async (n) => {
      try {
        const r = await api.get(`/payments/${orderId}/status`);
        setStatus(r.data.status);
        setTries(n);
        if (r.data.status === 'PENDING' && n < 20) timer = setTimeout(() => poll(n + 1), 3000);
      } catch {
        setStatus('ERROR');
      }
    };
    poll(0);
    return () => clearTimeout(timer);
  }, [orderId]);

  useEffect(() => {
    if (status === 'PAID') sessionStorage.removeItem('booking');
  }, [status]);

  if (!status) return <Spinner label="Đang kiểm tra kết quả thanh toán..." />;

  const viewConfig = {
    PAID: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15 border-emerald-500/30 shadow-glow-sm',
      title: 'Đặt vé thành công!',
      desc: 'Giao dịch đã được xác nhận. Vé điện tử cùng mã QR check-in đã được gửi vào mục "Vé của tôi" và email của bạn.',
    },
    PENDING: {
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/15 border-amber-400/30',
      title: 'Đang xác nhận thanh toán',
      desc:
        tries >= 20
          ? 'Chưa nhận được tín hiệu tức thời từ ngân hàng. Nếu bạn đã hoàn tất chuyển khoản, vé sẽ xuất hiện trong ít phút.'
          : 'Vui lòng chờ trong giây lát, hệ thống đang đồng bộ với cổng PayOS...',
    },
    CANCELLED: {
      icon: XCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15 border-rose-500/30',
      title: 'Đã hủy thanh toán',
      desc: 'Giao dịch đã hủy và các vị trí ghế đã được giải phóng trên hệ thống.',
    },
    EXPIRED: {
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15 border-rose-500/30',
      title: 'Đơn hàng đã hết hạn',
      desc: 'Thời gian giữ chỗ đã kết thúc. Nếu bạn đã chuyển khoản muộn, hệ thống sẽ tự động hoàn tiền theo quy định.',
    },
    REFUNDED: {
      icon: RotateCcw,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15 border-blue-500/30',
      title: 'Đã hoàn tiền đơn hàng',
      desc: 'Yêu cầu hoàn vé đã được xử lý thành công.',
    },
    ERROR: {
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/15 border-rose-500/30',
      title: 'Không thể xác thực giao dịch',
      desc: 'Vui lòng kiểm tra lại trạng thái trong danh sách "Vé của tôi" hoặc liên hệ tổng đài hỗ trợ.',
    },
  }[status] || {
    icon: AlertTriangle,
    color: 'text-slate-400',
    bgColor: 'bg-white/10 border-white/20',
    title: 'Trạng thái không xác định',
    desc: '',
  };

  const IconComponent = viewConfig.icon;

  return (
    <div className="max-w-md mx-auto card p-8 sm:p-10 text-center space-y-6 bg-surface/90 border-white/10 shadow-2xl my-10">
      {/* Status Icon */}
      <div className="flex justify-center">
        <div
          className={`h-20 w-20 rounded-3xl flex items-center justify-center border ${viewConfig.bgColor}`}
        >
          <IconComponent className={`h-10 w-10 ${viewConfig.color}`} />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h1 className={`font-display font-black text-2xl sm:text-3xl ${viewConfig.color}`}>
          {viewConfig.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {viewConfig.desc}
        </p>
      </div>

      {/* Actions */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
        {status === 'PAID' ? (
          <Link
            className="btn-primary !py-3 !px-6 text-sm shadow-glow flex items-center justify-center gap-2"
            to="/my-tickets"
          >
            <Ticket className="h-4 w-4" />
            <span>Xem vé của tôi ngay</span>
          </Link>
        ) : (
          <Link
            className="btn-primary !py-3 !px-6 text-sm flex items-center justify-center gap-2"
            to="/"
          >
            <Home className="h-4 w-4" />
            <span>Quay về trang chủ</span>
          </Link>
        )}
      </div>
    </div>
  );
}
