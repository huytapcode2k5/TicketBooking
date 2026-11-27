import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { Modal, Field, Badge, PageHeader, Notice, clean, nullify } from '../../components/admin/AdminUI.jsx';
import { SEAT_TYPE_LABEL } from '../../utils/format.js';
import { useAdminPresence } from '../../hooks/useAdminPresence.js';
import { AdminEditingBadge, AdminEditingAlert } from '../../components/admin/AdminPresence.jsx';

export default function AdminVenues() {
    const [cinemas, setCinemas] = useState(null);
    const [rooms, setRooms] = useState(null);
    const [modal, setModal] = useState(null); // { type: 'cinema'|'room'|'generate'|'seats', ... }
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { startEdit, stopEdit, isLockedByOther, getEditor } = useAdminPresence();

    const load = useCallback(() => Promise.all([api.get('/admin/cinemas'), api.get('/admin/rooms')])
        .then(([c, r]) => { setCinemas(c.data); setRooms(r.data); }).catch((e) => setError(e.message)), []);
    useEffect(() => { load(); }, [load]);

    const flash = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
    const done = (msg) => { setModal(null); flash(msg); load(); };
    const toggleCinema = async (c) => {
        try { await api.put(`/admin/cinemas/${c.cinemaId}`, { isActive: !c.isActive }); load(); } catch (e) { setError(e.message); }
    };

    if (!cinemas || !rooms) return error ? <div className="error-box">{error}</div> : <Spinner />;
    return (
        <div className="space-y-8">
            <Notice error={error} success={success} />

            <section className="space-y-3">
                <PageHeader title="Địa điểm"><button className="btn-primary" onClick={() => setModal({ type: 'cinema', form: { name: '', address: '', city: '', phone: '' } })}>+ Thêm địa điểm</button></PageHeader>
                <div className="card overflow-x-auto p-4">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-400"><tr><th className="pb-2">Tên</th><th>Địa chỉ</th><th>Thành phố</th><th>Số phòng</th><th>Trạng thái</th><th /></tr></thead>
                        <tbody>
                            {cinemas.map((c) => (
                                <tr key={c.cinemaId} className="border-t border-white/5">
                                    <td className="py-2 font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{c.name}</span>
                                            <AdminEditingBadge editor={getEditor('cinema', c.cinemaId)} />
                                        </div>
                                    </td>
                                    <td>{c.address}</td><td>{c.city}</td><td>{c.roomCount}</td>
                                    <td><Badge tone={c.isActive ? 'green' : 'slate'}>{c.isActive ? 'Đang hoạt động' : 'Tạm dừng'}</Badge></td>
                                    <td className="space-x-2 text-right whitespace-nowrap">
                                        <button className="btn-ghost !py-1 text-xs" onClick={() => setModal({ type: 'cinema', id: c.cinemaId, form: { name: c.name, address: c.address, city: c.city, phone: c.phone ?? '' } })}>Sửa</button>
                                        <button className="btn-ghost !py-1 text-xs" onClick={() => toggleCinema(c)}>{c.isActive ? 'Tạm dừng' : 'Mở lại'}</button>
                                    </td>
                                </tr>
                            ))}
                            {cinemas.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">Chưa có địa điểm.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-3">
                <PageHeader title="Phòng / hội trường"><button className="btn-primary" disabled={!cinemas.length} onClick={() => setModal({ type: 'room', form: { cinemaId: cinemas[0]?.cinemaId, name: '' } })}>+ Thêm phòng</button></PageHeader>
                <div className="card overflow-x-auto p-4">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-400"><tr><th className="pb-2">Phòng</th><th>Địa điểm</th><th>Sơ đồ</th><th /></tr></thead>
                        <tbody>
                            {rooms.map((r) => (
                                <tr key={r.roomId} className="border-t border-white/5">
                                    <td className="py-2 font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{r.name}</span>
                                            <AdminEditingBadge editor={getEditor('room', r.roomId)} />
                                        </div>
                                    </td>
                                    <td>{r.cinemaName}</td>
                                    <td>{r.totalRows ? `${r.totalRows} hàng × ${r.totalCols} cột` : <Badge tone="gold">Chưa có ghế</Badge>}</td>
                                    <td className="text-right whitespace-nowrap">
                                        {r.totalRows
                                            ? <button className="btn-ghost !py-1 text-xs" onClick={() => setModal({ type: 'seats', room: r })}>Xem / sửa ghế</button>
                                            : <button className="btn-primary !py-1 text-xs" onClick={() => setModal({ type: 'generate', room: r })}>Tạo sơ đồ ghế</button>}
                                    </td>
                                </tr>
                            ))}
                            {rooms.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">Chưa có phòng.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            {modal?.type === 'cinema' && (
                <CinemaForm
                    modal={modal}
                    onClose={() => setModal(null)}
                    onSaved={done}
                    presence={{
                        editor: modal.id ? getEditor('cinema', modal.id) : null,
                        isLocked: modal.id ? isLockedByOther('cinema', modal.id) : false,
                        startEdit,
                        stopEdit,
                    }}
                />
            )}
            {modal?.type === 'room' && <RoomForm modal={modal} cinemas={cinemas} onClose={() => setModal(null)} onSaved={done} />}
            {modal?.type === 'generate' && <GenerateSeats room={modal.room} onClose={() => setModal(null)} onSaved={done} />}
            {modal?.type === 'seats' && (
                <SeatEditor
                    room={modal.room}
                    onClose={() => setModal(null)}
                    presence={{
                        editor: getEditor('room', modal.room.roomId),
                        isLocked: isLockedByOther('room', modal.room.roomId),
                        startEdit,
                        stopEdit,
                    }}
                />
            )}
        </div>
    );
}

