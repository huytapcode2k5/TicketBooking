import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/axios.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { Badge, PageHeader, Notice } from '../../components/admin/AdminUI.jsx';
import { fmtDateTime, imgUrl } from '../../utils/format.js';

const ROLES = { USER: 'Người dùng', STAFF: 'Nhân viên soát vé', ADMIN: 'Quản trị viên' };

export default function AdminUsers() {
    const { user: me } = useAuth();
    const [rows, setRows] = useState(null);
    const [q, setQ] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = useCallback(() => api.get(`/admin/users?q=${encodeURIComponent(q.trim())}`).then((r) => setRows(r.data)).catch((e) => setError(e.message)), [q]);
    // Tìm kiếm có trễ 300ms để không gọi API sau mỗi phím gõ
    useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

    const update = async (u, patch, msg) => {
        setError(''); setSuccess('');
        try { await api.patch(`/admin/users/${u.userId}`, patch); setSuccess(msg); load(); } catch (e) { setError(e.message); }
    };

    return (
        <div className="space-y-5">
            <PageHeader title="Người dùng">
                <input className="input !w-64" placeholder="Tìm theo email hoặc tên..." value={q} onChange={(e) => setQ(e.target.value)} />
            </PageHeader>
            <Notice error={error} success={success} />
            {!rows ? <Spinner /> : (
                <div className="card overflow-x-auto p-4">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-400"><tr><th className="pb-2">Họ tên</th><th>Email</th><th>Điện thoại</th><th>Vai trò</th><th>Tham gia</th><th>Trạng thái</th><th /></tr></thead>
                        <tbody>
                            {rows.map((u) => {
                                const self = u.userId === me.userId;
                                return (
                                    <tr key={u.userId} className="border-t border-white/5">
                                        <td className="py-2.5 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0 border border-white/10">
                                                    {u.avatarUrl ? (
                                                        <img
                                                            src={imgUrl(u.avatarUrl)}
                                                            alt=""
                                                            referrerPolicy="no-referrer"
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        u.fullName?.charAt(0) || 'U'
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="truncate">{u.fullName}</span>
                                                        {self && <span className="text-[11px] text-slate-500 font-normal shrink-0">(bạn)</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {u.googleId && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                                                                Google
                                                            </span>
                                                        )}
                                                        {u.facebookId && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
                                                                Facebook
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{u.email}</td><td>{u.phone ?? '—'}</td>
                                        <td>
                                            <select className="input !w-auto !py-1.5 text-xs" disabled={self} value={u.role}
                                                onChange={(e) => window.confirm(`Đổi vai trò của ${u.fullName} thành "${ROLES[e.target.value]}"?`) && update(u, { role: e.target.value }, 'Đã đổi vai trò.')}>
                                                {Object.entries(ROLES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                            </select>
                                        </td>
                                        <td className="text-xs">{fmtDateTime(u.createdAt)}</td>
                                        <td><Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</Badge></td>
                                        <td className="text-right">
                                            <button className="btn-ghost !py-1 text-xs" disabled={self}
                                                onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')}>{u.isActive ? 'Khóa' : 'Mở khóa'}</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Không tìm thấy người dùng.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}