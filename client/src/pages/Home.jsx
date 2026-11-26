import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/axios.js';
import MovieCard from '../components/movie/MovieCard.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { imgUrl, vnd } from '../utils/format.js';
import { 
  Flame, 
  CalendarDays, 
  LayoutGrid, 
  MapPin, 
  Tags, 
  Search, 
  Sparkles, 
  Ticket, 
  Star, 
  ChevronDown,
  Clock,
  Film,
  ArrowRight
} from 'lucide-react';

const STATUS_TABS = [
  { val: 'NOW_SHOWING', label: 'Đang mở bán', icon: Flame },
  { val: 'COMING_SOON', label: 'Sắp khởi chiếu', icon: CalendarDays },
  { val: '', label: 'Tất cả phim', icon: LayoutGrid },
];
const LIMIT = 12;

export default function Home() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [status, setStatus] = useState(params.get('status') || (q ? '' : 'NOW_SHOWING'));
  const [genreId, setGenreId] = useState('');
  const [cinemaId, setCinemaId] = useState('');
  const [genres, setGenres] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/genres').then((r) => setGenres(r.data)).catch(() => {});
    api.get('/cinemas').then((r) => setCinemas(r.data)).catch(() => {});
    // Tự động lấy phim/sự kiện tiêu điểm tuần được đặt nhiều vé nhất
    api.get('/movies/featured').then((r) => setFeatured(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    const paramStatus = params.get('status');
    const paramCinema = params.get('cinemaId');
    if (paramStatus !== null) {
      setStatus(paramStatus);
    } else if (q) {
      setStatus('');
    }
    if (paramCinema !== null) {
      setCinemaId(paramCinema);
    }
  }, [q, params]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page, limit: LIMIT });
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    if (genreId) qs.set('genreId', genreId);
    if (cinemaId) qs.set('cinemaId', cinemaId);
    api
      .get(`/movies?${qs}`)
      .then((r) => {
        setItems((prev) => (page === 1 ? r.data.items : [...prev, ...r.data.items]));
        setTotal(r.data.total);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, status, genreId, cinemaId, page]);

  return (
    <div className="space-y-10">
      {/* Cinematic Hero Spotlight */}
      {featured && !q && (
        <section className="relative overflow-hidden rounded-3xl min-h-[380px] sm:min-h-[440px] flex items-end border border-white/10 shadow-2xl bg-surface group">
          {/* Background Poster/Banner - HD Sharp Rendering */}
          <img
            src={imgUrl(featured.bannerUrl || featured.posterUrl)}
            alt={featured.title}
            className="absolute inset-0 h-full w-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 opacity-80 brightness-[1.05] contrast-[1.05]"
          />

          {/* Vignette Gradients - Giữ sáng rõ nét ảnh, chỉ làm mờ nhẹ phần chữ */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/40 to-transparent" />

          {/* Hero Content */}
          <div className="relative p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 px-2.5 py-1 text-xs font-medium text-white">
                <Flame className="h-3.5 w-3.5 text-accent" />
                <span>Tiêu điểm tuần</span>
                {featured.weeklyBookedCount > 0 ? (
                  <span className="text-slate-300">
                    · {featured.weeklyBookedCount} vé tuần này
                  </span>
                ) : featured.totalBookedCount > 0 ? (
                  <span className="text-slate-300">
                    · {featured.totalBookedCount} vé đã đặt
                  </span>
                ) : null}
              </span>

              {featured.ageRating && (
                <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-xs font-semibold text-slate-200 border border-white/10">
                  {featured.ageRating}
                </span>
              )}

              {featured.durationMin && (
                <span className="flex items-center gap-1 text-xs text-slate-300 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{featured.durationMin} phút</span>
                </span>
              )}
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              {featured.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 line-clamp-2 leading-relaxed max-w-xl font-normal">
              {featured.description || featured.genres || 'Trải nghiệm suất chiếu điện ảnh mãn nhãn với công nghệ âm thanh vòm sống động.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to={`/events/${featured.movieId}`}
                className="btn-primary !px-6 !py-3 text-sm font-semibold inline-flex items-center gap-2.5 rounded-xl shadow-sm active:scale-[0.98]"
              >
                <Ticket className="h-4 w-4" />
                <span>Đặt vé ngay</span>
                <ArrowRight className="h-4 w-4 opacity-70" />
              </Link>

              {featured.minPrice != null && (
                <div className="px-3.5 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs sm:text-sm flex items-center gap-2 text-slate-300">
                  <span>Giá từ</span>
                  <span className="font-mono font-semibold text-white">
                    {vnd(featured.minPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Filter and Browse Section */}
      <section className="space-y-6">
        {/* Status Tabs & Cinema Selection Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-xl bg-surface2/50 border border-white/5">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_TABS.map(({ val, label, icon: Icon }) => {
              const active = status === val;
              return (
                <button
                  key={label}
                  onClick={() => setStatus(val)}
                  className={`flex items-center gap-2 text-xs sm:text-sm py-2 px-3.5 rounded-lg transition-colors select-none font-medium ${
                    active
                      ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-accent' : 'text-slate-500'}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Cinema Filter Dropdown */}
          <div className="relative min-w-[200px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              className="input !pl-9 !py-2 text-xs sm:text-sm appearance-none cursor-pointer pr-8 bg-surface/90 border-white/10 text-slate-200 rounded-lg"
              value={cinemaId}
              onChange={(e) => setCinemaId(e.target.value)}
            >
              <option value="">Tất cả cụm rạp</option>
              {cinemas.map((c) => (
                <option key={c.cinemaId} value={c.cinemaId}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Genre Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            className={`chip whitespace-nowrap ${genreId === '' ? 'chip-active' : ''}`}
            onClick={() => setGenreId('')}
          >
            <Tags className="h-3 w-3" />
            <span>Tất cả thể loại</span>
          </button>
          {genres.map((g) => {
            const active = String(genreId) === String(g.genreId);
            return (
              <button
                key={g.genreId}
                className={`chip whitespace-nowrap ${active ? 'chip-active' : ''}`}
                onClick={() => setGenreId(g.genreId)}
              >
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search status notification */}
        {q && (
          <div className="flex items-center justify-between gap-3 text-sm text-slate-300 px-4 py-2.5 rounded-xl bg-surface2/60 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-accent shrink-0" />
              <span>
                Kết quả tìm kiếm cho: <b className="text-white font-bold">"{q}"</b> ({total} phim & sự kiện)
              </span>
            </div>
            <button
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete('q');
                setParams(next);
              }}
              className="text-xs text-accent hover:text-accent-hover underline cursor-pointer shrink-0"
            >
              Xóa tìm kiếm
            </button>
          </div>
        )}

        {/* Error State */}
        {error && <div className="error-box">{error}</div>}

        {/* Movie Grid */}
        {loading && page === 1 ? (
          <Spinner label="Đang tải danh sách phim..." />
        ) : (
          <>
            {items.length === 0 && !error && (
              <div className="card py-16 px-4 text-center space-y-3">
                <Film className="h-12 w-12 text-slate-600 mx-auto stroke-[1.5]" />
                <h3 className="font-display font-bold text-lg text-slate-200">
                  Không tìm thấy sự kiện phù hợp
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc thể loại khác để xem các suất chiếu khả dụng.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {items.map((m) => (
                <MovieCard key={m.movieId} m={m} />
              ))}
            </div>

            {/* Pagination / Load More */}
            {items.length < total && (
              <div className="pt-8 text-center">
                <button
                  className="btn-ghost !px-8 !py-3 text-sm font-semibold rounded-2xl border-white/15 hover:border-accent/40"
                  disabled={loading}
                  onClick={() => setPage(page + 1)}
                >
                  {loading ? 'Đang tải thêm...' : 'Xem thêm phim & sự kiện'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
