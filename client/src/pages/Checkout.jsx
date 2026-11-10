import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/axios.js';
import { useCountdown } from '../hooks/useCountdown.js';
import CountdownTimer from '../components/booking/CountdownTimer.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { vnd, fmtDateTime, SEAT_TYPE_LABEL } from '../utils/format.js';
import { 
  Film, 
  Building2, 
  Calendar, 
  Armchair, 
  Coffee, 
  Tag, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Minus, 
  ShieldCheck, 
  AlertCircle,
  CreditCard
} from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const booking = useMemo(() => JSON.parse(sessionStorage.getItem('booking') || 'null'), []);
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [products, setProducts] = useState([]);
  const [qty, setQty] = useState({});
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!booking) return navigate('/', { replace: true });
    Promise.all([
      api.get(`/showtimes/${booking.showtimeId}`),
      api.get(`/showtimes/${booking.showtimeId}/seats`),
      api.get('/products'),
    ])
      .then(([st, se, pr]) => {
        const mine = se.data.filter(
          (s) => booking.seatIds.includes(s.seatId) && s.heldByMe && s.seatStatus === 'HELD'
        );
        if (mine.length !== booking.seatIds.length) {
          setError('Thời gian giữ chỗ đã hết hoặc ghế không còn thuộc về bạn.');
          return;
        }
        setShowtime(st.data);
        setSeats(mine);
        setProducts(pr.data);
        setExpiresAt(mine[0].holdExpiresAt);
      })
      .catch((e) => setError(e.message));
  }, [booking, navigate]);

  const left = useCountdown(expiresAt);
  const ticketTotal = seats.reduce((s, x) => s + (x.price ?? 0), 0);
  const combos = products
    .filter((p) => qty[p.productId] > 0)
    .map((p) => ({ productId: p.productId, quantity: qty[p.productId] }));
  const comboTotal = products.reduce((s, p) => s + p.price * (qty[p.productId] || 0), 0);
  const subTotal = ticketTotal + comboTotal;
  const discount = coupon?.valid ? coupon.discountAmount : 0;

  useEffect(() => {
    if (coupon) applyCoupon();
  }, [subTotal]);

  async function applyCoupon() {
    if (!code.trim()) return;
    try {
      const r = await api.post('/coupons/validate', { code: code.trim(), subTotal });
      setCoupon(r.data);
      setCouponMsg(r.message);
    } catch (e) {
      setCoupon(null);
      setCouponMsg(e.message);
    }
  }

  const setQ = (p, d) =>
    setQty((q) => ({ ...q, [p.productId]: Math.max(0, Math.min(20, (q[p.productId] || 0) + d)) }));

  const pay = async () => {
    setError('');
    setSubmitting(true);
    try {
      const r = await api.post('/orders', {
        showtimeId: booking.showtimeId,
        seatIds: booking.seatIds,
        couponCode: coupon?.valid ? coupon.code : undefined,
        combos: combos.length ? combos : undefined,
      });
      navigate(`/payment/${r.data.orderId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !showtime)
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <div className="error-box">{error}</div>
        {booking && (
          <Link className="btn-primary !px-6" to={`/booking/${booking.showtimeId}`}>
            Chọn lại ghế
          </Link>
        )}
      </div>
    );
  if (!showtime) return <Spinner label="Đang tải thông tin thanh toán..." />;

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
      <div className="space-y-6">
        {/* Ticket Summary Section */}
        <section className="card p-6 sm:p-7 space-y-4 bg-surface/90 border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Film className="h-5 w-5 text-accent" />
            <h2 className="font-display font-bold text-lg text-white">Vé đã chọn</h2>
          </div>

          <div>
            <h3 className="font-display font-extrabold text-xl text-white">{showtime.movieTitle}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-accent" />
                {showtime.cinemaName} • <b className="text-amber-300">{showtime.roomName}</b>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="h-4 w-4 text-slate-500" />
                {fmtDateTime(showtime.startTime)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/5 pt-2">
            {seats.map((s) => (
              <div key={s.seatId} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-amber-400" />
                  <span className="font-mono font-bold text-white text-base">
                    Ghế {s.rowLabel}{s.colNumber}
                  </span>
                  <span className="text-slate-400 text-xs">({SEAT_TYPE_LABEL[s.seatType] || 'Ghế'})</span>
                </div>
                <span className="font-mono font-bold text-slate-200">{vnd(s.price)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Combos Section */}
        {products.length > 0 && (
          <section className="card p-6 sm:p-7 space-y-4 bg-surface/90 border-white/10">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Coffee className="h-5 w-5 text-amber-400" />
              <h2 className="font-display font-bold text-lg text-white">Combo bắp nước & Snack</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              {products.map((p) => {
                const count = qty[p.productId] || 0;
                return (
                  <div
                    key={p.productId}
                    className={`rounded-2xl bg-surface2/60 border p-4 flex items-center justify-between gap-3 transition-all ${
                      count > 0 ? 'border-accent/40 bg-accent/5' : 'border-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{p.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</div>
                      <div className="font-mono font-extrabold text-amber-300 text-sm mt-1">
                        {vnd(p.price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-surface rounded-xl p-1 border border-white/10">
                      <button
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all disabled:opacity-30"
                        disabled={count <= 0}
                        onClick={() => setQ(p, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-sm text-white">{count}</span>
                      <button
                        className="h-7 w-7 rounded-lg flex items-center justify-center bg-accent/20 hover:bg-accent/40 text-accent transition-all"
                        onClick={() => setQ(p, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Promo Code Section */}
        <section className="card p-6 sm:p-7 space-y-3 bg-surface/90 border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Tag className="h-5 w-5 text-emerald-400" />
            <h2 className="font-display font-bold text-lg text-white">Mã ưu đãi / Khuyến mãi</h2>
          </div>

          <div className="flex gap-2">
            <input
              className="input uppercase font-mono tracking-wider"
              placeholder="Nhập mã (ví dụ: GIAM20K)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn-ghost whitespace-nowrap !px-5" onClick={applyCoupon}>
              Áp dụng
            </button>
          </div>

          {couponMsg && (
            <p
              className={`text-xs font-semibold flex items-center gap-1.5 pt-1 ${
                coupon?.valid ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {coupon?.valid ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              <span>{couponMsg}</span>
            </p>
          )}
        </section>
      </div>

      {/* Right: Payment Breakdown Card */}
      <aside className="card p-6 sm:p-7 space-y-5 lg:sticky lg:top-24 border-white/10 shadow-2xl bg-surface/90">
        <div className="flex justify-center">
          <CountdownTimer expiresAt={expiresAt} />
        </div>

        <div className="space-y-3 text-sm divide-y divide-white/5 pt-2">
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Vé xem phim ({seats.length})</span>
            <span className="font-mono font-bold text-white">{vnd(ticketTotal)}</span>
          </div>

          {comboTotal > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Combo bắp nước</span>
              <span className="font-mono font-bold text-white">{vnd(comboTotal)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between py-1 text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                <span>Giảm giá</span>
              </span>
              <span className="font-mono">−{vnd(discount)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4 flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng thanh toán:</span>
          <span className="font-mono text-3xl font-black text-amber-300">
            {vnd(subTotal - discount)}
          </span>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn-primary w-full !py-3.5 text-base shadow-glow flex items-center justify-center gap-2"
          disabled={submitting || left === 0}
          onClick={pay}
        >
          <CreditCard className="h-4 w-4" />
          <span>{submitting ? 'Đang tạo giao dịch...' : 'Thanh toán qua PayOS'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <Link
          className="btn-ghost w-full !py-2.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5"
          to={`/booking/${booking.showtimeId}`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại chọn lại ghế</span>
        </Link>

        <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Giao dịch bảo mật 100% qua cổng VietQR PayOS</span>
        </div>
      </aside>
    </div>
  );
}
