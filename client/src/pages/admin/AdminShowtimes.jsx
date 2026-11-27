import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { Modal, Field, Badge, PageHeader, Notice, fromInputVN } from '../../components/admin/AdminUI.jsx';
import { fmtDateTime, vnd } from '../../utils/format.js';
import { useAdminPresence } from '../../hooks/useAdminPresence.js';
import { AdminEditingBadge, AdminEditingAlert } from '../../components/admin/AdminPresence.jsx';

export default function AdminShowtimes() {
    const [rows, setRows] = useState(null);
    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [movieId, setMovieId] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { startEdit, stopEdit, isLockedByOther, getEditor } = useAdminPresence();

    const load = useCallback(() => api.get(`/admin/showtimes${movieId ? `?movieId=${movieId}` : ''}`).then((r) => setRows(r.data)).catch((e) => setError(e.message)), [movieId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        api.get('/admin/movies').then((r) => setMovies(r.data.filter((m) => m.status !== 'HIDDEN'))).catch(() => { });
        api.get('/admin/rooms').then((r) => setRooms(r.data)).catch(() => { });
    }, []);

    const flash = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
    const cancel = async (s) => {
        if (!window.confirm(`Hủy suất ${fmtDateTime(s.startTime)} của "${s.movieTitle}"?`)) return;
        try { await api.delete(`/admin/showtimes/${s.showtimeId}`); flash('Đã hủy suất chiếu.'); load(); } catch (e) { setError(e.message); }
    };

    const now = Date.now();
    const statusBadge = (s) => s.status === 'CANCELLED' ? <Badge tone="red">Đã hủy</Badge>
        : new Date(s.endTime).getTime() < now ? <Badge>Đã qua</Badge>
            : new Date(s.startTime).getTime() < now ? <Badge tone="gold">Đang diễn ra</Badge> : <Badge tone="green">Đang mở bán</Badge>;

    return (
        <div className="space-y-5">
            <PageHeader title="Suất chiếu">
                <div className="flex items-center gap-3">
                    <AdminEditingBadge editor={getEditor('showtime', 'new')} />
                    <button className="btn-primary" onClick={() => setCreating(true)}>+ Thêm suất</button>
                </div>
            </PageHeader>
            <Notice error={error} success={success} />
            <select className="input !w-auto" value={movieId} onChange={(e) => setMovieId(e.target.value)}>
                <option value="">Tất cả sự kiện</option>
                {movies.map((m) => <option key={m.movieId} value={m.movieId}>{m.title}</option>)}
            </select>

            {!rows ? <Spinner /> : (
                <div className="card overflow-x-auto p-4">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-400"><tr><th className="pb-2">Sự kiện</th><th>Địa điểm · Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Đã bán</th><th>Giá từ</th><th>Trạng thái</th><th /></tr></thead>
                        <tbody>
                            {rows.map((s) => (
                                <tr key={s.showtimeId} className="border-t border-white/5">
                                    <td className="py-2 font-medium">{s.movieTitle}</td>
                                    <td>{s.cinemaName} · {s.roomName}</td>
                                    <td>{fmtDateTime(s.startTime)}</td><td>{fmtDateTime(s.endTime)}</td>
                                    <td>{s.soldSeats}/{s.totalSeats}</td><td>{vnd(s.minPrice)}</td>
                                    <td>{statusBadge(s)}</td>
                                    <td className="text-right">
                                        {s.status === 'SCHEDULED' && new Date(s.startTime).getTime() > now &&
                                            <button className="btn-ghost !py-1 text-xs" disabled={s.soldSeats > 0} title={s.soldSeats > 0 ? 'Đã có vé bán, hãy hoàn vé trước' : ''} onClick={() => cancel(s)}>Hủy suất</button>}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-400">Chưa có suất chiếu.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {creating && (
                <ShowtimeForm
                    movies={movies}
                    rooms={rooms}
                    onClose={() => setCreating(false)}
                    onSaved={() => { setCreating(false); flash('Đã tạo suất chiếu.'); load(); }}
                    presence={{
                        editor: getEditor('showtime', 'new'),
                        isLocked: isLockedByOther('showtime', 'new'),
                        startEdit,
                        stopEdit,
                    }}
                />
            )}
        </div>
    );
}

function ShowtimeForm({ movies, rooms, onClose, onSaved, presence }) {
    useEffect(() => {
        if (presence?.startEdit) {
            presence.startEdit('showtime', 'new');
            return () => presence.stopEdit('showtime', 'new');
        }
    }, [presence]);

    const usable = rooms.filter((r) => r.totalRows > 0 && r.isActive);
    const [f, setF] = useState({ movieId: movies[0]?.movieId ?? '', roomId: usable[0]?.roomId ?? '', startTime: '', normalPrice: 80000, vipPrice: 110000, couplePrice: 200000 });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

    const movie = movies.find((m) => String(m.movieId) === String(f.movieId));
    const endPreview = useMemo(() => (movie && f.startTime ? new Date(fromInputVN(f.startTime)).getTime() + (movie.durationMin + 15) * 60000 : null), [movie, f.startTime]);

    const submit = async (e) => {
        e.preventDefault(); setError(''); setSaving(true);
        try {
            await api.post('/admin/showtimes', {
                movieId: Number(f.movieId), roomId: Number(f.roomId), startTime: fromInputVN(f.startTime),
                normalPrice: Number(f.normalPrice), vipPrice: Number(f.vipPrice), couplePrice: Number(f.couplePrice),
            });
            onSaved();
        } catch (err) { setError(err.message); } finally { setSaving(false); }
    };

    return (
        <Modal title="Thêm suất chiếu" onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                {presence && <AdminEditingAlert editor={presence.editor} isLockedByOther={presence.isLocked} />}
                {error && <div className="error-box">{error}</div>}
                <Field label="Sự kiện *"><select className="input" required value={f.movieId} onChange={set('movieId')}>{movies.map((m) => <option key={m.movieId} value={m.movieId}>{m.title} ({m.durationMin} phút)</option>)}</select></Field>
                <Field label="Phòng *" hint={usable.length < rooms.length ? 'Chỉ hiện phòng đã có sơ đồ ghế.' : undefined}>
                    <select className="input" required value={f.roomId} onChange={set('roomId')}>{usable.map((r) => <option key={r.roomId} value={r.roomId}>{r.cinemaName} · {r.name}</option>)}</select>
                </Field>
                <Field label="Giờ bắt đầu (giờ Việt Nam) *" hint={endPreview ? `Dự kiến kết thúc: ${fmtDateTime(endPreview)} (đã cộng 15 phút dọn phòng)` : undefined}>
                    <input className="input" type="datetime-local" required value={f.startTime} onChange={set('startTime')} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Giá thường"><input className="input" type="number" min={0} step={1000} required value={f.normalPrice} onChange={set('normalPrice')} /></Field>
                    <Field label="Giá VIP"><input className="input" type="number" min={0} step={1000} required value={f.vipPrice} onChange={set('vipPrice')} /></Field>
                    <Field label="Giá ghế đôi"><input className="input" type="number" min={0} step={1000} required value={f.couplePrice} onChange={set('couplePrice')} /></Field>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn-primary" disabled={saving || !f.movieId || !f.roomId}>{saving ? 'Đang tạo...' : 'Tạo suất'}</button>
                </div>
            </form>
        </Modal>
    );
}