import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/axios.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { imgUrl, vnd, fmtTime, fmtDate, fmtDateTime, dayKey } from '../utils/format.js';
import { 
  Star, 
  Clock, 
  Calendar, 
  Building2, 
  Play, 
  MessageSquare, 
  Send, 
  Armchair, 
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  const loadReviews = () => api.get(`/movies/${id}/reviews`).then((r) => setReviews(r.data)).catch(() => {});

  useEffect(() => {
    setMovie(null);
    Promise.all([api.get(`/movies/${id}`), api.get(`/movies/${id}/showtimes`)])
      .then(([m, s]) => {
        setMovie(m.data);
        setShowtimes(s.data);
        setDay(s.data[0] ? dayKey(s.data[0].startTime) : '');
      })
      .catch((e) => setError(e.message));
    loadReviews();
  }, [id]);

  const days = useMemo(() => [...new Set(showtimes.map((s) => dayKey(s.startTime)))], [showtimes]);
  const byCinema = useMemo(() => {
    const groups = {};
    for (const s of showtimes.filter((x) => dayKey(x.startTime) === day)) {
      (groups[s.cinemaName] ||= []).push(s);
    }
    return groups;
  }, [showtimes, day]);

  const submitReview = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post(`/movies/${id}/reviews`, { rating, comment: comment || undefined });
      setComment('');
      setMsg('Cảm ơn bạn đã gửi đánh giá!');
      loadReviews();
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (error) return <div className="error-box">{error}</div>;
  if (!movie) return <Spinner label="Đang tải thông tin phim..." />;

  return (
    <div className="space-y-10">
      {/* Movie Hero Presentation */}
      <section className="relative overflow-hidden rounded-3xl card p-6 sm:p-10 border-white/10 bg-surface/90 shadow-2xl">
        <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Poster with glow */}
          <div className="relative group mx-auto md:mx-0 w-full max-w-[280px]">
            <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-accent to-rose-600 opacity-30 blur-lg group-hover:opacity-60 transition duration-500" />
            <img
              src={imgUrl(movie.posterUrl)}
              alt={movie.title}
              className="relative rounded-2xl w-full aspect-[2/3] object-cover shadow-2xl border border-white/10"
            />
          </div>

          {/* Movie Details */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                {movie.ageRating || 'P'}
              </span>

              {movie.durationMin && (
                <span className="flex items-center gap-1.5 rounded-lg bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  <span>{movie.durationMin} phút</span>
                </span>
              )}

              {movie.genres?.map((g) => (
                <span key={g.genreId} className="chip">
                  {g.name}
                </span>
              ))}

              {movie.avgRating != null && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300 shadow-glow-gold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{movie.avgRating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({movie.reviewCount} đánh giá)</span>
                </span>
              )}
            </div>

            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
              {movie.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 whitespace-pre-line leading-relaxed font-normal">
              {movie.description}
            </p>

            {/* Metadata list */}
            <div className="rounded-2xl bg-surface2/50 border border-white/5 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs sm:text-sm">
              {movie.director && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-24">Đạo diễn:</span>
                  <span className="text-white font-semibold">{movie.director}</span>
                </div>
              )}
              {movie.actors && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-24">Diễn viên:</span>
                  <span className="text-white font-semibold truncate">{movie.actors}</span>
                </div>
              )}
              {movie.language && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-24">Ngôn ngữ:</span>
                  <span className="text-white font-semibold">{movie.language}</span>
                </div>
              )}
              {movie.releaseDate && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-24">Khởi chiếu:</span>
                  <span className="text-white font-semibold">{fmtDate(movie.releaseDate)}</span>
                </div>
              )}
            </div>

            {/* Trailer Action */}
            {movie.trailerUrl && (
              <div className="pt-2">
                <a
                  className="btn-ghost !px-5 !py-2.5 text-xs sm:text-sm shadow-sm flex items-center gap-2 inline-flex"
                  href={movie.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Play className="h-4 w-4 text-accent fill-accent" />
                  <span>Xem Trailer chính thức</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Showtime Booking Section */}
      <section className="card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
              Lịch chiếu & Đặt vé
            </h2>
          </div>
        </div>

        {days.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Armchair className="h-10 w-10 text-slate-600 mx-auto stroke-[1.5]" />
            <p className="text-sm font-medium">Hiện chưa có suất chiếu nào đang mở bán cho phim này.</p>
          </div>
        ) : (
          <>
            {/* Date Selection Pills */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {days.map((d) => {
                const active = d === day;
                return (
                  <button
                    key={d}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex flex-col items-center select-none ${
                      active
                        ? 'bg-gradient-to-r from-accent to-rose-600 text-white shadow-glow-sm'
                        : 'bg-surface2/80 text-slate-300 hover:bg-white/[0.1] hover:text-white border border-white/5'
                    }`}
                    onClick={() => setDay(d)}
                  >
                    <span>{fmtDate(`${d}T12:00:00+07:00`)}</span>
                  </button>
                );
              })}
            </div>

            {/* Showtimes by Cinema */}
            <div className="mt-6 space-y-6">
              {Object.entries(byCinema).map(([cinema, list]) => (
                <div key={cinema} className="rounded-2xl bg-surface2/50 border border-white/10 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-base sm:text-lg">
                    <Building2 className="h-4 w-4 text-accent" />
                    <span>{cinema}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {list.map((s) => {
                      const left = s.totalSeats - s.soldSeats;
                      const isLow = left <= 10 && left > 0;
                      const isSoldOut = left <= 0;

                      return (
                        <div
                          key={s.showtimeId}
                          className="rounded-xl bg-surface/90 border border-white/10 p-4 flex items-center justify-between gap-3 hover:border-white/20 transition-all shadow-sm"
                        >
                          <div>
                            <div className="font-mono text-xl font-black text-white">
                              {fmtTime(s.startTime)}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {s.roomName} • từ{' '}
                              <span className="font-mono text-accent font-bold">
                                {vnd(s.minPrice)}
                              </span>
                            </div>
                            <div
                              className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                                isSoldOut
                                  ? 'text-slate-500'
                                  : isLow
                                  ? 'text-rose-400 animate-pulse'
                                  : 'text-emerald-400'
                              }`}
                            >
                              <Armchair className="h-3 w-3" />
                              <span>{isSoldOut ? 'Hết vé' : `Còn ${left} ghế trống`}</span>
                            </div>
                          </div>

                          {!isSoldOut ? (
                            <Link
                              className="btn-primary !py-2 !px-3.5 text-xs shadow-glow-sm"
                              to={`/booking/${s.showtimeId}`}
                            >
                              <span>Chọn ghế</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-white/5 text-[11px] font-bold text-slate-500 border border-white/5">
                              Hết chỗ
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Reviews & Ratings Section */}
      <section className="card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
          <div className="h-8 w-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
            Đánh giá từ khán giả
          </h2>
        </div>

        {user ? (
          <form onSubmit={submitReview} className="rounded-2xl bg-surface2/60 border border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Đánh giá của bạn:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRating(n)}
                    className="p-0.5 text-2xl transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        n <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="input !py-3 resize-none"
              rows={3}
              placeholder="Chia sẻ cảm nhận của bạn về nội dung, diễn xuất, âm thanh..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <div className="flex items-center justify-between">
              <button className="btn-primary !py-2.5 !px-5 text-xs sm:text-sm shadow-glow-sm flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Gửi đánh giá</span>
              </button>
              {msg && <span className="text-xs font-semibold text-emerald-400">{msg}</span>}
            </div>
          </form>
        ) : (
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 text-xs sm:text-sm text-slate-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <span>
              Vui lòng{' '}
              <Link className="text-accent font-bold hover:underline" to="/login">
                đăng nhập
              </Link>{' '}
              để gửi đánh giá và chấm điểm cho phim này.
            </span>
          </div>
        )}

        {/* Review list */}
        <div className="space-y-3 pt-2">
          {reviews.length === 0 && (
            <p className="text-slate-400 text-xs sm:text-sm py-4">Chưa có đánh giá nào cho phim này.</p>
          )}

          {reviews.map((r) => (
            <div key={r.reviewId} className="rounded-xl bg-surface2/40 border border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-accent to-rose-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                    {r.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="font-bold text-sm text-slate-200">{r.fullName}</span>
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {r.comment && <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-9">{r.comment}</p>}

              <div className="text-[10px] text-slate-500 pl-9">{fmtDateTime(r.createdAt)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
