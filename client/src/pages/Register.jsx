import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Ticket, User, Mail, Phone, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form, phone: form.phone || undefined });
      navigate('/', { replace: true });
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
          <h1 className="font-display font-extrabold text-2xl text-white">Tạo tài khoản mới</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Trở thành thành viên để tích điểm và đặt vé siêu tốc
          </p>
        </div>

        {/* Register Card */}
        <form onSubmit={submit} className="card p-6 sm:p-8 space-y-4 bg-surface/90 border-white/10 shadow-2xl">
          {error && (
            <div className="error-box">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="label">Họ và tên</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input !pl-10"
                required
                placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={set('fullName')}
              />
            </div>
          </div>

          {/* Email */}
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
                onChange={set('email')}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="label">Số điện thoại (tùy chọn)</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input !pl-10"
                type="tel"
                placeholder="0912 345 678"
                value={form.phone}
                onChange={set('phone')}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="label">Mật khẩu (tối thiểu 6 ký tự)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input !pl-10 !pr-10"
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
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

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary w-full !py-3 text-base shadow-glow flex items-center justify-center gap-2 mt-2"
            disabled={loading}
          >
            <Sparkles className="h-4 w-4" />
            <span>{loading ? 'Đang khởi tạo...' : 'Đăng ký tài khoản'}</span>
          </button>

          <p className="text-xs sm:text-sm text-slate-400 text-center pt-2">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
