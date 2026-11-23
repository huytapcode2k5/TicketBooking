import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { vnd, fmtDateTime, fmtDate, fmtTime, SEAT_TYPE_LABEL } from '../../utils/format.js';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  RotateCcw,
  User,
  Film,
  Building2,
  Calendar,
  Armchair,
  Coffee,
  Ticket,
  ChevronRight,
  X,
  CreditCard
} from 'lucide-react';

const STATUS_CONFIG = {
  ALL: { label: 'Tất cả' },
  PAID: { label: 'Đã thanh toán', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  PENDING: { label: 'Chờ thanh toán', badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30', icon: Clock },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30', icon: XCircle },
  REFUNDED: { label: 'Đã hoàn tiền', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: RotateCcw },
  EXPIRED: { label: 'Hết hạn', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: AlertCircle },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.append('q', q.trim());
    if (status) params.append('status', status);

    api.get(`/admin/orders?${params.toString()}`)
      .then((r) => setOrders(r.data))
      .catch((e) => setError(e.message));
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const viewInvoice = async (orderId) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setInvoiceOrder(res.data);
    } catch (e) {
      setError(e.message || 'Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const viewDetail = async (orderId) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setSelectedOrder(res.data);
    } catch (e) {
      setError(e.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const refund = async (order) => {
    if (!window.confirm(`Xác nhận hoàn tiền cho đơn hàng #${order.orderCode} (${vnd(order.totalAmount)})?`)) return;
    try {
      await api.post(`/admin/orders/${order.orderId}/refund`, {});
      setSuccess(`Đã hoàn tiền thành công cho đơn #${order.orderCode}`);
      load();
    } catch (e) {
      setError(e.message || 'Lỗi khi hoàn tiền.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Tính toán nhanh số liệu tóm tắt
  const summary = useMemo(() => {
    if (!orders) return { total: 0, revenue: 0, paid: 0, pending: 0 };
    return {
      total: orders.length,
      revenue: orders.filter((o) => o.status === 'PAID').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      paid: orders.filter((o) => o.status === 'PAID').length,
      pending: orders.filter((o) => o.status === 'PENDING').length,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <ShoppingBag className="h-3.5 w-3.5 text-accent" />
            <span>Quản lý giao dịch</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">
            Đơn đặt hàng
          </h1>
        </div>
      </div>

      {/* Summary KPI mini cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl p-4 bg-surface2/30 border border-white/5">
          <span className="text-xs font-medium text-slate-400">Số lượng đơn hàng</span>
          <div className="mt-1 font-mono text-xl font-bold text-white">{summary.total}</div>
        </div>
        <div className="rounded-xl p-4 bg-surface2/30 border border-white/5">
          <span className="text-xs font-medium text-slate-400">Doanh số lọc được</span>
          <div className="mt-1 font-mono text-xl font-bold text-amber-300">{vnd(summary.revenue)}</div>
        </div>
        <div className="rounded-xl p-4 bg-surface2/30 border border-white/5">
          <span className="text-xs font-medium text-slate-400">Đơn đã thanh toán</span>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-400">{summary.paid}</div>
        </div>
        <div className="rounded-xl p-4 bg-surface2/30 border border-white/5">
          <span className="text-xs font-medium text-slate-400">Đơn chờ thanh toán</span>
          <div className="mt-1 font-mono text-xl font-bold text-amber-400">{summary.pending}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input !pl-10 !py-2 text-xs sm:text-sm w-full"
            placeholder="Tìm theo mã đơn (#123456), tên khách, email, SĐT..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
            const active = (k === 'ALL' && !status) || status === k;
            return (
              <button
                key={k}
                className={`btn !py-1.5 !px-3 text-xs font-medium select-none ${
                  active ? 'btn-primary' : 'btn-ghost border-white/5'
                }`}
                onClick={() => setStatus(k === 'ALL' ? '' : k)}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Orders Table */}
      {!orders ? (
        <Spinner label="Đang tải danh sách đơn hàng..." />
      ) : (
        <div className="card overflow-x-auto p-0 bg-surface/90 border-white/10 shadow-xl">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-slate-400 bg-white/[0.02] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Mã đơn</th>
                <th className="py-3.5 px-4 font-semibold">Khách hàng</th>
                <th className="py-3.5 px-4 font-semibold">Sự kiện / Vé</th>
                <th className="py-3.5 px-4 font-semibold">Tổng tiền</th>
                <th className="py-3.5 px-4 font-semibold">Thời gian tạo</th>
                <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                <th className="py-3.5 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => {
                const cfg = STATUS_CONFIG[o.status] || { label: o.status, badge: 'bg-white/10 text-white' };
                return (
                  <tr key={o.orderId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      #{o.orderCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{o.fullName}</div>
                      <div className="text-[11px] text-slate-400">{o.email || o.phone || '—'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200 line-clamp-1 max-w-[200px]" title={o.movieTitle}>
                        {o.movieTitle || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {o.ticketCount} vé {o.comboCount > 0 ? `• ${o.comboCount} combo` : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-amber-300 whitespace-nowrap">
                      {vnd(o.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                      <div>{fmtDateTime(o.createdAt)}</div>
                      {o.paidAt && (
                        <div className="text-[10px] text-emerald-400">Đã trả: {fmtTime(o.paidAt)}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
                        {cfg.icon && <cfg.icon className="h-3 w-3" />}
                        <span>{cfg.label}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => viewInvoice(o.orderId)}
                        className="btn-ghost !py-1 !px-2.5 text-xs inline-flex items-center gap-1 hover:text-white"
                        title="Truy xuất và in hóa đơn"
                      >
                        <Printer className="h-3.5 w-3.5 text-accent" />
                        <span>Hóa đơn</span>
                      </button>

                      <button
                        onClick={() => viewDetail(o.orderId)}
                        className="btn-ghost !py-1 !px-2.5 text-xs inline-flex items-center gap-1"
                        title="Xem chi tiết đơn"
                      >
                        <span>Chi tiết</span>
                      </button>

                      {o.status === 'PAID' && (
                        <button
                          onClick={() => refund(o)}
                          className="btn-ghost !py-1 !px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Hoàn tiền đơn hàng này"
                        >
                          Hoàn vé
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                    <ShoppingBag className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-medium">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Modal (Truy xuất hóa đơn) */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="card max-w-2xl w-full p-6 sm:p-8 bg-surface border-white/20 shadow-2xl relative my-8">
            {/* Modal Actions Bar (hidden on print) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <FileText className="h-5 w-5 text-accent" />
                <span>Truy xuất hóa đơn thanh toán</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="btn-primary !py-2 !px-4 text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>In / Lưu PDF</span>
                </button>
                <button
                  onClick={() => setInvoiceOrder(null)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div id="printable-invoice" className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 text-xs sm:text-sm font-sans shadow-inner">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="font-display font-black text-2xl text-slate-900 tracking-tight">
                    Ticket<span className="text-rose-600">Hub</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <p>Công ty Cổ phần Vé trực tuyến TicketHub</p>
                    <p>Hotline: 1900 6868 • Email: support@tickethub.vn</p>
                    <p>Mã số thuế: 0108923456</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">
                    Hóa đơn điện tử
                  </span>
                  <span className="font-mono text-base font-black text-slate-900">
                    #{invoiceOrder.orderCode}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Ngày lập: {fmtDateTime(invoiceOrder.paidAt || invoiceOrder.createdAt)}
                  </div>
                </div>
              </div>

              {/* Customer and Event Info */}
              <div className="grid sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">
                    Thông tin người mua:
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {invoiceOrder.fullName || 'Khách hàng TicketHub'}
                  </p>
                  <p className="text-slate-600">{invoiceOrder.email || '—'}</p>
                  {invoiceOrder.phone && <p className="text-slate-600">{invoiceOrder.phone}</p>}
                </div>

                <div className="sm:text-right">
                  <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">
                    Phương thức thanh toán:
                  </div>
                  <p className="font-semibold text-slate-900">
                    Cổng thanh toán MoMo E-Wallet
                  </p>
                  <p className="inline-block mt-1 font-semibold px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                    {invoiceOrder.status === 'PAID' ? 'GIAO DỊCH THÀNH CÔNG' : invoiceOrder.status}
                  </p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-600 font-bold">
                      <th className="py-2">Mô tả dịch vụ</th>
                      <th className="py-2 text-center">Số lượng</th>
                      <th className="py-2 text-right">Đơn giá</th>
                      <th className="py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoiceOrder.items?.map((item, idx) => {
                      const isTicket = item.itemType === 'TICKET';
                      const desc = isTicket
                        ? `${item.movieTitle} - Ghế ${item.seatLabel} (${SEAT_TYPE_LABEL[item.seatType] || 'Ghế'}) • ${item.cinemaName} (${item.roomName})`
                        : item.productName || 'Combo bắp nước';
                      const totalItem = (item.unitPrice || 0) * (item.quantity || 1);

                      return (
                        <tr key={idx}>
                          <td className="py-2.5 pr-2 font-medium text-slate-800">
                            {desc}
                            {isTicket && item.startTime && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                Suất chiếu: {fmtDateTime(item.startTime)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-center font-mono">{item.quantity || 1}</td>
                          <td className="py-2.5 text-right font-mono">{vnd(item.unitPrice)}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900">{vnd(totalItem)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Calculation */}
              <div className="border-t border-slate-300 pt-3 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính:</span>
                  <span className="font-mono font-semibold">{vnd(invoiceOrder.subTotal)}</span>
                </div>

                {invoiceOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Mã ưu đãi {invoiceOrder.couponCode ? `(${invoiceOrder.couponCode})` : ''}:</span>
                    <span className="font-mono">−{vnd(invoiceOrder.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-400 font-bold text-sm text-slate-950">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono text-xl text-rose-600">{vnd(invoiceOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Invoice Footer / Sign off */}
              <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400 space-y-1">
                <p>Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ tại TicketHub!</p>
                <p>Hóa đơn điện tử này được khởi tạo tự động và có giá trị xác nhận giao dịch mua vé chính thức.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="card max-w-xl w-full p-6 space-y-5 bg-surface border-white/20 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                Chi tiết đơn hàng #{selectedOrder.orderCode}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface2/60 border border-white/5">
                <div>
                  <span className="text-slate-400 text-xs">Khách hàng:</span>
                  <div className="font-semibold text-white mt-0.5">{selectedOrder.fullName || '—'}</div>
                  <div className="text-xs text-slate-400">{selectedOrder.email}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Trạng thái:</span>
                  <div className="font-semibold text-white mt-0.5">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-accent/15 border border-accent/30 text-accent">
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Tạo lúc: {fmtDateTime(selectedOrder.createdAt)}
                  </div>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-2">Danh sách mục vé & combo:</span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-surface2/40 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">
                          {it.itemType === 'TICKET' ? `Ghế ${it.seatLabel} (${it.movieTitle})` : it.productName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {it.itemType === 'TICKET'
                            ? `${it.cinemaName} • ${it.roomName} • ${fmtDateTime(it.startTime)}`
                            : `Số lượng: ${it.quantity}`}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-amber-300">
                        {vnd(it.unitPrice * (it.quantity || 1))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 flex items-baseline justify-between text-sm">
                <span className="text-slate-400 font-medium">Tổng tiền:</span>
                <span className="font-mono text-xl font-bold text-amber-300">
                  {vnd(selectedOrder.totalAmount)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  const ord = selectedOrder;
                  setSelectedOrder(null);
                  viewInvoice(ord.orderId);
                }}
                className="btn-primary !py-2 !px-4 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Xem & in hóa đơn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
