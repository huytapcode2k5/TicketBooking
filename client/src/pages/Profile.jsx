import { useState } from 'react';
import { api } from '../api/axios.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Save, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Shield
} from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '' });
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const run = async (fn) => {
    setMsg('');
    setError('');
    try {
      setMsg(await fn());
    } catch (e) {
      setError(e.message);
    }
  };

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api.put('/users/me', form);
      setUser(r.data);
      return r.message;
    });
  };

  const changePw = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api.put('/users/me/password', pw);
      setPw({ oldPassword: '', newPassword: '' });
      return r.message;
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header with Avatar */}
      <div className="card p-6 sm:p-7 flex items-center gap-5 bg-surface/90 border-white/10 shadow-2xl">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-accent via-rose-500 to-amber-400 p-[2px] shadow-glow-sm">
          <div className="h-full w-full bg-surface rounded-[14px] flex items-center justify-center font-display font-black text-2xl text-white uppercase">
            {user.fullName?.charAt(0) || 'U'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white">
              {user.fullName}
            </h1>
            <span className="rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 text-[11px] font-bold text-accent uppercase">
              {user.role}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            <span>{user.email}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {msg && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{msg}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={save} className="card p-6 sm:p-7 space-y-4 bg-surface/90 border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <User className="h-4 w-4 text-accent" />
          <h2 className="font-display font-bold text-base text-white">Thông tin tài khoản</h2>
        </div>

        <div className="space-y-1.5">
          <label className="label">Địa chỉ Email (Cố định)</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input className="input !pl-10 opacity-60 cursor-not-allowed" disabled value={user.email} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label">Họ và tên</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input !pl-10"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label">Số điện thoại</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input !pl-10"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <button className="btn-primary !py-2.5 !px-5 text-xs sm:text-sm shadow-glow-sm flex items-center gap-2">
          <Save className="h-4 w-4" />
          <span>Lưu thông tin</span>
        </button>
      </form>

      {/* Change Password Form */}
      <form onSubmit={changePw} className="card p-6 sm:p-7 space-y-4 bg-surface/90 border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <KeyRound className="h-4 w-4 text-amber-400" />
          <h2 className="font-display font-bold text-base text-white">Đổi mật khẩu</h2>
        </div>

        <div className="space-y-1.5">
          <label className="label">Mật khẩu hiện tại</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input !pl-10"
              type="password"
              placeholder="••••••••"
              required
              value={pw.oldPassword}
              onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label">Mật khẩu mới (tối thiểu 6 ký tự)</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input !pl-10"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
          </div>
        </div>

        <button className="btn-ghost !py-2.5 !px-5 text-xs sm:text-sm flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <span>Cập nhật mật khẩu</span>
        </button>
      </form>
    </div>
  );
}
