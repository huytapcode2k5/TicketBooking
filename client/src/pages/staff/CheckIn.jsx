import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api/axios.js';
import { fmtDateTime } from '../../utils/format.js';
import { 
  Camera, 
  StopCircle, 
  QrCode, 
  History, 
  Keyboard, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Check, 
  Armchair,
  Film
} from 'lucide-react';

const RESULT = {
  SUCCESS: { label: 'Vé hợp lệ - Mời vào', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 },
  ALREADY_USED: { label: 'Vé đã được sử dụng', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: XCircle },
  INVALID: { label: 'Vé không tồn tại / không hợp lệ', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: XCircle },
  CANCELLED: { label: 'Vé này đã bị hủy', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: XCircle },
  TOO_EARLY: { label: 'Chưa đến giờ mở cửa soát vé', color: 'bg-amber-400/20 text-amber-300 border-amber-400/40', icon: Clock },
  EXPIRED: { label: 'Suất chiếu này đã kết thúc', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: AlertCircle },
};

export default function CheckIn() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const lastRef = useRef({ code: '', at: 0 });

  const check = async (code) => {
    const now = Date.now();
    if (lastRef.current.code === code && now - lastRef.current.at < 3000) return;
    lastRef.current = { code, at: now };
    try {
      const r = await api.post('/staff/checkin', { qrToken: code });
      setResult(r.data);
      setError('');
      setHistory((h) => [{ ...r.data, code, time: new Date().toISOString() }, ...h].slice(0, 10));
    } catch (e) {
      setError(e.message);
    }
  };

  const start = async () => {
    setError('');
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => check(text),
        () => {}
      );
      setScanning(true);
    } catch {
      setError('Không mở được camera. Hãy cho phép quyền camera (cần HTTPS hoặc localhost) hoặc nhập mã thủ công.');
    }
  };

  const stop = async () => {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {
      /* stopped */
    }
    setScanning(false);
  };

  useEffect(() => () => {
    scannerRef.current?.isScanning && scannerRef.current.stop().catch(() => {});
  }, []);

  const resConfig = RESULT[result?.result] ?? {
    label: result?.result || '',
    color: 'bg-white/10 text-white border-white/20',
    icon: AlertCircle,
  };
  const ResIcon = resConfig.icon;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-3 py-0.5 text-xs font-bold text-accent uppercase tracking-wider mb-1">
          <QrCode className="h-3.5 w-3.5" />
          <span>Cổng kiểm soát vé</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Soát vé vào cửa</h1>
        <p className="text-xs text-slate-400">
          Quét mã QR trên vé điện tử của khách hàng hoặc nhập mã kiểm tra
        </p>
      </div>

      {/* Camera Scanner Card */}
      <div className="card p-5 bg-surface/90 border-white/10 shadow-2xl space-y-4">
        <div id="qr-reader" className="overflow-hidden rounded-2xl bg-black/40 min-h-[160px]" />
        
        <button
          className={`w-full !py-3 flex items-center justify-center gap-2 font-bold text-sm ${
            scanning ? 'btn-danger' : 'btn-primary shadow-glow'
          }`}
          onClick={scanning ? stop : start}
        >
          {scanning ? (
            <>
              <StopCircle className="h-4 w-4" />
              <span>Dừng quét camera</span>
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              <span>Bật camera quét mã QR</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Check-in Result Card */}
      {result && (
        <div className={`rounded-2xl p-6 text-center border shadow-xl space-y-3 ${resConfig.color}`}>
          <div className="flex justify-center">
            <ResIcon className="h-12 w-12" />
          </div>
          <div className="font-display font-black text-2xl">{resConfig.label}</div>
          {result.movieTitle && (
            <div className="text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" />
                {result.movieTitle}
              </span>
              <span>•</span>
              <span>{result.roomName}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-base font-bold text-amber-300">
                <Armchair className="h-4 w-4" />
                Ghế {result.seatLabel}
              </span>
            </div>
          )}
          {result.startTime && (
            <div className="text-xs opacity-85 font-mono">{fmtDateTime(result.startTime)}</div>
          )}
        </div>
      )}

      {/* Manual Input Form */}
      <form
        className="card p-4 flex gap-2.5 bg-surface/90 border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) {
            check(manual.trim());
            setManual('');
          }
        }}
      >
        <div className="relative flex-1">
          <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            className="input !pl-10 !py-2.5 text-xs sm:text-sm font-mono uppercase"
            placeholder="Hoặc nhập chuỗi mã vé thủ công..."
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
        </div>
        <button className="btn-primary !px-5 whitespace-nowrap text-xs sm:text-sm">
          Kiểm tra
        </button>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="card p-5 bg-surface/90 border-white/10 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lịch sử quét gần đây
            </h2>
          </div>
          <ul className="divide-y divide-white/5 text-xs">
            {history.map((h, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">
                  {h.seatLabel ? `Ghế ${h.seatLabel}` : h.code.slice(0, 10)} • {h.movieTitle || 'Vé'}
                </span>
                <span className={`font-bold ${RESULT[h.result]?.color.split(' ')[1] || 'text-slate-400'}`}>
                  {RESULT[h.result]?.label || h.result}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
