import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api/axios.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { fmtDateTime, fmtTime } from '../../utils/format.js';
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
  Armchair, 
  Film, 
  Building2, 
  Volume2, 
  VolumeX, 
  Upload, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Check, 
  ShieldCheck, 
  ScanLine, 
  RefreshCw, 
  Trash2, 
  Copy, 
  CheckCheck,
  Radio,
  CalendarCheck,
  CalendarX
} from 'lucide-react';

const RESULT_CONFIG = {
  SUCCESS: { 
    label: 'VÉ HỢP LỆ - MỜI VÀO', 
    subtitle: 'Khách hàng đủ điều kiện vào phòng chiếu',
    color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
    badge: 'bg-emerald-500 text-slate-950 font-bold',
    glow: 'shadow-[0_0_35px_rgba(16,185,129,0.35)]',
    icon: CheckCircle2,
    tone: 'success'
  },
  ALREADY_USED: { 
    label: 'VÉ ĐÃ QUA CỔNG - CẢNH BÁO', 
    subtitle: 'Vé này đã được quét sử dụng trước đó!',
    color: 'border-rose-500/60 bg-rose-950/40 text-rose-300', 
    badge: 'bg-rose-500 text-white font-bold',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
    icon: AlertCircle,
    tone: 'error'
  },
  INVALID: { 
    label: 'MÃ VÉ KHÔNG HỢP LỆ', 
    subtitle: 'Không tìm thấy dữ liệu vé trên hệ thống TicketHub',
    color: 'border-rose-500/60 bg-rose-950/40 text-rose-300', 
    badge: 'bg-rose-500 text-white font-bold',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
    icon: XCircle,
    tone: 'error'
  },
  CANCELLED: { 
    label: 'VÉ ĐÃ BỊ HỦY / HOÀN TIỀN', 
    subtitle: 'Đơn hàng của vé này đã bị hủy bỏ hoặc hoàn tiền',
    color: 'border-rose-500/60 bg-rose-950/40 text-rose-300', 
    badge: 'bg-rose-500 text-white font-bold',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
    icon: XCircle,
    tone: 'error'
  },
  TOO_EARLY: { 
    label: 'CHƯA ĐẾN GIỜ SOÁT VÉ', 
    subtitle: 'Cổng chỉ mở trước giờ chiếu 60 phút. Vui lòng xem khung giờ soát vé bên dưới',
    color: 'border-amber-400/60 bg-amber-950/40 text-amber-300', 
    badge: 'bg-amber-400 text-slate-950 font-bold',
    glow: 'shadow-[0_0_35px_rgba(251,191,36,0.35)]',
    icon: Clock,
    tone: 'warning'
  },
  EXPIRED: { 
    label: 'SUẤT CHIẾU ĐÃ KẾT THÚC', 
    subtitle: 'Suất chiếu phim đã kết thúc hoặc quá giờ soát vé quy định',
    color: 'border-rose-500/60 bg-rose-950/40 text-rose-300', 
    badge: 'bg-rose-500 text-white font-bold',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
    icon: AlertCircle,
    tone: 'error'
  },
};

// Normalize response data: handles both camelCase (API) and PascalCase (DB)
const normalizeTicketData = (raw) => {
  if (!raw) return null;
  const resKey = (raw.result || raw.Result || 'INVALID').toUpperCase();
  return {
    result: resKey,
    ticketId: raw.ticketId ?? raw.TicketId ?? null,
    movieTitle: raw.movieTitle || raw.MovieTitle || '',
    roomName: raw.roomName || raw.RoomName || '',
    seatLabel: raw.seatLabel || raw.SeatLabel || '',
    startTime: raw.startTime || raw.StartTime || null,
    endTime: raw.endTime || raw.EndTime || null,
    checkInAllowedFrom: raw.checkInAllowedFrom || raw.CheckInAllowedFrom || null,
    checkedInAt: raw.checkedInAt || raw.CheckedInAt || null,
    code: raw.code || raw.qrToken || raw.QrToken || '',
    time: raw.time || new Date().toISOString(),
  };
};

