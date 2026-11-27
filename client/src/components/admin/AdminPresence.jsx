import { fmtTime } from '../../utils/format.js';
import { AlertTriangle, UserCheck } from 'lucide-react';

/**
 * Huy hiệu hiển thị trong bảng dữ liệu: "Admin (tên) đang sửa"
 */
export function AdminEditingBadge({ editor }) {
  if (!editor) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm animate-pulse whitespace-nowrap"
      title={`Bắt đầu mở chỉnh sửa lúc ${fmtTime(editor.startedAt)}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
      <span className="truncate max-w-[150px]">
        Admin <strong>{editor.adminName}</strong> đang sửa
      </span>
    </span>
  );
}

/**
 * Hộp cảnh báo hiển thị trong Form / Modal chỉnh sửa khi có Admin khác đang sửa
 */
export function AdminEditingAlert({ editor, isLockedByOther }) {
  if (!editor || !isLockedByOther) return null;

  return (
    <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 shadow-lg animate-in fade-in duration-200">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="text-amber-300 font-bold flex items-center gap-1.5 text-xs sm:text-sm">
          <span>Trạng thái:</span>
          <span className="text-white underline font-extrabold">
            Admin {editor.adminName} đang sửa dữ liệu này
          </span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Admin này đã mở form chỉnh sửa từ <strong className="text-white font-mono">{fmtTime(editor.startedAt)}</strong>. Để tránh việc người lưu trước bị người lưu sau ghi đè mất dữ liệu, các nút thao tác có thể bị khóa hoặc vui lòng đợi Admin {editor.adminName} hoàn tất.
        </p>
      </div>
    </div>
  );
}
