import { useCountdown, mmss } from '../../hooks/useCountdown.js';
import { Timer, AlertTriangle } from 'lucide-react';

export default function CountdownTimer({ expiresAt, label = 'Thời gian giữ ghế' }) {
  const left = useCountdown(expiresAt);
  if (left == null) return null;
  const urgent = left <= 60;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 border backdrop-blur-md transition-all duration-300 ${
        urgent
          ? 'bg-red-500/15 border-red-500/40 text-red-300 animate-pulse shadow-glow-sm'
          : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
      }`}
    >
      {urgent ? (
        <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />
      ) : (
        <Timer className="h-4 w-4 text-amber-400" />
      )}
      <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      <span className="font-mono text-base font-extrabold tracking-wider bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
        {mmss(left)}
      </span>
    </div>
  );
}