// Format showtime range: "19:30 - 21:45 (23/11/2026)"
const formatShowtimeRange = (startTime, endTime) => {
  if (!startTime) return 'Chưa có thông tin suất chiếu';
  const start = fmtTime(startTime);
  const dateStr = new Date(startTime).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  if (endTime) {
    const end = fmtTime(endTime);
    return `${start} - ${end} (${dateStr})`;
  }
  return `${start} (${dateStr})`;
};

// Calculate check-in allowed window (opens 60 minutes prior to StartTime until EndTime)
const getCheckInWindow = (startTime, endTime, checkInAllowedFrom) => {
  if (!startTime) return null;
  const startDate = new Date(startTime);
  const openDate = checkInAllowedFrom 
    ? new Date(checkInAllowedFrom) 
    : new Date(startDate.getTime() - 60 * 60 * 1000);

  const closeDate = endTime 
    ? new Date(endTime) 
    : new Date(startDate.getTime() + 150 * 60 * 1000);

  return {
    openTime: fmtTime(openDate),
    closeTime: fmtTime(closeDate),
    openDateStr: openDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    fullText: `Từ ${fmtTime(openDate)} đến ${fmtTime(closeDate)}`,
    note: 'Mở cửa trước giờ chiếu 60 phút',
    isBeforeOpen: Date.now() < openDate.getTime(),
    isAfterClose: Date.now() > closeDate.getTime(),
  };
};

// Web Audio API feedback synthesizer
const playSoundFeedback = (tone, soundEnabled) => {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    if (tone === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      if (navigator.vibrate) navigator.vibrate([80]);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(130, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }
  } catch (err) {
    console.debug('Sound feedback omitted:', err);
  }
};

