import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { Modal, Field, Badge, PageHeader, Notice, ImageField, clean, nullify } from '../../components/admin/AdminUI.jsx';
import { imgUrl } from '../../utils/format.js';

const STATUS = { NOW_SHOWING: ['Đang mở bán', 'green'], COMING_SOON: ['Sắp mở bán', 'gold'], ENDED: ['Đã kết thúc', 'slate'], HIDDEN: ['Đã ẩn', 'red'] };
const EMPTY = { title: '', description: '', durationMin: 120, ageRating: 'P', director: '', actors: '', language: '', posterUrl: '', bannerUrl: '', trailerUrl: '', releaseDate: '', status: 'COMING_SOON', genreIds: [] };

export default function AdminEvents() {
    const [rows, setRows] = useState(null);
    const [genres, setGenres] = useState([]);
    const [filter, setFilter] = useState({ q: '', status: '' });
    const [editing, setEditing] = useState(null); // null: đóng | { id?, form }
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = useCallback(() => api.get('/admin/movies').then((r) => setRows(r.data)).catch((e) => setError(e.message)), []);
    useEffect(() => { load(); api.get('/genres').then((r) => setGenres(r.data)).catch(() => { }); }, [load]);

    const list = useMemo(() => (rows ?? []).filter((m) =>
        m.title.toLowerCase().includes(filter.q.toLowerCase()) && (!filter.status || m.status === filter.status)), [rows, filter]);

    const flash = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };

    const openEdit = async (m) => {
        setError('');
        try {
            const d = (await api.get(`/admin/movies/${m.movieId}`)).data;
            setEditing({ id: d.movieId, form: { ...EMPTY, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])), releaseDate: d.releaseDate ? String(d.releaseDate).slice(0, 10) : '', genreIds: d.genreIds } });
        } catch (e) { setError(e.message); }
    };

    const setStatus = async (m, status) => {
        try { await api.put(`/admin/movies/${m.movieId}`, { status }); flash('Đã cập nhật trạng thái.'); load(); } catch (e) { setError(e.message); }
    };

    return (
        <div className="space-y-5">
            <PageHeader title="Quản lý sự kiện">
                <button className="btn-primary" onClick={() => setEditing({ form: { ...EMPTY } })}>+ Thêm sự kiện</button>
            </PageHeader>
            <Notice error={error} success={success} />
            <div className="flex flex-wrap gap-2">
                <input className="input !w-64" placeholder="Tìm theo tên..." value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
                <select className="input !w-auto" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">Mọi trạng thái</option>
                    {Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                </select>
            </div>

            {!rows ? <Spinner /> : (
                <div className="card overflow-x-auto p-4">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-400"><tr><th className="pb-2">Poster</th><th>Tên</th><th>Thời lượng</th><th>Độ tuổi</th><th>Khởi chiếu</th><th>Trạng thái</th><th /></tr></thead>
                        <tbody>
                            {list.map((m) => (
                                <tr key={m.movieId} className="border-t border-white/5">
                                    <td className="py-2"><img src={imgUrl(m.posterUrl)} alt="" className="h-14 w-10 rounded object-cover" /></td>
                                    <td className="font-medium">{m.title}</td>
                                    <td>{m.durationMin} phút</td>
                                    <td>{m.ageRating}</td>
                                    <td>{m.releaseDate ? String(m.releaseDate).slice(0, 10) : '—'}</td>
                                    <td><Badge tone={STATUS[m.status]?.[1]}>{STATUS[m.status]?.[0] ?? m.status}</Badge></td>
                                    <td className="space-x-2 text-right whitespace-nowrap">
                                        <button className="btn-ghost !py-1 text-xs" onClick={() => openEdit(m)}>Sửa</button>
                                        {m.status === 'HIDDEN'
                                            ? <button className="btn-ghost !py-1 text-xs" onClick={() => setStatus(m, 'COMING_SOON')}>Hiện lại</button>
                                            : <button className="btn-ghost !py-1 text-xs" onClick={() => window.confirm(`Ẩn "${m.title}" khỏi trang chủ?`) && setStatus(m, 'HIDDEN')}>Ẩn</button>}
                                    </td>
                                </tr>
                            ))}
                            {list.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Không có sự kiện nào.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && <EventForm editing={editing} genres={genres} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); flash(msg); load(); }} />}
        </div>
    );
}

function EventForm({ editing, genres, onClose, onSaved }) {
    const [f, setF] = useState(editing.form);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const toggleGenre = (id) => setF({ ...f, genreIds: f.genreIds.includes(id) ? f.genreIds.filter((x) => x !== id) : [...f.genreIds, id] });

    const submit = async (e) => {
        e.preventDefault(); setError(''); setSaving(true);
        try {
            const body = { ...f, durationMin: Number(f.durationMin) };
            if (editing.id) await api.put(`/admin/movies/${editing.id}`, nullify(body));
            else await api.post('/admin/movies', clean(body));
            onSaved(editing.id ? 'Đã lưu thay đổi.' : 'Đã thêm sự kiện.');
        } catch (err) { setError(err.message); } finally { setSaving(false); }
    };

    return (
        <Modal wide title={editing.id ? 'Sửa sự kiện' : 'Thêm sự kiện'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                {error && <div className="error-box">{error}</div>}
                <Field label="Tên phim / sự kiện *"><input className="input" required value={f.title} onChange={set('title')} /></Field>
                <Field label="Mô tả"><textarea className="input" rows={4} value={f.description} onChange={set('description')} /></Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Thời lượng (phút) *"><input className="input" type="number" min={1} required value={f.durationMin} onChange={set('durationMin')} /></Field>
                    <Field label="Độ tuổi">
                        <select className="input" value={f.ageRating} onChange={set('ageRating')}>{['P', 'K', 'T13', 'T16', 'T18'].map((a) => <option key={a}>{a}</option>)}</select>
                    </Field>
                    <Field label="Trạng thái">
                        <select className="input" value={f.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}</select>
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Đạo diễn / ban tổ chức"><input className="input" value={f.director} onChange={set('director')} /></Field>
                    <Field label="Diễn viên / khách mời"><input className="input" value={f.actors} onChange={set('actors')} /></Field>
                    <Field label="Ngôn ngữ"><input className="input" value={f.language} onChange={set('language')} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ngày khởi chiếu / diễn ra"><input className="input" type="date" value={f.releaseDate} onChange={set('releaseDate')} /></Field>
                    <Field label="Link trailer (YouTube...)"><input className="input" value={f.trailerUrl} onChange={set('trailerUrl')} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ImageField label="Poster (dọc)" value={f.posterUrl} onChange={(v) => setF({ ...f, posterUrl: v })} />
                    <ImageField label="Banner (ngang, cho trang chủ)" value={f.bannerUrl} onChange={(v) => setF({ ...f, bannerUrl: v })} />
                </div>
                <Field label="Thể loại">
                    <div className="flex flex-wrap gap-2">
                        {genres.map((g) => (
                            <button type="button" key={g.genreId} className={`chip ${f.genreIds.includes(g.genreId) ? 'chip-active' : ''}`} onClick={() => toggleGenre(g.genreId)}>{g.name}</button>
                        ))}
                    </div>
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                </div>
            </form>
        </Modal>
    );
}