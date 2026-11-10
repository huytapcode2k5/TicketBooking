import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/axios.js';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { useCountdown } from '../hooks/useCountdown.js';
import CountdownTimer from '../components/booking/CountdownTimer.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { vnd } from '../utils/format.js';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [pay, setPay] = useState(null);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const done = useRef(false);

  const goResult = () => {
    if (done.current) return;
    done.current = true;
    navigate(`/payment/result?orderId=${orderId}`, { replace: true });
  };

  useEffect(() => {
    api
      .post('/payments/create', { orderId: Number(orderId) })
      .then((r) => setPay(r.data))
      .catch((e) => setError(e.message));
  }, [orderId]);

  useSocketEvent('payment:success', (p) => {
    if (String(p.orderId) === String(orderId)) goResult();
  });

  useEffect(() => {
    if (!pay) return undefined;
    const t = setInterval(async () => {
      try {
        const r = await api.get(`/payments/${orderId}/status`);
        if (r.data.status !== 'PENDING') goResult();
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [pay, orderId]);

  const left = useCountdown(pay?.expiresAt);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const cancel = async () => {
    try {
      await api.post(`/orders/${orderId}/cancel`, {});
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem('booking');
    navigate('/');
  };

  if (error)
    return (
      <div className="max-w-lg mx-auto space-y-4 py-16 text-center">
        <div className="error-box">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span>{error}</span>
        </div>
        <button className="btn-ghost" onClick={() => navigate('/')}>
          Về trang chủ
        </button>
      </div>
    );

  if (!pay) return <Spinner label="Đang khởi tạo mã VietQR bảo mật..." />;

  return (
    <div className="max-w-md mx-auto card p-6 sm:p-8 text-center space-y-5 bg-surface/90 border-white/10 shadow-2xl">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Cổng thanh toán tự động</span>
        </div>
        <h1 className="font-display font-black text-2xl text-white">Quét mã VietQR</h1>
        <p className="text-xs text-slate-400">
          Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ để quét mã
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="flex justify-center">
        <CountdownTimer expiresAt={pay.expiresAt} label="Hết hạn sau" />
      </div>

      {/* QR Code Container with Scanner Frame */}
      <div className="relative mx-auto w-fit rounded-3xl bg-white p-5 shadow-2xl border-2 border-white/20">
        <div className="absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-accent" />
        <div className="absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-accent" />
        <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-accent" />
        <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-accent" />
        <QRCodeSVG value={pay.qrCode} size={230} />
      </div>

      {/* Amount Display */}
      <div>
        <div className="text-xs uppercase font-bold tracking-wider text-slate-400">Số tiền thanh toán</div>
        <div className="font-mono text-3xl font-black text-amber-300 drop-shadow-sm mt-0.5">
          {vnd(pay.amount)}
        </div>
      </div>

      {/* Bank Details Table with One-Click Copy */}
      <div className="rounded-2xl bg-surface2/60 border border-white/5 p-4 text-xs text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Chủ tài khoản:</span>
          <span className="font-bold text-slate-200">{pay.accountName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Số tài khoản:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white text-sm">{pay.accountNumber}</span>
            <button
              onClick={() => copyToClipboard(pay.accountNumber, 'acc')}
              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Sao chép số tài khoản"
            >
              {copiedField === 'acc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Nội dung chuyển khoản:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-accent text-sm">{pay.description}</span>
            <button
              onClick={() => copyToClipboard(pay.description, 'desc')}
              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Sao chép nội dung"
            >
              {copiedField === 'desc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Detection Status */}
      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 py-1">
        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
        <span>Hệ thống đang tự động nhận diện thanh toán...</span>
      </div>

      {left === 0 && (
        <div className="error-box">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Đơn hàng đã hết hạn. Nếu bạn vừa chuyển khoản, hệ thống sẽ đối soát tự động.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 pt-2">
        <a
          className="btn-ghost flex-1 !py-2.5 text-xs flex items-center justify-center gap-1.5"
          href={pay.checkoutUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Mở PayOS Web</span>
        </a>

        <button
          className="btn-ghost flex-1 !py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center gap-1.5"
          onClick={cancel}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Hủy đơn</span>
        </button>
      </div>
    </div>
  );
}
