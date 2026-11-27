import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/axios.js';
import Spinner from '../components/common/Spinner.jsx';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  RotateCcw, 
  AlertTriangle,
  Ticket,
  Home,
  RefreshCw
} from 'lucide-react';

/** Không tin tham số trên URL: luôn hỏi lại server trạng thái đơn. */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [status, setStatus] = useState(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    // Người dùng hủy: ?cancelled=1. MoMo quay về kèm ?resultCode=...; khác 0 nghĩa là không thanh toán thành công
    const momoCode = params.get('resultCode');
    if (params.get('cancelled') || (momoCode && momoCode !== '0')) {
      api.post(`/orders/${orderId}/cancel`, {}).catch(() => {});
    }
  }, [orderId, params]);

  useEffect(() => {
    let timer;
    const poll = async (n) => {
      try {
        const r = await api.get(`/payments/${orderId}/status`);
        setStatus(r.data.status);
        setTries(n);
        if (r.data.status === 'PENDING' && n < 20) {
          timer = setTimeout(() => poll(n + 1), 3000);
        }
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

  if (!status) return <Spinner label="Đang kiểm tra kết quả giao dịch..." />;

  const viewConfig = {
    PAID: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10 border-green-500/20',
      title: 'Đặt vé thành công!',
      desc: 'Vé điện tử đã được phát hành và lưu trong mục "Vé của tôi", đồng thời gửi vào email của bạn.',
    },
    PENDING: {
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      title: 'Đang xác nhận thanh toán',
      desc: tries >= 20 
        ? 'Chưa nhận được tín hiệu từ cổng thanh toán. Nếu bạn đã chuyển khoản/thanh toán thành công, vé sẽ xuất hiện trong vài phút.' 
        : 'Hệ thống đang kết nối đối soát với cổng thanh toán. Vui lòng đợi trong giây lát...',
    },
    CANCELLED: {
      icon: XCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      title: 'Giao dịch đã hủy',
      desc: 'Bạn đã hủy phiên thanh toán. Các ghế được chọn đã được giải phóng trở lại phòng chiếu.',
    },
    EXPIRED: {
      icon: AlertCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      title: 'Đơn hàng đã hết hạn',
      desc: 'Thời gian giữ chỗ thanh toán đã hết hạn. Nếu tài khoản đã bị trừ tiền, hệ thống sẽ đối soát hoàn lại cho bạn.',
    },
    REFUNDED: {
      icon: RotateCcw,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10 border-slate-500/20',
      title: 'Đơn hàng đã được hoàn tiền',
      desc: 'Giao dịch này đã được hoàn trả theo chính sách hủy vé.',
    },
    ERROR: {
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      title: 'Không thể xác thực đơn hàng',
      desc: 'Không tìm thấy thông tin đơn hàng hoặc phiên đăng nhập đã hết hạn. Vui lòng kiểm tra lại trong "Vé của tôi".',
    },
  };

  const current = viewConfig[status] || viewConfig.ERROR;
  const IconComponent = current.icon;

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="card p-8 text-center space-y-6 border border-white/10 shadow-xl relative overflow-hidden">
        {/* Icon */}
        <div className="flex justify-center relative">
          <div className={`p-4 rounded-2xl border ${current.bgColor} ${current.color} shadow-sm`}>
            <IconComponent className="h-14 w-14" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2 relative">
          <h1 className={`text-2xl font-bold font-display ${current.color}`}>
            {current.title}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {current.desc}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 relative">
          {status === 'PAID' ? (
            <Link 
              className="btn-primary inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold" 
              to="/my-tickets"
            >
              <Ticket className="h-4 w-4" />
              <span>Xem vé của tôi</span>
            </Link>
          ) : (
            <>
              {status === 'PENDING' && (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Kiểm tra lại</span>
                </button>
              )}
              <Link 
                className="btn-ghost inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium" 
                to="/"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Về trang chủ</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
