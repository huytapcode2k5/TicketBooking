import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Ticket, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-accent to-rose-600 flex items-center justify-center text-white shadow-glow-sm group-hover:scale-105 transition-transform">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="font-display font-black text-2xl tracking-tight text-white">
              Ticket<span className="text-accent">Hub</span>
            </span>
          </Link>
          <h1 className="font-display font-extrabold text-2xl text-white">Đăng nhập tài khoản</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Truy cập để quản lý vé, xem lịch sử đặt vé và nhận ưu đãi
          </p>
        </div>

        {/* Login Card */}
        <form onSubmit={submit} className="card p-6 sm:p-8 space-y-5 bg-surface/90 border-white/10 shadow-2xl">
          {error && (
            <div className="error-box">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="label">Địa chỉ Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input !pl-10"
                type="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="label">Mật khẩu</label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input !pl-10 !pr-10"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary w-full !py-3 text-base shadow-glow flex items-center justify-center gap-2"
            disabled={loading}
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Register Prompt */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
