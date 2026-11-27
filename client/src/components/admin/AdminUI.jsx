import { useEffect, useState } from 'react';
import { api } from '../../api/axios.js';
import { imgUrl } from '../../utils/format.js';

/** Hộp thoại dùng chung cho các form quản trị. Bấm nền tối hoặc phím Esc để đóng. */
export function Modal({ title, onClose, children, wide }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`card my-8 w-full p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button className="btn-ghost !px-3 !py-1" onClick={onClose} aria-label="Đóng">✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export const Field = ({ label, hint, children }) => (
    <div>
        <label className="label">{label}</label>
        {children}
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
);

const TONES = {
    green: 'bg-green-500/20 text-green-300', red: 'bg-red-500/20 text-red-300', gold: 'bg-gold/20 text-gold',
    slate: 'bg-slate-500/20 text-slate-300', violet: 'bg-fuchsia-500/20 text-fuchsia-300',
};
export const Badge = ({ tone = 'slate', children }) => <span className={`rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap ${TONES[tone]}`}>{children}</span>;

export const PageHeader = ({ title, children }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex flex-wrap gap-2">{children}</div>
    </div>
);

export const Notice = ({ error, success }) => (
    <>
        {error && <div className="error-box">{error}</div>}
        {success && <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-300">{success}</div>}
    </>
);

/** Ô chọn ảnh: dán link hoặc tải từ máy lên (POST /api/admin/upload). */
export function ImageField({ label, value, onChange }) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const pick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        setBusy(true); setErr('');
        try { onChange((await api.post('/admin/upload', fd)).data.url); } catch (ex) { setErr(ex.message); } finally { setBusy(false); e.target.value = ''; }
    };
    return (
        <Field label={label}>
            <div className="flex gap-2">
                <input className="input" placeholder="https://... hoặc tải ảnh lên" value={value || ''} onChange={(e) => onChange(e.target.value)} />
                <label className="btn-ghost cursor-pointer whitespace-nowrap">{busy ? 'Đang tải...' : 'Tải ảnh'}<input type="file" accept="image/*" className="hidden" onChange={pick} /></label>
            </div>
            {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
            {value && <img src={imgUrl(value)} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
        </Field>
    );
}

// ---- Giờ Việt Nam <-> UTC cho <input type="datetime-local"> ----
export const toInputVN = (iso) => (iso ? new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : '');
export const fromInputVN = (v) => new Date(`${v}:00+07:00`).toISOString();

/** Tạo: bỏ ô trống. Sửa: ô trống thành null để xóa giá trị cũ. */
export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
export const nullify = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));

export { AdminEditingBadge, AdminEditingAlert } from './AdminPresence.jsx';

