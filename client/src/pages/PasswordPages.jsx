import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/axios.js';
import { KeyRound, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setMsg((await api.post('/auth/forgot-password', { email })).message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md card p-6 sm:p-8 space-y-5 bg-surface/90 border-white/10 shadow-2xl"
      >
        <div className="text-center space-y-1">
          <div className="h-12 w-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-2 shadow-glow-sm">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-display font-black text-2xl text-white">Quên mật khẩu</h1>
          <p className="text-xs text-slate-400">
            Nhập email của bạn để nhận liên kết khôi phục mật khẩu
          </p>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="label">Email đã đăng ký</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              className="input !pl-10"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn-primary w-full !py-3 text-sm shadow-glow flex items-center justify-center gap-2"
          disabled={loading}
        >
          <Sparkles className="h-4 w-4" />
          <span>{loading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}</span>
        </button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white pt-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại trang đăng nhập</span>
        </Link>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: params.get('token'), password });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md card p-6 sm:p-8 space-y-5 bg-surface/90 border-white/10 shadow-2xl"
      >
        <div className="text-center space-y-1">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-glow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display font-black text-2xl text-white">Đặt lại mật khẩu</h1>
          <p className="text-xs text-slate-400">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="label">Mật khẩu mới (tối thiểu 6 ký tự)</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              className="input !pl-10"
              type="password"
              minLength={6}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn-primary w-full !py-3 text-sm shadow-glow flex items-center justify-center gap-2"
          disabled={loading}
        >
          <span>{loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}</span>
        </button>
      </form>
    </div>
  );
}
