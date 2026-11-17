import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/axios.js';
import { getSocket } from '../api/socket.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import SeatMap from '../components/booking/SeatMap.jsx';
import CountdownTimer from '../components/booking/CountdownTimer.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { vnd, fmtDateTime, SEAT_TYPE_LABEL } from '../utils/format.js';
import { 
  Film, 
  Calendar, 
  Building2, 
  Armchair, 
  ArrowRight, 
  AlertCircle, 
  Lock, 
  ShieldCheck,
  Sparkles,
  Receipt
} from 'lucide-react';

export default function Booking() {
  const { showtimeId } = useParams();
  const id = Number(showtimeId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [expiresAt, setExpiresAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Đơn chờ thanh toán của mình cho suất này: ghế đang giữ thuộc về đơn đó, không cho đổi ghế
  const [pending, setPending] = useState(null);
  const selectedRef = useRef([]);
  selectedRef.current = selected;

  const loadSeats = useCallback(async () => {
    const res = await api.get(`/showtimes/${id}/seats`);
    setSeats(res.data);
    const mine = res.data.filter((s) => s.heldByMe && s.seatStatus === 'HELD');
    setSelected(mine.map((s) => s.seatId));
    setExpiresAt(mine[0]?.holdExpiresAt ?? null);
  }, [id]);

  const loadPending = useCallback(async () => {
    if (!user) return setPending(null);
    const r = await api.get(`/showtimes/${id}/pending-order`);
    setPending(r.data);
  }, [id, user]);

  useEffect(() => {
    api.get(`/showtimes/${id}`).then((r) => setShowtime(r.data)).catch((e) => setError(e.message));
    loadSeats().catch((e) => setError(e.message));
    loadPending().catch(() => {});
  }, [id, loadSeats, loadPending, user]);

  const cancelPending = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/orders/${pending.orderId}/cancel`, {});
      setPending(null);
    } catch (e) {
      setError(e.message);
    } finally {
      await Promise.all([loadSeats(), loadPending()]).catch(() => {});
      setBusy(false);
    }
  };

  // Realtime: người khác giữ / nhả / mua ghế thì sơ đồ đổi màu ngay
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('showtime:join', id);
    join();
    socket.on('connect', join);
    const apply = (status) => ({ showtimeId: sid, seatIds }) => {
      if (Number(sid) !== id) return;
      setSeats((prev) =>
        prev.map((s) => {
          if (!seatIds.includes(s.seatId) || selectedRef.current.includes(s.seatId)) return s;
          if (status === 'AVAILABLE' && s.seatStatus === 'SOLD') return s;
          return { ...s, seatStatus: status, heldByMe: false };
        })
      );
    };
    const onHeld = apply('HELD'),
      onReleased = apply('AVAILABLE'),
      onSold = apply('SOLD');
    socket.on('seat:held', onHeld);
    socket.on('seat:released', onReleased);
    socket.on('seat:sold', onSold);
    return () => {
      socket.emit('showtime:leave', id);
      socket.off('connect', join);
      socket.off('seat:held', onHeld);
      socket.off('seat:released', onReleased);
      socket.off('seat:sold', onSold);
    };
  }, [id]);

  // Hết giờ giữ chỗ
  const left = useCountdown(expiresAt);
  useEffect(() => {
    if (left === 0) {
      setError('Đã hết thời gian giữ chỗ. Vui lòng chọn lại ghế.');
      loadSeats().catch(() => {});
      loadPending().catch(() => {});
    }
  }, [left, loadSeats, loadPending]);

  const toggle = async (seat) => {
    if (!user) return navigate('/login', { state: { from: location } });
    if (busy) return;
    if (pending) return setError('Bạn đang có đơn chờ thanh toán cho suất này. Hãy thanh toán hoặc hủy đơn trước khi chọn lại ghế.');
    setError('');
    const next = selected.includes(seat.seatId)
      ? selected.filter((x) => x !== seat.seatId)
      : [...selected, seat.seatId];
    if (next.length > 8) return setError('Mỗi lần chỉ được chọn tối đa 8 ghế.');
    setBusy(true);
    try {
      if (next.length === 0) await api.delete(`/showtimes/${id}/hold`);
      else await api.post(`/showtimes/${id}/hold`, { seatIds: next });
    } catch (e) {
      setError(e.message);
    } finally {
      await loadSeats().catch(() => {});
      setBusy(false);
    }
  };

  const chosen = useMemo(() => seats.filter((s) => selected.includes(s.seatId)), [seats, selected]);
  const total = chosen.reduce((sum, s) => sum + (s.price ?? 0), 0);

  const next = () => {
    sessionStorage.setItem('booking', JSON.stringify({ showtimeId: id, seatIds: selected }));
    navigate('/checkout');
  };

  if (!showtime && !error) return <Spinner label="Đang tải dữ liệu suất chiếu..." />;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      {/* Left: Seat Map presentation */}
      <section className="space-y-4">
        {error && (
          <div className="error-box">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {pending && (
          <div className="rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-xs sm:text-sm text-amber-200">
            <Receipt className="h-5 w-5 flex-shrink-0 text-amber-400" />
            <span className="flex-1">
              Bạn đang có đơn <b className="font-mono text-white">#{pending.orderCode}</b> ({vnd(pending.totalAmount)}) chờ
              thanh toán cho suất này. Các ghế đang giữ thuộc về đơn đó nên chưa đổi được.
            </span>
            <div className="flex gap-2">
              <button className="btn btn-ghost !py-2 text-xs" onClick={cancelPending} disabled={busy}>
                Hủy đơn, chọn lại
              </button>
              <button className="btn btn-primary !py-2 text-xs" onClick={() => navigate(`/payment/${pending.orderId}`)}>
                Thanh toán
              </button>
            </div>
          </div>
        )}

        {seats.length === 0 ? (
          <Spinner label="Đang tải sơ đồ ghế..." />
        ) : (
          <SeatMap seats={seats} selectedIds={selected} onToggle={toggle} disabled={busy || !!pending} />
        )}

        {!user && (
          <div className="rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4 text-center text-xs sm:text-sm text-amber-300 flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            <span>
              Bạn cần{' '}
              <Link to="/login" state={{ from: location }} className="font-bold underline">
                đăng nhập
              </Link>{' '}
              để giữ và đặt ghế trực tiếp trên sơ đồ.
            </span>
          </div>
        )}
      </section>

      {/* Right Sidebar: Booking Order Summary */}
      <aside className="card p-6 sm:p-7 space-y-6 lg:sticky lg:top-24 border-white/10 shadow-2xl bg-surface/90">
        {showtime && (
          <div className="space-y-3 border-b border-white/10 pb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-3 py-0.5 text-[11px] font-bold text-accent uppercase tracking-wider">
              <Film className="h-3 w-3" />
              <span>Suất chiếu</span>
            </span>

            <h2 className="font-display font-extrabold text-xl text-white leading-tight">
              {showtime.movieTitle}
            </h2>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <span>
                  {showtime.cinemaName} • <b className="text-amber-300">{showtime.roomName}</b>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                <span>{fmtDateTime(showtime.startTime)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Realtime Countdown */}
        {expiresAt && (
          <div className="flex justify-center">
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        {/* Selected Seats List */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            <span>Ghế đã chọn ({chosen.length}/8)</span>
            {chosen.length > 0 && <span className="text-accent text-[11px] font-medium">Tối đa 8 ghế</span>}
          </div>

          {chosen.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-400 space-y-1">
              <Armchair className="h-6 w-6 text-slate-600 mx-auto" />
              <p>Chưa chọn ghế nào</p>
              <p className="text-[11px] text-slate-400">Nhấp vào ghế trống trên sơ đồ để chọn</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {chosen.map((s) => (
                <li
                  key={s.seatId}
                  className="rounded-xl bg-surface2/60 border border-white/5 px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span className="font-mono font-bold text-white text-sm">
                      {s.rowLabel}{s.colNumber}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({SEAT_TYPE_LABEL[s.seatType] || 'Ghế'})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-300">
                    {vnd(s.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Total Cost Calculation */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tạm tính:</span>
            <span className="font-mono text-2xl font-black text-amber-300">
              {vnd(total)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Ghế được giữ tự động trong thời gian giao dịch</span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          className="btn-primary w-full !py-3.5 text-base shadow-glow flex items-center justify-center gap-2"
          disabled={!selected.length || busy || left === 0}
          onClick={pending ? () => navigate(`/payment/${pending.orderId}`) : next}
        >
          <span>{pending ? 'Thanh toán đơn đang chờ' : 'Tiếp tục thanh toán'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </aside>
    </div>
  );
}
