import { SEAT_TYPE_LABEL } from '../../utils/format.js';

const base =
  'relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-tight transition-all duration-150 flex items-center justify-center select-none';

function seatClass(seat, selected) {
  if (selected) {
    return `${base} bg-accent text-white ring-2 ring-white/20 shadow-md scale-105 z-10`;
  }
  if (seat.seatStatus === 'SOLD') {
    return `${base} bg-slate-900/90 text-slate-700 border border-white/[0.04] cursor-not-allowed line-through`;
  }
  if (seat.seatStatus === 'HELD') {
    return `${base} bg-amber-500/20 border border-amber-500/30 text-amber-400 cursor-not-allowed`;
  }
  if (seat.seatType === 'VIP') {
    return `${base} bg-surface2/90 border border-amber-400/50 text-amber-300 hover:bg-amber-400/20 hover:scale-105`;
  }
  if (seat.seatType === 'COUPLE') {
    return `${base} bg-surface2/90 border border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-400/20 hover:scale-105`;
  }
  return `${base} bg-surface2 text-slate-300 hover:bg-white/15 hover:text-white hover:scale-105 border border-white/5`;
}

const LEGEND = [
  { cls: 'bg-surface2 border border-white/10 text-slate-300', label: 'Ghế thường' },
  { cls: 'bg-surface2 border border-amber-400/50 text-amber-300', label: 'Ghế VIP' },
  { cls: 'bg-surface2 border border-fuchsia-400/50 text-fuchsia-300', label: 'Ghế đôi' },
  { cls: 'bg-accent text-white', label: 'Đang chọn' },
  { cls: 'bg-amber-500/20 border border-amber-500/30 text-amber-400', label: 'Đang giữ chỗ' },
  { cls: 'bg-slate-900 text-slate-600 line-through', label: 'Đã bán' },
];

export default function SeatMap({ seats, selectedIds, onToggle, disabled }) {
  const rows = [...new Set(seats.map((s) => s.rowLabel))].sort();

  return (
    <div className="card p-6 sm:p-8 bg-surface/90 border-white/10 shadow-xl overflow-hidden">
      {/* Screen */}
      <div className="relative mx-auto mb-10 w-full max-w-lg text-center">
        <div className="mx-auto h-1.5 w-4/5 rounded-full bg-slate-500/40 shadow-sm" />
        <div className="mt-2.5 flex items-center justify-center gap-3">
          <div className="h-[1px] w-12 bg-white/10" />
          <span className="text-xs text-slate-400 font-medium">
            Màn hình chiếu
          </span>
          <div className="h-[1px] w-12 bg-white/10" />
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
