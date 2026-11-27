import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/axios.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { useCountdown } from '../hooks/useCountdown.js';
import CountdownTimer from '../components/booking/CountdownTimer.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { vnd } from '../utils/format.js';
import { 
  CreditCard, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  RotateCcw,
  Smartphone,
  Sparkles,
  ArrowLeft,
  Zap,
  Info
} from 'lucide-react';

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [pay, setPay] = useState(null);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);
  const done = useRef(false);

  const goResult = () => {
    if (done.current) return;
    done.current = true;
    navigate(`/payment/result?orderId=${orderId}`, { replace: true });
  };

  // Tạo (hoặc lấy lại) link thanh toán MoMo
  useEffect(() => {
    let alive = true;
    setPay(null);
    setError('');
    api.post('/payments/create', { orderId: Number(orderId), provider: 'MOMO' })
      .then((r) => alive && setPay(r.data))
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Không thể tạo phiên thanh toán.');
      });
    return () => { alive = false; };
  }, [orderId]);

  // Cách 1: server báo ngay qua Socket.IO khi IPN về
  useSocketEvent('payment:success', (p) => { 
    if (String(p.orderId) === String(orderId)) goResult(); 
  });

  // Cách 2 (dự phòng): hỏi lại server mỗi 3 giây. Server tự hỏi MoMo nếu IPN chưa về.
  useEffect(() => {
    if (!pay) return undefined;
    const t = setInterval(async () => {
      try {
        const r = await api.get(`/payments/${orderId}/status`);
        if (r.data.status !== 'PENDING') goResult();
      } catch { /* bỏ qua lỗi tạm thời */ }
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay, orderId]);

  const left = useCountdown(pay?.expiresAt);

  const cancel = async () => {
    try { await api.post(`/orders/${orderId}/cancel`, {}); } catch { /* đơn có thể đã hết hạn */ }
    sessionStorage.removeItem('booking');
    navigate('/');
  };

  // Nút giả lập thanh toán thành công dành cho Dev / Demo
  const simulateSuccess = async () => {
    try {
      setSimulating(true);
      await api.post(`/payments/${orderId}/simulate-success`, {});
      goResult();
    } catch (e) {
      setError(e.message || 'Không thể giả lập thanh toán.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 py-6 px-4">
      <div className="card p-6 md:p-8 space-y-6 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="text-center space-y-2 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 border border-white/10 text-xs text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>Cổng thanh toán MoMo bảo mật</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-white">Thanh toán vé qua Ví MoMo</h1>
          <p className="text-sm text-slate-400">Quét mã QR hoặc chuyển hướng sang cổng MoMo Sandbox</p>
        </div>

        {/* Lỗi */}
        {error && (
          <div className="error-box flex items-start gap-2.5 p-4 text-left">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {!pay && !error && (
          <div className="py-12 text-center">
            <Spinner label="Đang tạo mã thanh toán MoMo..." />
          </div>
        )}

        {/* Payment Details */}
        {pay && (
          <div className="text-center space-y-5">
            {/* Countdown */}
            <div className="flex justify-center">
              <CountdownTimer expiresAt={pay.expiresAt} label="Thời gian giữ chỗ còn lại" />
            </div>

            {/* QR Code */}
            {pay.qrCode && (
              <div className="relative inline-block mx-auto">
                <div className="rounded-2xl bg-white p-4 shadow-xl border-4 border-surface2">
                  <QRCodeSVG value={pay.qrCode} size={210} level="M" />
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-pink-400" />
                  <span>Quét bằng app MoMo Test</span>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">Số tiền cần thanh toán</div>
              <div className="text-3xl font-extrabold font-mono text-gold tracking-tight">
                {vnd(pay.amount)}
              </div>
            </div>

            {/* MoMo Sandbox instructions */}
            <div className="text-sm text-left rounded-xl bg-surface2/80 border border-white/5 p-4 space-y-3 text-slate-300">
              <div className="flex items-center gap-2 text-pink-400 font-semibold text-xs">
                <Smartphone className="h-4 w-4" />
                <span>Môi trường MoMo Sandbox (Thử nghiệm)</span>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1.5 text-amber-200/90">
                <div className="flex items-start gap-1.5 font-semibold text-amber-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Lưu ý khi quét mã bằng điện thoại:</span>
                </div>
                <p className="leading-relaxed pl-5">
                  App MoMo thật trên điện thoại kết nối server thật nên quét mã test sẽ báo <em>"Giao dịch không tồn tại"</em>. Bạn hãy dùng các cách test bên dưới:
                </p>
              </div>

              <div className="text-xs space-y-1.5 text-slate-300">
                <p className="font-semibold text-white">Cách thanh toán thử nghiệm:</p>
                <p>1. Bấm nút <strong>"Mở trang thanh toán MoMo Sandbox"</strong> bên dưới.</p>
                <p>2. Chọn thanh toán bằng thẻ ATM và nhập thông tin thẻ test:</p>
                <div className="p-2.5 bg-black/30 rounded border border-white/5 font-mono text-[11px] space-y-0.5 text-slate-300">
                  <div>Ngân hàng: <span className="text-accent font-semibold">NCB</span></div>
                  <div>Số thẻ: <span className="text-accent font-semibold">9704198526191432198</span></div>
                  <div>Chủ thẻ: <span className="text-accent font-semibold">NGUYEN VAN A</span> (Ngày: 07/15)</div>
                  <div>Mã OTP: <span className="text-accent font-semibold">000000</span></div>
                </div>
              </div>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
              <span>Hệ thống đang tự động lắng nghe kết quả thanh toán...</span>
            </div>

            {left === 0 && (
              <div className="error-box text-xs">
                Đơn hàng đã hết thời gian giữ chỗ. Nếu bạn đã chuyển khoản, hệ thống sẽ tự động hoàn tiền.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <a
                href={pay.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full !py-3.5 !px-4 text-sm font-semibold rounded-xl bg-[#A50064] hover:bg-[#8e0056] text-white border border-pink-400/20 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>Mở trang thanh toán MoMo Sandbox</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Nút Giả lập thanh toán nhanh cho Dev / Demo */}
              <button
                onClick={simulateSuccess}
                disabled={simulating}
                className="btn-secondary w-full !py-2.5 !px-4 text-xs font-medium border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-2 transition-all"
                title="Bấm để xác nhận đơn hàng thành công ngay lập tức mà không cần nhập thẻ"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{simulating ? 'Đang xác nhận...' : 'Giả lập thanh toán thành công (Thử nghiệm)'}</span>
              </button>

              <button 
                onClick={cancel} 
                className="btn-ghost w-full flex items-center justify-center gap-2 !py-2.5 !px-4 text-xs text-slate-300 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Hủy thanh toán & nhả ghế</span>
              </button>
            </div>

            {pay.deeplink && (
              <a 
                href={pay.deeplink}
                className="btn-ghost w-full inline-flex items-center justify-center gap-2 text-sm sm:hidden"
              >
                <Smartphone className="h-4 w-4" />
                <span>Mở bằng App MoMo Test</span>
              </a>
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link to="/" className="btn-ghost !py-2 !px-4 text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
