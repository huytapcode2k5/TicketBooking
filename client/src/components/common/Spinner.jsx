import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Đang tải dữ liệu...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-10 w-10 rounded-full bg-accent/20 blur-md animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
      <span className="text-sm font-medium tracking-wide text-slate-300">{label}</span>
    </div>
  );
}
