import { useEffect, useState } from 'react';
import { api } from '../../api/axios.js';
import Spinner from '../../components/common/Spinner.jsx';
import { vnd, fmtDateTime } from '../../utils/format.js';
import { Receipt, CheckCircle2, AlertCircle } from 'lucide-react';

/** Giao dịch đã nhận tiền nhưng đơn không ở trạng thái PAID (thanh toán trễ, sai số tiền...). */
export default function PaymentReview() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/payments/review')
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="error-box">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span>{error}</span>
      </div>
    );
  if (!rows) return <Spinner label="Đang tải danh sách đối soát thanh toán..." />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
          <Receipt className="h-4 w-4" />
          <span>Tài chính & Kế toán</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
          Đối soát giao dịch thanh toán
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Danh sách các giao dịch phát sinh lỗi chuyển tiền trễ hoặc lệch số tiền cần kiểm tra thủ công
        </p>
      </div>

      <div className="card p-6 bg-surface/90 border-white/10 overflow-hidden shadow-2xl">
        {rows.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h3 className="font-display font-bold text-lg text-slate-200">
              Không có giao dịch nào cần xử lý
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tất cả các khoản thanh toán qua cổng PayOS đều khớp 100% với đơn hàng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="text-xs uppercase font-bold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-3">Mã đơn</th>
                  <th className="py-3 px-3">Trạng thái đơn</th>
                  <th className="py-3 px-3">Trạng thái thanh toán</th>
                  <th className="py-3 px-3">Đã nhận</th>
                  <th className="py-3 px-3">Cần thu</th>
                  <th className="py-3 px-3">Thời gian thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.paymentId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-200">#{r.orderCode}</td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 px-2.5 py-0.5 text-xs font-semibold">
                        {r.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-medium">{r.paymentStatus}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {vnd(r.amountReceived)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-300">
                      {vnd(r.amountExpected)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-xs">
                      {r.paidAt ? fmtDateTime(r.paidAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
