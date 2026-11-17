import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/axios.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { useCountdown } from '../hooks/useCountdown.js';
import CountdownTimer from '../components/booking/CountdownTimer.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { vnd } from '../utils/format.js';
import { 
  CreditCard, 
  QrCode, 
  Copy, 
  Check, 
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

const PROVIDERS = [
  { id: 'MOMO', label: 'Ví MoMo (Test)', icon: Smartphone },
  { id: 'PAYOS', label: 'PayOS · VietQR', icon: QrCode },
];

export default function Payment() {
  const { orderId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const initialProvider = search.get('provider') || 'MOMO';
  const [provider, setProvider] = useState(initialProvider);
  const [pay, setPay] = useState(null);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [simulating, setSimulating] = useState(false);
  const done = useRef(false);

  const goResult = () => {
    if (done.current) return;
    done.current = true;
    navigate(`/payment/result?orderId=${orderId}`, { replace: true });
  };

  // Tạo (hoặc lấy lại) link thanh toán của cổng đang chọn; đổi tab thì tạo lại
  useEffect(() => {
    let alive = true;
    setPay(null);
    setError('');
    api.post('/payments/create', { orderId: Number(orderId), provider })
      .then((r) => alive && setPay(r.data))
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Không thể tạo phiên thanh toán.');
      });
    return () => { alive = false; };
  }, [orderId, provider]);

  // Cách 1: server báo ngay qua Socket.IO khi webhook/IPN về
  useSocketEvent('payment:success', (p) => { 
    if (String(p.orderId) === String(orderId)) goResult(); 
  });

  // Cách 2 (dự phòng): hỏi lại server mỗi 3 giây. Với MoMo, server tự hỏi MoMo nếu IPN chưa về.
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

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

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
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-gold/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface2 border border-white/10 text-xs text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>Cổng thanh toán bảo mật</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-white">Thanh toán vé xem phim</h1>
          <p className="text-sm text-slate-400">Chọn phương thức thanh toán thử nghiệm</p>
        </div>

        {/* Tabs chọn cổng */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface2/60 rounded-xl border border-white/5">
          {PROVIDERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setProvider(id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
                provider === id
                  ? 'bg-gradient-to-r from-accent to-accent-hover text-surface font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Lỗi */}
        {error && (
          <div className="error-box flex flex-col gap-2 p-4 text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">
                <p className="font-semibold">{error}</p>
                {provider === 'PAYOS' && (
                  <p className="text-xs text-red-300/80 mt-1">
                    Chưa cài đặt cấu hình PayOS trong file .env. Bạn có thể bấm chuyển sang <strong>Ví MoMo (Test)</strong> để thử nghiệm ngay.
                  </p>
                )}
              </div>
            </div>
            {provider === 'PAYOS' && (
              <button
                onClick={() => setProvider('MOMO')}
                className="mt-1 self-start btn-ghost text-xs py-1.5 px-3 bg-red-500/20 border-red-500/30 text-white hover:bg-red-500/30"
              >
                Chuyển sang Ví MoMo
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {!pay && !error && (
          <div className="py-12 text-center">
            <Spinner label="Đang tạo mã thanh toán và kết nối cổng..." />
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
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span>Quét bằng app {provider === 'MOMO' ? 'MoMo Test' : 'Ngân hàng / VietQR'}</span>
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

            {/* Provider specific instructions */}
            {provider === 'PAYOS' ? (
              <div className="text-sm text-left rounded-xl bg-surface2/80 border border-white/5 p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-slate-400 font-sans">Chủ tài khoản:</span>
                  <span className="font-semibold text-slate-200">{pay.accountName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-slate-400 font-sans">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent">{pay.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(pay.accountNumber, 'acc')}
                      className="p-1 hover:text-white text-slate-400 transition"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'acc' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-sans">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gold">{pay.description}</span>
                    <button
                      onClick={() => copyToClipboard(pay.description, 'desc')}
                      className="p-1 hover:text-white text-slate-400 transition"
                      title="Sao chép nội dung"
                    >
                      {copiedField === 'desc' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-left rounded-xl bg-surface2/80 border border-white/5 p-4 space-y-3 text-slate-300">
                <div className="flex items-center gap-2 text-pink-400 font-semibold text-xs uppercase tracking-wider">
                  <Smartphone className="h-4 w-4" />
                  <span>Cổng MoMo Sandbox (Môi trường Test)</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1.5 text-amber-200/90">
                  <div className="flex items-start gap-1.5 font-semibold text-amber-300">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Lý do app MoMo trên điện thoại báo "Giao dịch không tồn tại":</span>
                  </div>
                  <p className="leading-relaxed pl-5">
                    App MoMo thông thường trên điện thoại của bạn chạy ở môi trường <strong>Production</strong> (thật). Mã QR này do hệ thống <strong>Sandbox</strong> (test) tạo ra, nên app thật sẽ không nhận diện được.
                  </p>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <p className="font-semibold text-white">Cách thanh toán thử nghiệm:</p>
                  <p>1. Bấm nút <strong>"Mở trang thanh toán MoMo Sandbox"</strong> bên dưới.</p>
                  <p>2. Trên trang MoMo, chọn thanh toán thẻ ATM và dùng thẻ test:</p>
                  <div className="p-2.5 bg-black/30 rounded border border-white/5 font-mono text-[11px] space-y-0.5 text-slate-300">
                    <div>Ngân hàng: <span className="text-accent font-semibold">NCB</span></div>
                    <div>Số thẻ: <span className="text-accent font-semibold">9704198526191432198</span></div>
                    <div>Chủ thẻ: <span className="text-accent font-semibold">NGUYEN VAN A</span> (Ngày: 07/15)</div>
                    <div>Mã OTP xác thực: <span className="text-accent font-semibold">000000</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition shadow-lg ${
                  provider === 'MOMO'
                    ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30'
                    : 'btn-primary shadow-accent/20'
                }`}
              >
                <span>{provider === 'MOMO' ? 'Mở trang thanh toán MoMo Sandbox' : 'Mở trang thanh toán PayOS'}</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Nút Giả lập thanh toán nhanh cho Dev / Demo */}
              <button
                onClick={simulateSuccess}
                disabled={simulating}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 transition"
                title="Bấm để xác nhận đơn hàng thành công ngay lập tức mà không cần nhập thẻ"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                <span>{simulating ? 'Đang xác nhận...' : '⚡ Giả lập thanh toán thành công (Dành cho Dev / Demo)'}</span>
              </button>

              <button 
                onClick={cancel} 
                className="btn-ghost w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Hủy thanh toán & nhả ghế</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
