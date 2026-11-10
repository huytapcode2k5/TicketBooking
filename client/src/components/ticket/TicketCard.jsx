import { fmtDateTime, SEAT_TYPE_LABEL } from '../../utils/format.js';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Armchair, 
  Download, 
  RotateCcw, 
  QrCode, 
  Ticket as TicketIcon 
} from 'lucide-react';

export default function TicketCard({ t, onRefund, canRefund }) {
  return (
    <div className="relative card flex flex-col md:flex-row overflow-hidden border border-white/10 shadow-2xl bg-surface/90 hover:border-white/20 transition-all">
      {/* Left section: Ticket Details */}
      <div className="flex-1 p-6 sm:p-7 flex flex-col justify-between">
        <div>
          {/* Header & Order Code */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                <TicketIcon className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-xs uppercase font-bold text-slate-300">
                Mã đơn: <span className="text-white">#{t.orderCode}</span>
              </span>
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              Vé hợp lệ
            </span>
          </div>

          {/* Event Title */}
          <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white mt-3 leading-snug">
            {t.movieTitle}
          </h3>

          {/* Location & Room */}
          <div className="mt-3 space-y-1.5 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="font-semibold text-slate-200">{t.cinemaName}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-bold">{t.roomName}</span>
            </div>
            {t.address && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-6">
                <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 -ml-6" />
                <span className="line-clamp-1">{t.address}</span>
              </div>
            )}
          </div>

          {/* Time & Seat Tags */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface2/60 border border-white/5 p-3 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-accent" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Thời gian</div>
                <div className="text-xs sm:text-sm font-bold text-white">{fmtDateTime(t.startTime)}</div>
              </div>
            </div>

            <div className="rounded-xl bg-surface2/60 border border-white/5 p-3 flex items-center gap-3">
              <Armchair className="h-5 w-5 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Vị trí ghế</div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  Ghế <span className="text-amber-300 font-mono text-base">{t.seatLabel}</span> ({SEAT_TYPE_LABEL[t.seatType] || 'Ghế'})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2.5 items-center">
          <a
            className="btn-primary !py-2 text-xs sm:text-sm"
            href={t.qrDataUrl}
            download={`ve-${t.ticketId}.png`}
          >
            <Download className="h-4 w-4" />
            <span>Tải vé PNG</span>
          </a>

          {canRefund && (
            <button
              className="btn-danger !py-2 text-xs sm:text-sm"
              onClick={() => onRefund(t)}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Hủy vé</span>
            </button>
          )}
        </div>
      </div>

      {/* Decorative Ticket Perforation (Notches) */}
      <div className="hidden md:block relative w-[2px] bg-dashed border-r border-dashed border-white/20 self-stretch my-2">
        <div className="absolute -top-3.5 -left-3 h-6 w-6 rounded-full bg-bg border border-white/10" />
        <div className="absolute -bottom-3.5 -left-3 h-6 w-6 rounded-full bg-bg border border-white/10" />
      </div>

      {/* Right section: QR Code Stub */}
      <div className="flex flex-col items-center justify-center gap-3 border-t md:border-t-0 border-dashed border-white/15 bg-white p-6 md:w-56 flex-shrink-0">
        <div className="relative p-2 bg-white rounded-2xl shadow-md border border-slate-200">
          <img src={t.qrDataUrl} alt="Mã QR vé" className="h-36 w-36 object-contain" />
          <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-accent" />
          <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-accent" />
          <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-accent" />
          <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-accent" />
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-800 uppercase tracking-widest">
            <QrCode className="h-3 w-3 text-accent" />
            <span>Check-in QR</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 break-all select-all font-semibold">
            {t.qrToken?.slice(0, 16).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
