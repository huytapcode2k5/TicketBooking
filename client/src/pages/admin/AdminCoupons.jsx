import { useEffect, useState } from 'react';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { vnd, fmtDateTime, imgUrl } from '../../utils/format.js';
import { TicketPercent, Popcorn, Plus, Pencil, Power, X, AlertCircle, CheckCircle2, Upload } from 'lucide-react';

/** B6 – Quản lý mã giảm giá và combo (bắp nước). Không xóa cứng vì đơn cũ còn tham chiếu, chỉ bật/tắt. */
export default function AdminCoupons() {
  const [tab, setTab] = useState('coupons');
  const [coupons, setCoupons] = useState(null);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null); // { kind: 'coupon' | 'product', row: object | null }

  const load = () =>
    Promise.all([api.get('/admin/coupons'), api.get('/admin/products')])
      .then(([c, p]) => {
        setCoupons(c.data);
        setProducts(p.data);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = async (kind, row) => {
    const url = kind === 'coupon' ? `/admin/coupons/${row.couponId}` : `/admin/products/${row.productId}`;
    try {
      await api.put(url, { isActive: !row.isActive });
      setToast(row.isActive ? 'Đã tắt' : 'Đã bật lại');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onSaved = (msg) => {
    setEditing(null);
    setToast(msg);
    load();
  };

  if (!coupons || !products) {
    return error ? <ErrorBox msg={error} /> : <Spinner label="Đang tải mã giảm giá và combo..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
            <TicketPercent className="h-4 w-4" />
            <span>Bán hàng</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">Mã giảm giá và combo</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Mã và combo đang bật sẽ dùng được ngay ở trang thanh toán.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ kind: tab === 'coupons' ? 'coupon' : 'product', row: null })}>
          <Plus className="h-4 w-4" />
          {tab === 'coupons' ? 'Thêm mã giảm giá' : 'Thêm combo'}
        </button>
      </div>

      <div className="flex gap-2">
        <button className={tab === 'coupons' ? 'chip chip-active' : 'chip'} onClick={() => setTab('coupons')}>
          <TicketPercent className="h-3.5 w-3.5" /> Mã giảm giá ({coupons.length})
        </button>
        <button className={tab === 'products' ? 'chip chip-active' : 'chip'} onClick={() => setTab('products')}>
          <Popcorn className="h-3.5 w-3.5" /> Combo ({products.length})
        </button>
      </div>

      {error && <ErrorBox msg={error} onClose={() => setError('')} />}

      <div className="card p-4 sm:p-6 bg-surface/90 border-white/10 shadow-2xl">
        {tab === 'coupons' ? (
          <CouponTable rows={coupons} onEdit={(row) => setEditing({ kind: 'coupon', row })} onToggle={(row) => toggle('coupon', row)} />
        ) : (
          <ProductTable rows={products} onEdit={(row) => setEditing({ kind: 'product', row })} onToggle={(row) => toggle('product', row)} />
        )}
      </div>

      {editing?.kind === 'coupon' && <CouponForm row={editing.row} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {editing?.kind === 'product' && <ProductForm row={editing.row} onClose={() => setEditing(null)} onSaved={onSaved} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-4 py-3 text-sm text-emerald-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Bảng

function couponStatus(c) {
  const now = Date.now();
  if (!c.isActive) return ['Đã tắt', 'bg-slate-400/15 border-slate-400/30 text-slate-300'];
  if (new Date(c.endAt).getTime() < now) return ['Hết hạn', 'bg-red-400/15 border-red-400/30 text-red-300'];
  if (new Date(c.startAt).getTime() > now) return ['Chưa bắt đầu', 'bg-sky-400/15 border-sky-400/30 text-sky-300'];
  if (c.maxUses != null && c.usedCount >= c.maxUses) return ['Hết lượt', 'bg-amber-400/15 border-amber-400/30 text-amber-300'];
  return ['Đang dùng', 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'];
}

const discountText = (c) =>
  c.discountType === 'PERCENT'
    ? `${c.discountValue}%${c.maxDiscount ? ` (tối đa ${vnd(c.maxDiscount)})` : ''}`
    : vnd(c.discountValue);

function CouponTable({ rows, onEdit, onToggle }) {
  if (!rows.length) return <Empty text="Chưa có mã giảm giá nào." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm text-left">
        <thead className="text-xs uppercase font-bold text-slate-400 border-b border-white/10">
          <tr>
            <th className="py-3 px-3">Mã</th>
            <th className="py-3 px-3">Giảm</th>
            <th className="py-3 px-3">Đơn tối thiểu</th>
            <th className="py-3 px-3">Đã dùng</th>
            <th className="py-3 px-3">Hiệu lực</th>
            <th className="py-3 px-3">Trạng thái</th>
            <th className="py-3 px-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((c) => {
            const [label, cls] = couponStatus(c);
            return (
              <tr key={c.couponId} className="hover:bg-white/[0.03] transition-colors">
                <td className="py-3 px-3 min-w-[200px]">
                  <div className="font-mono font-bold text-slate-100">{c.code}</div>
                  {c.description && <div className="text-xs text-slate-400 max-w-xs">{c.description}</div>}
                </td>
                <td className="py-3 px-3 font-semibold text-accent whitespace-nowrap">{discountText(c)}</td>
                <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{vnd(c.minOrderAmount)}</td>
                <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                  {c.usedCount} / {c.maxUses ?? '∞'}
                </td>
                <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                  {fmtDateTime(c.startAt)}
                  <br />→ {fmtDateTime(c.endAt)}
                </td>
                <td className="py-3 px-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>{label}</span>
                </td>
                <td className="py-3 px-3">
                  <RowActions active={c.isActive} onEdit={() => onEdit(c)} onToggle={() => onToggle(c)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductTable({ rows, onEdit, onToggle }) {
  if (!rows.length) return <Empty text="Chưa có combo nào." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm text-left">
        <thead className="text-xs uppercase font-bold text-slate-400 border-b border-white/10">
          <tr>
            <th className="py-3 px-3">Combo</th>
            <th className="py-3 px-3">Giá</th>
            <th className="py-3 px-3">Trạng thái</th>
            <th className="py-3 px-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((p) => (
            <tr key={p.productId} className={`hover:bg-white/[0.03] transition-colors ${p.isActive ? '' : 'opacity-60'}`}>
              <td className="py-3 px-3">
                <div className="flex items-center gap-3">
                  <img src={imgUrl(p.imageUrl)} alt="" className="h-12 w-12 rounded-lg object-cover bg-surface2 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-100">{p.name}</div>
                    {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 font-mono font-bold text-accent whitespace-nowrap">{vnd(p.price)}</td>
              <td className="py-3 px-3">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                    p.isActive ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' : 'bg-slate-400/15 border-slate-400/30 text-slate-300'
                  }`}
                >
                  {p.isActive ? 'Đang bán' : 'Ngừng bán'}
                </span>
              </td>
              <td className="py-3 px-3">
                <RowActions active={p.isActive} onEdit={() => onEdit(p)} onToggle={() => onToggle(p)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ active, onEdit, onToggle }) {
  return (
    <div className="flex justify-end gap-2">
      <button className="btn btn-ghost !px-2.5 !py-1.5" title="Sửa" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </button>
      <button
        className={`btn btn-ghost !px-2.5 !py-1.5 ${active ? 'text-red-300' : 'text-emerald-300'}`}
        title={active ? 'Tắt' : 'Bật lại'}
        onClick={onToggle}
      >
        <Power className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Form

// <input type="datetime-local"> dùng giờ máy người dùng; gửi lên server dạng ISO (UTC)
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

function CouponForm({ row, onClose, onSaved }) {
  const isNew = !row;
  const [f, setF] = useState(() =>
    row
      ? {
          code: row.code, description: row.description ?? '', discountType: row.discountType, discountValue: row.discountValue,
          maxDiscount: row.maxDiscount ?? '', minOrderAmount: row.minOrderAmount, maxUses: row.maxUses ?? '',
          startAt: toLocalInput(row.startAt), endAt: toLocalInput(row.endAt),
        }
      : {
          code: '', description: '', discountType: 'PERCENT', discountValue: 10, maxDiscount: '', minOrderAmount: 0, maxUses: '',
          startAt: toLocalInput(Date.now()), endAt: toLocalInput(Date.now() + 30 * 86400000),
        },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (new Date(f.endAt) <= new Date(f.startAt)) return setErr('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
    const common = {
      description: f.description.trim() || null,
      maxDiscount: f.discountType === 'PERCENT' ? numOrNull(f.maxDiscount) : null,
      minOrderAmount: Number(f.minOrderAmount) || 0,
      maxUses: numOrNull(f.maxUses),
      startAt: new Date(f.startAt).toISOString(),
      endAt: new Date(f.endAt).toISOString(),
    };
    setBusy(true);
    try {
      if (isNew) {
        // Lúc tạo, schema không nhận null nên bỏ các trường trống
        const body = { code: f.code.trim(), discountType: f.discountType, discountValue: Number(f.discountValue), ...common };
        Object.keys(body).forEach((k) => body[k] === null && delete body[k]);
        await api.post('/admin/coupons', body);
        onSaved('Đã tạo mã giảm giá');
      } else {
        await api.put(`/admin/coupons/${row.couponId}`, common);
        onSaved('Đã cập nhật mã giảm giá');
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? 'Thêm mã giảm giá' : `Sửa mã ${row.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Mã">
            <input className="input font-mono uppercase" value={f.code} onChange={set('code')} disabled={!isNew}
              required maxLength={50} pattern="[A-Za-z0-9_\-]+" title="Chỉ gồm chữ, số, - và _" placeholder="VD: SINHVIEN" />
          </Field>
          <Field label="Loại giảm">
            <select className="input" value={f.discountType} onChange={set('discountType')} disabled={!isNew}>
              <option value="PERCENT">Theo phần trăm (%)</option>
              <option value="FIXED">Số tiền cố định (đ)</option>
            </select>
          </Field>
          <Field label={f.discountType === 'PERCENT' ? 'Giảm (%)' : 'Giảm (đ)'}>
            <input className="input" type="number" min={1} max={f.discountType === 'PERCENT' ? 100 : undefined}
              value={f.discountValue} onChange={set('discountValue')} disabled={!isNew} required />
          </Field>
          {f.discountType === 'PERCENT' && (
            <Field label="Giảm tối đa (đ)" hint="Để trống nếu không giới hạn">
              <input className="input" type="number" min={1} value={f.maxDiscount} onChange={set('maxDiscount')} />
            </Field>
          )}
          <Field label="Đơn tối thiểu (đ)">
            <input className="input" type="number" min={0} value={f.minOrderAmount} onChange={set('minOrderAmount')} />
          </Field>
          <Field label="Số lượt tối đa" hint="Để trống nếu không giới hạn">
            <input className="input" type="number" min={1} value={f.maxUses} onChange={set('maxUses')} />
          </Field>
          <Field label="Bắt đầu">
            <input className="input" type="datetime-local" value={f.startAt} onChange={set('startAt')} required />
          </Field>
          <Field label="Kết thúc">
            <input className="input" type="datetime-local" value={f.endAt} onChange={set('endAt')} required />
          </Field>
        </div>
        <Field label="Mô tả">
          <input className="input" value={f.description} onChange={set('description')} maxLength={300}
            placeholder="VD: Giảm 15.000đ cho đơn từ 100.000đ" />
        </Field>
        {!isNew && (
          <p className="text-xs text-slate-400">Không đổi được mã, loại và mức giảm sau khi tạo để không lệch với các đơn đã dùng mã.</p>
        )}
        <FormFooter err={err} busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ProductForm({ row, onClose, onSaved }) {
  const isNew = !row;
  const [f, setF] = useState({
    name: row?.name ?? '', description: row?.description ?? '', price: row?.price ?? '', imageUrl: row?.imageUrl ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    setErr('');
    try {
      const r = await api.post('/admin/upload', fd);
      setF((s) => ({ ...s, imageUrl: r.data.url }));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const body = { name: f.name.trim(), description: f.description.trim(), price: Number(f.price), imageUrl: f.imageUrl.trim() };
    setBusy(true);
    try {
      if (isNew) {
        if (!body.description) delete body.description;
        if (!body.imageUrl) delete body.imageUrl;
        await api.post('/admin/products', body);
        onSaved('Đã tạo combo');
      } else {
        await api.put(`/admin/products/${row.productId}`, {
          ...body, description: body.description || null, imageUrl: body.imageUrl || null,
        });
        onSaved('Đã cập nhật combo');
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? 'Thêm combo' : `Sửa combo`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tên combo">
            <input className="input" value={f.name} onChange={set('name')} required maxLength={150} placeholder="VD: Combo 2 người" />
          </Field>
          <Field label="Giá (đ)">
            <input className="input" type="number" min={0} value={f.price} onChange={set('price')} required />
          </Field>
        </div>
        <Field label="Mô tả">
          <input className="input" value={f.description} onChange={set('description')} maxLength={300} placeholder="VD: 1 bắp (L) + 2 nước (M)" />
        </Field>
        <Field label="Ảnh" hint="Dán link ảnh hoặc tải ảnh từ máy (tối đa 5MB)">
          <div className="flex items-center gap-3">
            <img src={imgUrl(f.imageUrl)} alt="" className="h-14 w-14 rounded-lg object-cover bg-surface2 flex-shrink-0" />
            <input className="input" value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://..." />
            <label className={`btn btn-ghost cursor-pointer whitespace-nowrap ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="h-4 w-4" /> {uploading ? 'Đang tải...' : 'Tải ảnh'}
              <input type="file" accept="image/*" className="hidden" onChange={upload} />
            </label>
          </div>
        </Field>
        <FormFooter err={err} busy={busy || uploading} onClose={onClose} />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Phụ

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-surface border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-white">{title}</h2>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function FormFooter({ err, busy, onClose }) {
  return (
    <>
      {err && <ErrorBox msg={err} />}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </>
  );
}

function ErrorBox({ msg, onClose }) {
  return (
    <div className="error-box">
      <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
      <span className="flex-1">{msg}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Đóng">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-10 text-center text-sm text-slate-400">{text}</p>;
}
