import { Link } from 'react-router-dom';
import { imgUrl, vnd } from '../../utils/format.js';
import { Star, Clock, Sparkles, ArrowRight, Ticket } from 'lucide-react';

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
          className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105 contrast-[1.03] brightness-[1.02]"
          loading="lazy"
        />

        {/* Ambient subtle vignette - Giữ ảnh poster sắc nét, không bị đục */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-black/40 opacity-40 group-hover:opacity-20 transition-opacity" />

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

        {/* Modern Cinematic Hover Quick Action Button */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/85 via-black/45 to-black/35 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
          <div className="transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-out">
            <span className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black tracking-wide text-white uppercase bg-gradient-to-r from-accent via-rose-500 to-amber-400 shadow-[0_0_25px_rgba(255,69,100,0.65),0_4px_14px_rgba(0,0,0,0.5)] border border-white/30 ring-2 ring-white/15 before:absolute before:inset-0 before:-translate-x-full group-hover:before:translate-x-full before:transition-transform before:duration-700 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent">
              <Ticket className="h-3.5 w-3.5 text-white" />
              <span>Chi tiết vé</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
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
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Giá từ</span>
            <span className="font-mono font-bold text-accent text-sm">
              {m.minPrice != null ? vnd(m.minPrice) : 'Liên hệ'}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 group-hover:text-accent transition-colors bg-white/[0.04] group-hover:bg-accent/10 px-2.5 py-1 rounded-lg border border-white/5 group-hover:border-accent/30">
            <span>Chi tiết vé</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
