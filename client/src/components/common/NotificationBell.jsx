import { useCallback, useEffect, useState, useRef } from 'react';
import { api } from '../../api/axios.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { fmtDateTime } from '../../utils/format.js';
import { Bell, CheckCheck, Inbox, Clock } from 'lucide-react';

export default function NotificationBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  const load = useCallback(() => api.get('/notifications').then((r) => setData(r.data)).catch(() => {}), []);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('notification:new', load);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const read = async (n) => {
    if (!n.isRead) await api.patch(`/notifications/${n.notificationId}/read`).catch(() => {});
    load();
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        className="relative h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
        onClick={() => setOpen(!open)}
        aria-label="Thông báo"
      >
        <Bell className="h-4 w-4" />
        {data.unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-glow-sm">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative">{data.unread > 9 ? '9+' : data.unread}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 card p-0 z-50 overflow-hidden shadow-2xl border-white/15 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-surface2/60">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-white">Thông báo</span>
            </div>
            {data.unread > 0 && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent border border-accent/30">
                {data.unread} mới
              </span>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5 p-1.5">
            {data.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Inbox className="h-10 w-10 text-slate-600 mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium">Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              data.items.map((n) => (
                <button
                  key={n.notificationId}
                  onClick={() => read(n)}
                  className={`w-full text-left rounded-xl p-3 transition-colors hover:bg-white/[0.06] flex gap-3 items-start ${
                    n.isRead ? 'opacity-65' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-accent shadow-glow-sm'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200 line-clamp-1">{n.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.content}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{fmtDateTime(n.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
