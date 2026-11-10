import { Link } from 'react-router-dom';
import { Compass, Film, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-16 px-4 space-y-6">
      <div className="relative">
        <div className="text-8xl sm:text-9xl font-display font-black text-white/5 select-none tracking-widest">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-3xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-glow">
            <Film className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
          Trang không tồn tại
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Đường dẫn bạn truy cập có thể đã bị xóa hoặc thay đổi địa chỉ.
        </p>
      </div>

      <Link
        to="/"
        className="btn-primary !py-3 !px-6 text-sm shadow-glow flex items-center gap-2"
      >
        <Home className="h-4 w-4" />
        <span>Quay về trang chủ</span>
      </Link>
    </div>
  );
}
