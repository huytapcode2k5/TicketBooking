import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/axios.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { Badge, PageHeader, Notice } from '../../components/admin/AdminUI.jsx';
import { fmtDateTime } from '../../utils/format.js';

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
                                        <td className="py-2 font-medium">{u.fullName}{self && <span className="ml-2 text-xs text-slate-500">(bạn)</span>}</td>
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