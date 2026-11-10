import { Link } from 'react-router-dom';
import { imgUrl, vnd } from '../../utils/format.js';
import { Star, Clock, Sparkles, ArrowRight } from 'lucide-react';

export default function MovieCard({ m }) {
  const soldOut = m.upcomingShowtimes > 0 && m.soldOutShowtimes >= m.upcomingShowtimes;

  // Custom age rating colors
  const ageRatingClass = (rating) => {
    switch (rating) {
      case 'P':
        return 'bg-emerald-500/80 text-white border-emerald-400/30';
      case 'T13':
        return 'bg-amber-500/80 text-white border-amber-400/30';
      case 'T16':
        return 'bg-orange-500/80 text-white border-orange-400/30';
      case 'T18':
        return 'bg-red-600/85 text-white border-red-500/30';
      default:
        return 'bg-black/60 text-slate-200 border-white/10';
    }
  };

  return (
    <Link
      to={`/events/${m.movieId}`}
      className="card card-hover group block overflow-hidden rounded-2xl bg-surface/80 border border-white/[0.08]"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
        <img
          src={imgUrl(m.posterUrl)}
          alt={m.title}
          className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient top vignette & badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/60 opacity-80 group-hover:opacity-60 transition-opacity" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          <span
            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase backdrop-blur-md border ${ageRatingClass(
              m.ageRating
            )}`}
          >
            {m.ageRating || 'P'}
          </span>

          {m.avgRating != null && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-xs font-bold text-amber-300 border border-white/10 shadow-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{m.avgRating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Status badges */}
        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
          {m.status === 'COMING_SOON' && (
            <span className="rounded-lg bg-amber-400/90 backdrop-blur-md text-slate-950 px-2 py-0.5 text-[11px] font-extrabold tracking-wide uppercase shadow-glow-gold flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              <span>Sắp chiếu</span>
            </span>
          )}
          {soldOut && (
            <span className="rounded-lg bg-red-600/90 backdrop-blur-md text-white px-2 py-0.5 text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
              Hết vé
            </span>
          )}
        </div>

        {/* Hover Quick Action */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="btn-primary !py-2 !px-4 text-xs shadow-glow">
            <span>Chi tiết & Đặt vé</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col justify-between">
        <div>
          <h3 className="font-display font-bold text-sm sm:text-base text-slate-100 line-clamp-2 min-h-[2.75rem] group-hover:text-accent transition-colors">
            {m.title}
          </h3>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            {m.durationMin && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-500" />
                <span>{m.durationMin} phút</span>
              </span>
            )}
            {m.durationMin && m.genres && <span>•</span>}
            <span className="line-clamp-1">{m.genres}</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs sm:text-sm">
          <span className="text-[11px] text-slate-400 font-medium">Giá vé từ</span>
          <span className="font-mono font-bold text-accent text-sm">
            {m.minPrice != null ? vnd(m.minPrice) : 'Liên hệ'}
          </span>
        </div>
      </div>
    </Link>
  );
}