function CinemaForm({ modal, onClose, onSaved, presence }) {
    useEffect(() => {
        if (modal?.id && presence?.startEdit) {
            presence.startEdit('cinema', modal.id);
            return () => presence.stopEdit('cinema', modal.id);
        }
    }, [modal?.id, presence]);

    const [f, setF] = useState(modal.form);
    const [error, setError] = useState('');
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const submit = async (e) => {
        e.preventDefault(); setError('');
        try {
            if (modal.id) await api.put(`/admin/cinemas/${modal.id}`, nullify(f)); else await api.post('/admin/cinemas', clean(f));
            onSaved(modal.id ? 'Đã lưu địa điểm.' : 'Đã thêm địa điểm.');
        } catch (err) { setError(err.message); }
    };
    return (
        <Modal title={modal.id ? 'Sửa địa điểm' : 'Thêm địa điểm'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                {presence && <AdminEditingAlert editor={presence.editor} isLockedByOther={presence.isLocked} />}
                {error && <div className="error-box">{error}</div>}
                <Field label="Tên *"><input className="input" required value={f.name} onChange={set('name')} /></Field>
                <Field label="Địa chỉ *"><input className="input" required value={f.address} onChange={set('address')} /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Thành phố *"><input className="input" required value={f.city} onChange={set('city')} /></Field>
                    <Field label="Điện thoại"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
                </div>
                <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary">Lưu</button></div>
            </form>
        </Modal>
    );
}

function RoomForm({ modal, cinemas, onClose, onSaved }) {
    const [f, setF] = useState(modal.form);
    const [error, setError] = useState('');
    const submit = async (e) => {
        e.preventDefault(); setError('');
        try { await api.post('/admin/rooms', { cinemaId: Number(f.cinemaId), name: f.name }); onSaved('Đã thêm phòng. Hãy tạo sơ đồ ghế cho phòng này.'); } catch (err) { setError(err.message); }
    };
    return (
        <Modal title="Thêm phòng" onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                {error && <div className="error-box">{error}</div>}
                <Field label="Địa điểm *"><select className="input" value={f.cinemaId} onChange={(e) => setF({ ...f, cinemaId: e.target.value })}>{cinemas.map((c) => <option key={c.cinemaId} value={c.cinemaId}>{c.name}</option>)}</select></Field>
                <Field label="Tên phòng *"><input className="input" required placeholder="Phòng 1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary">Thêm</button></div>
            </form>
        </Modal>
    );
}

function GenerateSeats({ room, onClose, onSaved }) {
    const [f, setF] = useState({ rows: 8, cols: 10, vipFromRow: '', vipToRow: '' });
    const [error, setError] = useState('');
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const submit = async (e) => {
        e.preventDefault(); setError('');
        const body = { rows: Number(f.rows), cols: Number(f.cols) };
        if (f.vipFromRow && f.vipToRow) { body.vipFromRow = Number(f.vipFromRow); body.vipToRow = Number(f.vipToRow); }
        try { await api.post(`/admin/rooms/${room.roomId}/generate-seats`, body); onSaved('Đã tạo sơ đồ ghế.'); } catch (err) { setError(err.message); }
    };
    return (
        <Modal title={`Tạo sơ đồ ghế · ${room.name}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                {error && <div className="error-box">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Số hàng (1-26)"><input className="input" type="number" min={1} max={26} required value={f.rows} onChange={set('rows')} /></Field>
                    <Field label="Số cột (1-30)"><input className="input" type="number" min={1} max={30} required value={f.cols} onChange={set('cols')} /></Field>
                    <Field label="VIP từ hàng thứ" hint="Ví dụ 4 = hàng D"><input className="input" type="number" min={1} value={f.vipFromRow} onChange={set('vipFromRow')} /></Field>
                    <Field label="VIP đến hàng thứ"><input className="input" type="number" min={1} value={f.vipToRow} onChange={set('vipToRow')} /></Field>
                </div>
                <p className="text-xs text-slate-500">Sau khi tạo, bạn có thể đổi từng ghế thành VIP, ghế đôi hoặc tắt ghế ở mục "Xem / sửa ghế". Chỉ tạo được một lần cho mỗi phòng.</p>
                <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary">Tạo ghế</button></div>
            </form>
        </Modal>
    );
}

const TOOLS = [['NORMAL', 'Thường'], ['VIP', 'VIP'], ['COUPLE', 'Ghế đôi'], ['OFF', 'Tắt ghế']];
const seatColor = (s) => !s.isActive ? 'bg-slate-900 text-slate-700 line-through'
    : s.seatType === 'VIP' ? 'bg-surface2 border border-gold text-gold'
        : s.seatType === 'COUPLE' ? 'bg-surface2 border border-fuchsia-400 text-fuchsia-300' : 'bg-surface2 text-slate-300';

function SeatEditor({ room, onClose, presence }) {
    useEffect(() => {
        if (room?.roomId && presence?.startEdit) {
            presence.startEdit('room', room.roomId);
            return () => presence.stopEdit('room', room.roomId);
        }
    }, [room?.roomId, presence]);

    const [seats, setSeats] = useState(null);
    const [tool, setTool] = useState('VIP');
    const [error, setError] = useState('');
    useEffect(() => { api.get(`/admin/rooms/${room.roomId}/seats`).then((r) => setSeats(r.data)).catch((e) => setError(e.message)); }, [room.roomId]);

    const apply = async (s) => {
        setError('');
        const body = tool === 'OFF' ? { isActive: false } : { seatType: tool, isActive: true };
        try {
            const r = await api.patch(`/admin/seats/${s.seatId}`, body);
            setSeats((prev) => prev.map((x) => (x.seatId === s.seatId ? { ...x, ...r.data } : x)));
        } catch (e) { setError(e.message); }
    };

    const rows = seats ? [...new Set(seats.map((s) => s.rowLabel))].sort() : [];
    return (
        <Modal wide title={`Sơ đồ ghế · ${room.name}`} onClose={onClose}>
            {presence && <AdminEditingAlert editor={presence.editor} isLockedByOther={presence.isLocked} />}
            {error && <div className="error-box mb-3">{error}</div>}
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-400">Bấm vào ghế để đổi thành:</span>
                {TOOLS.map(([k, label]) => <button key={k} className={`chip ${tool === k ? 'chip-active' : ''}`} onClick={() => setTool(k)}>{label}</button>)}
            </div>
            {!seats ? <Spinner /> : (
                <div className="overflow-x-auto">
                    <div className="mx-auto w-fit space-y-1.5">
                        {rows.map((row) => (
                            <div key={row} className="flex items-center gap-1.5">
                                <span className="w-5 text-xs text-slate-500">{row}</span>
                                {seats.filter((s) => s.rowLabel === row).sort((a, b) => a.colNumber - b.colNumber).map((s) => (
                                    <button key={s.seatId} title={`${row}${s.colNumber} · ${SEAT_TYPE_LABEL[s.seatType]}${s.isActive ? '' : ' (tắt)'}`}
                                        className={`h-8 w-8 rounded-lg text-xs ${seatColor(s)}`} onClick={() => apply(s)}>{s.colNumber}</button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <p className="mt-4 text-xs text-slate-500">Nên sửa ghế trước khi mở bán vé. Giá vé theo loại ghế được đặt ở từng suất chiếu.</p>
        </Modal>
    );
}