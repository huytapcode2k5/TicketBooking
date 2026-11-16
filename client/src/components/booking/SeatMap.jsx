import { SEAT_TYPE_LABEL } from '../../utils/format.js';
import { Sparkles, Heart } from 'lucide-react';

const base =
  'relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-tighter transition-all duration-200 flex items-center justify-center select-none';

function seatClass(seat, selected) {
  if (selected) {
    return `${base} bg-gradient-to-tr from-accent via-rose-500 to-rose-600 text-white ring-2 ring-white shadow-glow scale-105 z-10`;
  }
  if (seat.seatStatus === 'SOLD') {
    return `${base} bg-slate-900/90 text-slate-700 border border-white/[0.04] cursor-not-allowed line-through`;
  }
  if (seat.seatStatus === 'HELD') {
    return `${base} bg-amber-500/20 border border-amber-500/40 text-amber-400 cursor-not-allowed animate-pulse`;
  }
  if (seat.seatType === 'VIP') {
    return `${base} bg-surface2/90 border-2 border-amber-400/70 text-amber-300 hover:bg-amber-400/25 hover:scale-105 shadow-sm`;
  }
  if (seat.seatType === 'COUPLE') {
    return `${base} bg-surface2/90 border-2 border-fuchsia-400/70 text-fuchsia-300 hover:bg-fuchsia-400/25 hover:scale-105 shadow-sm`;
  }
  return `${base} bg-surface2 text-slate-300 hover:bg-white/20 hover:text-white hover:scale-105 border border-white/5`;
}

const LEGEND = [
  { cls: 'bg-surface2 border border-white/10 text-slate-300', label: 'Ghế thường' },
  { cls: 'bg-surface2 border-2 border-amber-400/70 text-amber-300', label: 'Ghế VIP' },
  { cls: 'bg-surface2 border-2 border-fuchsia-400/70 text-fuchsia-300', label: 'Ghế đôi' },
  { cls: 'bg-gradient-to-tr from-accent to-rose-600 text-white shadow-glow-sm', label: 'Đang chọn' },
  { cls: 'bg-amber-500/25 border border-amber-500/40 text-amber-400', label: 'Đang giữ chỗ' },
  { cls: 'bg-slate-900 text-slate-600 line-through', label: 'Đã bán' },
];

export default function SeatMap({ seats, selectedIds, onToggle, disabled }) {
  const rows = [...new Set(seats.map((s) => s.rowLabel))].sort();

  return (
    <div className="card p-6 sm:p-8 bg-surface/90 border-white/10 shadow-2xl overflow-hidden">
      {/* Curved Screen with Ambient Glow */}
      <div className="relative mx-auto mb-10 w-full max-w-lg text-center">
        <div className="relative mx-auto h-3 w-4/5 rounded-t-[100%] bg-gradient-to-b from-accent/90 via-rose-500/40 to-transparent shadow-[0_-8px_30px_rgba(255,69,100,0.6)]" />
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-600" />
          <span className="text-[11px] font-extrabold tracking-[0.35em] text-slate-400 uppercase">
            Màn hình chiếu
          </span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-600" />
        </div>
      </div>

      {/* Seat Grid */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="mx-auto w-fit space-y-2.5">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-2.5 sm:gap-3">
              <span className="w-5 text-center text-xs font-bold text-slate-400 select-none">
                {row}
              </span>
              <div className="flex gap-1.5 sm:gap-2">
                {seats
                  .filter((s) => s.rowLabel === row)
                  .sort((a, b) => a.colNumber - b.colNumber)
                  .map((s) => {
                    const selected = selectedIds.includes(s.seatId);
                    const blocked = !selected && ['SOLD', 'HELD'].includes(s.seatStatus);
                    return (
                      <button
                        key={s.seatId}
                        disabled={disabled || blocked}
                        onClick={() => onToggle(s)}
                        title={`Ghế ${row}${s.colNumber} · ${SEAT_TYPE_LABEL[s.seatType] || 'Ghế'}`}
                        aria-label={`Ghế ${row}${s.colNumber}`}
                        className={seatClass(s, selected)}
                      >
                        {row}{s.colNumber}
                        {s.seatType === 'VIP' && !selected && (
                          <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-amber-400 pointer-events-none" />
                        )}
                        {s.seatType === 'COUPLE' && !selected && (
                          <Heart className="absolute -top-1 -right-1 h-2.5 w-2.5 text-fuchsia-400 pointer-events-none fill-fuchsia-400/50" />
                        )}
                      </button>
                    );
                  })}
              </div>
              <span className="w-5 text-center text-xs font-bold text-slate-400 select-none">
                {row}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-medium text-slate-300">
        {LEGEND.map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`h-4 w-4 rounded-md flex items-center justify-center text-[8px] font-bold ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