export default function CheckIn() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tickethub_checkin_history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.map(normalizeTicketData) : [];
    } catch {
      return [];
    }
  });
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('tickethub_checkin_stats');
      return saved ? JSON.parse(saved) : { valid: 0, alerts: 0, total: 0 };
    } catch {
      return { valid: 0, alerts: 0, total: 0 };
    }
  });

  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [historyFilter, setHistoryFilter] = useState('ALL'); // ALL | SUCCESS | ALERT

  const scannerRef = useRef(null);
  const lastRef = useRef({ code: '', at: 0 });
  const fileInputRef = useRef(null);
  const manualInputRef = useRef(null);

  // Live Vietnamese clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Discover available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.debug('No camera detected or permission denied:', err);
      });
  }, []);

  // Check ticket function
  const check = useCallback(async (code) => {
    const cleanCode = (code || '').trim();
    if (!cleanCode) return;

    // Debounce duplicate scans within 2.5 seconds
    const now = Date.now();
    if (lastRef.current.code === cleanCode && now - lastRef.current.at < 2500) {
      return;
    }
    lastRef.current = { code: cleanCode, at: now };

    try {
      setError('');
      const r = await api.post('/staff/checkin', { qrToken: cleanCode });
      const normalized = normalizeTicketData({ ...r.data, code: cleanCode });
      const resConfig = RESULT_CONFIG[normalized.result] || RESULT_CONFIG.INVALID;
      
      // Play audio/tactile feedback
      playSoundFeedback(resConfig.tone, soundEnabled);

      setResult(normalized);

      // Update shift stats
      setStats((prev) => {
        const isOk = normalized.result === 'SUCCESS';
        const next = {
          valid: prev.valid + (isOk ? 1 : 0),
          alerts: prev.alerts + (isOk ? 0 : 1),
          total: prev.total + 1,
        };
        try { localStorage.setItem('tickethub_checkin_stats', JSON.stringify(next)); } catch {}
        return next;
      });

      // Update history list with comprehensive ticket details
      setHistory((prev) => {
        const updated = [
          normalized,
          ...prev.filter((x) => (x.code !== cleanCode && x.ticketId !== normalized.ticketId) || Date.now() - new Date(x.time).getTime() > 10000)
        ].slice(0, 30);
        try { localStorage.setItem('tickethub_checkin_history', JSON.stringify(updated)); } catch {}
        return updated;
      });
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Lỗi kết nối khi kiểm tra vé';
      setError(msg);
      playSoundFeedback('error', soundEnabled);
    }
  }, [soundEnabled]);

  // Start Scanner
  const startScanner = async () => {
    try {
      setError('');
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: 'environment' };

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          check(decodedText);
        },
        () => {} // suppress scan frame misses
      );
      setScanning(true);
    } catch (err) {
      setError('Không thể mở camera. Vui lòng cấp quyền truy cập camera trên trình duyệt hoặc sử dụng chế độ nhập mã / tải ảnh.');
      setScanning(false);
    }
  };

  // Stop Scanner
  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      setScanning(false);
    } catch (err) {
      console.debug('Error stopping scanner:', err);
      setScanning(false);
    }
  };

  // Switch camera
  const handleSwitchCamera = async (cameraId) => {
    setSelectedCameraId(cameraId);
    if (scanning) {
      await stopScanner();
      setTimeout(() => startScanner(), 200);
    }
  };

  // Scan from uploaded QR image
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
      }

      if (scanning) {
        await stopScanner();
      }

      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        await check(decodedText);
      }
    } catch (err) {
      setError('Không phát hiện thấy mã QR hợp lệ trong hình ảnh tải lên. Vui lòng chụp rõ nét hơn.');
      playSoundFeedback('error', soundEnabled);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Manual code submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manual.trim()) return;
    check(manual.trim());
    setManual('');
  };

  // Toggle Fullscreen Kiosk
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Reset shift stats
  const handleResetShift = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại chỉ số và lịch sử ca trực hiện tại?')) {
      const freshStats = { valid: 0, alerts: 0, total: 0 };
      setStats(freshStats);
      setHistory([]);
      setResult(null);
      setError('');
      localStorage.removeItem('tickethub_checkin_stats');
      localStorage.removeItem('tickethub_checkin_history');
    }
  };

  // Copy ticket code
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'SUCCESS') {
      return history.filter((h) => h.result === 'SUCCESS');
    }
    if (historyFilter === 'ALERT') {
      return history.filter((h) => h.result !== 'SUCCESS');
    }
    return history;
  }, [history, historyFilter]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const resMeta = result?.result ? RESULT_CONFIG[result.result] : null;
  const ResIcon = resMeta?.icon;
  const activeWindow = result?.startTime ? getCheckInWindow(result.startTime, result.endTime, result.checkInAllowedFrom) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* =========================================================================
          HEADER: TERMINAL CONTROL BAR
          ========================================================================= */}
      <div className="card p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-white/10 bg-slate-900/90 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/4 w-96 h-24 bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white shrink-0">
            <ScanLine className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-sans">
                Trạm Soát Vé Rạp Chiếu
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Terminal
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 text-slate-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} • {currentTime.toLocaleTimeString('vi-VN')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Nhân viên: <strong className="text-white font-medium">{user?.fullName || user?.email || 'Staff Gate'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            className={`p-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-xs">{soundEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Bật chế độ Toàn màn hình (Kiosk Mode)'}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600 text-sm font-medium transition-all flex items-center gap-2"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-rose-400" /> : <Maximize2 className="w-4 h-4 text-rose-400" />}
            <span className="hidden sm:inline text-xs">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetShift}
            title="Đặt lại thống kê ca trực"
            className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/80 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 text-sm font-medium transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Đặt lại ca</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SHIFT STATISTICS HUD (CHỈ SỐ CA TRỰC)
          ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 border-white/5 bg-slate-900/70 relative overflow-hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono leading-none">
              {stats.valid}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Vé hợp lệ (Mời vào)</div>
          </div>
        </div>

        <div className="card p-4 border-white/5 bg-slate-900/70 relative overflow-hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400 font-mono leading-none">
              {stats.alerts}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Cảnh báo / Từ chối</div>
          </div>
        </div>

        <div className="card p-4 border-white/5 bg-slate-900/70 relative overflow-hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400 font-mono leading-none">
              {stats.total}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Tổng lượt quét ca này</div>
          </div>
        </div>

        <div className="card p-4 border-white/5 bg-slate-900/70 relative overflow-hidden flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            scanning ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}>
            <Radio className={`w-5 h-5 ${scanning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">
              {scanning ? 'Camera đang quét' : 'Camera chờ bật'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              Tỉ lệ hợp lệ: {stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 100}%
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE: TWO COLUMNS (SCANNER HUD VS INSTANT DOSSIER)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SCANNER HUD & INPUT (5 COLUMNS) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* CAMERA VIEWFINDER HUD */}
          <div className="card border-white/10 bg-slate-950/90 overflow-hidden relative shadow-2xl flex flex-col">
            {/* Viewfinder Header Toolbar */}
            <div className="p-3.5 bg-slate-900/90 border-b border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${scanning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {scanning ? 'Ống kính quét trực tiếp' : 'Máy quét ngoại tuyến'}
                </span>
              </div>

              {cameras.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-rose-500"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Viewfinder Video Frame */}
            <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {/* Underlying Html5Qrcode video container */}
              <div 
                id="qr-reader" 
                className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover" 
              />

              {/* Viewfinder HUD Overlays when scanning */}
              {scanning ? (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  {/* Cyber Reticle Target */}
                  <div className="relative w-64 h-64 border border-emerald-400/30 rounded-2xl">
                    {/* Reticle 4 Corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                    {/* Reticle Center Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <div className="w-8 h-0.5 bg-emerald-400" />
                      <div className="h-8 w-0.5 bg-emerald-400 absolute" />
                    </div>

                    {/* Animated Laser Scanning Line */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-[bounce_2s_infinite]" />
                  </div>

                  {/* Top Live Badge */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    HƯỚNG MÃ QR VÀO KHUNG QUÉT
                  </div>
                </div>
              ) : (
                /* Viewfinder Standby Screen */
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 backdrop-blur-sm z-10">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Camera đang tắt</h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    Bật camera để quét trực tiếp mã QR trên điện thoại khách hàng hoặc tải ảnh mã vé từ tệp.
                  </p>
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-lg shadow-rose-500/25 flex items-center gap-2 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    Bật Camera Ngay
                  </button>
                </div>
              )}
            </div>

            {/* Viewfinder Controls Toolbar */}
            <div className="p-3.5 bg-slate-900/90 border-t border-white/5 flex items-center justify-between gap-2">
              {scanning ? (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" />
                  Dừng Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startScanner}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Mở Camera Quét
                </button>
              )}

              {/* Upload QR Image File Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="ticket-image-input"
              />
              <label
                htmlFor="ticket-image-input"
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Tải ảnh mã QR vé từ máy tính hoặc thư viện ảnh"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Tải ảnh QR</span>
              </label>
            </div>
          </div>

          {/* RAPID BARCODE GUN & MANUAL INPUT */}
          <div className="card p-4 border-white/10 bg-slate-900/80 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-rose-400" />
                Nhập mã thủ công / Máy bắn mã vạch USB
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Hỗ trợ mã vé (VD: TK-182)</span>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manual}
                  onChange={(e) => setManual(e.target.value.toUpperCase())}
                  placeholder="Nhập mã QR hoặc số vé (VD: TK-182, 182)..."
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors uppercase tracking-wider"
                />
                {manual && (
                  <button
                    type="button"
                    onClick={() => setManual('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!manual.trim()}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-rose-500 text-white font-semibold text-xs tracking-wide uppercase rounded-xl transition-all shadow-md shadow-rose-500/20 flex items-center gap-1.5 shrink-0"
              >
                <Check className="w-4 h-4" />
                Kiểm tra
              </button>
            </form>
          </div>

          {/* INLINE ERROR DISPLAY */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5 animate-shake shadow-lg">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: VERIFICATION DOSSIER & LIVE RESULT (7 COLUMNS) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* RESULT DOSSIER CARD */}
          {result && resMeta ? (
            <div className={`card border-2 ${resMeta.color} ${resMeta.glow} p-5 sm:p-6 transition-all duration-300 relative overflow-hidden`}>
              
              {/* STATUS HERO BANNER */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${resMeta.badge}`}>
                    {ResIcon && <ResIcon className="w-8 h-8" />}
                  </div>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] tracking-wider uppercase mb-1 ${resMeta.badge}`}>
                      {result.result}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans uppercase">
                      {resMeta.label}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {resMeta.subtitle}
                    </p>
                  </div>
                </div>

                {result.ticketId && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(`TK-${result.ticketId}`)}
                    title="Sao chép mã vé"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copiedCode === `TK-${result.ticketId}` ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span className="hidden sm:inline font-mono">{copiedCode === `TK-${result.ticketId}` ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                )}
              </div>

              {/* SPECIAL ADVICE BANNER DEPENDING ON STATUS */}
              {result.result === 'TOO_EARLY' && activeWindow && (
                <div className="mb-4 p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs sm:text-sm space-y-1.5 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-amber-300 uppercase tracking-wide">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Chưa đến giờ mở cổng soát vé!
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    Vé này thuộc suất chiếu lúc <strong className="text-white font-semibold">{formatShowtimeRange(result.startTime, result.endTime)}</strong>.
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-medium">
                    👉 <strong>Khung giờ được phép quét vé:</strong> Từ <span className="font-bold text-amber-300">{activeWindow.openTime}</span> đến <span className="font-bold text-amber-300">{activeWindow.closeTime}</span> (mở trước giờ chiếu 60 phút). Vui lòng hướng dẫn khách quay lại lúc <strong className="text-white underline">{activeWindow.openTime}</strong>!
                  </div>
                </div>
              )}

              {result.result === 'ALREADY_USED' && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs sm:text-sm space-y-1 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    Cảnh báo: Vé đã được sử dụng qua cổng!
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    Vé đã từng được soát vào lúc: <strong className="text-rose-300 font-mono font-bold">{result.checkedInAt ? fmtDateTime(result.checkedInAt) : 'Thời gian trước đó'}</strong>.
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Vui lòng đối chiếu lại số ghế, phòng chiếu và thông tin người cầm vé!
                  </div>
                </div>
              )}

              {result.result === 'EXPIRED' && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs sm:text-sm space-y-1 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wide">
                    <CalendarX className="w-4 h-4 text-rose-400" />
                    Suất chiếu đã kết thúc hoặc quá giờ quét!
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    Suất chiếu diễn ra lúc: <strong className="text-white">{formatShowtimeRange(result.startTime, result.endTime)}</strong>. Cổng soát vé cho suất chiếu này đã hết hạn hiệu lực.
                  </div>
                </div>
              )}

              {/* TICKET SPECS GRID: FULL DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                
                {/* MOVIE TITLE */}
                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Tên phim</div>
                    <div className="text-base sm:text-lg font-bold text-white truncate">
                      {result.movieTitle || 'Vé điện tử TicketHub'}
                    </div>
                  </div>
                </div>

                {/* ROOM / AUDITORIUM */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Phòng chiếu</div>
                    <div className="text-base font-bold text-white">
                      {result.roomName || 'Phòng chiếu rạp'}
                    </div>
                  </div>
                </div>

                {/* SEAT NUMBER (HERO BADGE) */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Armchair className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Vị trí ghế</div>
                    <div className="text-xl font-black text-amber-400 font-mono tracking-wider">
                      {result.seatLabel || 'Chưa định danh'}
                    </div>
                  </div>
                </div>

                {/* MOVIE SHOWTIME RANGE (GIỜ CHIẾU CỦA PHIM) */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-purple-300 uppercase tracking-wider font-semibold flex items-center gap-1">
                      Giờ chiếu của phim
                    </div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      {formatShowtimeRange(result.startTime, result.endTime)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Thời gian suất chiếu chính thức
                    </div>
                  </div>
                </div>

                {/* CHECK-IN WINDOW (GIỜ ĐƯỢC PHÉP QUÉT VÉ) */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold flex items-center gap-1">
                      Giờ được phép quét vé
                    </div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {activeWindow ? activeWindow.fullText : 'Mở trước giờ chiếu 60 phút'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Hệ thống tự động mở cổng soát vé
                    </div>
                  </div>
                </div>

                {/* SCAN AT TIMESTAMP */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Thời điểm quét vé</div>
                    <div className="text-sm font-bold text-slate-200 font-mono">
                      {result.checkedInAt ? fmtDateTime(result.checkedInAt) : fmtDateTime(result.time)}
                    </div>
                  </div>
                </div>

                {/* TICKET ID */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Mã vé / ID</div>
                    <div className="text-xs font-bold text-slate-300 font-mono truncate">
                      {result.ticketId ? `TK-${result.ticketId}` : (result.code || 'Mã vé')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY STANDBY HERO CARD */
            <div className="card p-10 border-white/10 bg-slate-900/50 flex flex-col items-center justify-center text-center min-h-[340px]">
              <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
                <QrCode className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">
                Cổng Sẵn Sàng Soát Vé
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
                Hướng mã QR trên vé điện tử của khách hàng vào camera, hoặc nhập mã vé (VD: TK-182) / sử dụng máy đọc mã vạch USB để tiến hành xác thực.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5">Mở soát trước giờ chiếu 60p</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5">Auto Debounce 2.5s</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5">Âm thanh phản hồi</span>
              </div>
            </div>
          )}

          {/* =========================================================================
              RECENT SHIFT HISTORY LOG: REDESIGNED WITH FULL TICKET DETAILS
              ========================================================================= */}
          <div className="card p-4 sm:p-5 border-white/10 bg-slate-900/80 shadow-lg space-y-4">
            
            {/* HISTORY HEADER & FILTER TABS */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Lịch sử soát vé trong ca ({history.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Tabs */}
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      historyFilter === 'ALL'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất cả ({history.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('SUCCESS')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      historyFilter === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hợp lệ ({history.filter((h) => h.result === 'SUCCESS').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('ALERT')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      historyFilter === 'ALERT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cảnh báo ({history.filter((h) => h.result !== 'SUCCESS').length})
                  </button>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Xóa danh sách lịch sử ca trực hiện tại?')) {
                        setHistory([]);
                        localStorage.removeItem('tickethub_checkin_history');
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs transition-colors flex items-center gap-1"
                    title="Xóa toàn bộ lịch sử"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* HISTORY CARDS LIST */}
            {filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Chưa có lượt quét nào trong ca này.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredHistory.map((h, i) => {
                  const meta = RESULT_CONFIG[h.result] || RESULT_CONFIG.INVALID;
                  const Icon = meta.icon;
                  const itemWindow = h.startTime ? getCheckInWindow(h.startTime, h.endTime, h.checkInAllowedFrom) : null;
                  const isCurrentSelected = result && ((result.ticketId && result.ticketId === h.ticketId) || result.code === h.code);

                  return (
                    <div
                      key={(h.ticketId || h.code) + i}
                      onClick={() => setResult(h)}
                      className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                        isCurrentSelected
                          ? 'bg-slate-950 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                          : 'bg-slate-950/60 hover:bg-slate-950 border-white/5 hover:border-slate-700'
                      }`}
                    >
                      {/* HEADER: MOVIE TITLE & STATUS BADGE */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.badge}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                              {h.movieTitle || 'Vé điện tử TicketHub'}
                            </h4>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Mã vé: <span className="text-slate-300 font-semibold">{h.ticketId ? `TK-${h.ticketId}` : (h.code || 'Mã vé')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${meta.badge}`}>
                            {h.result}
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Quét lúc: <span className="text-slate-300 font-medium">{fmtTime(h.time)}</span>
                          </div>
                        </div>
                      </div>

                      {/* COMPREHENSIVE TICKET DETAILS: ROOM, SEAT, SHOWTIME, CHECK-IN WINDOW */}
                      <div className="mt-2.5 pt-2.5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        
                        {/* ROOM & SEAT */}
                        <div className="flex items-center gap-3 text-slate-300">
                          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            Phòng: <strong className="text-white">{h.roomName || 'Phòng chiếu rạp'}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Armchair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            Ghế: <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold">{h.seatLabel || 'Chưa định danh'}</span>
                          </span>
                        </div>

                        {/* MOVIE SHOWTIME RANGE */}
                        <div className="flex items-center gap-1 text-slate-300 text-[11px] truncate">
                          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-slate-400">Giờ chiếu:</span>
                          <span className="font-mono text-purple-300 font-semibold truncate">
                            {formatShowtimeRange(h.startTime, h.endTime)}
                          </span>
                        </div>

                        {/* CHECK-IN ALLOWED WINDOW */}
                        <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-white/5">
                          <CalendarCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-400">Giờ mở quét:</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {itemWindow ? itemWindow.fullText : 'Mở trước giờ chiếu 60 phút'}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline">
                            (Nhấp để xem lại hồ sơ)
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
