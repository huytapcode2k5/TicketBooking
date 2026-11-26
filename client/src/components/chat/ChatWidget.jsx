import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, RotateCcw } from 'lucide-react';
import { api } from '../../api/axios.js';

const STORAGE_KEY = 'chatbot:messages';
const GREETING = {
  role: 'assistant',
  text: 'Chào bạn! Mình là **Trợ lý TicketHub**. Mình có thể tìm sự kiện, xem suất diễn, ghế còn trống, giá vé, mã giảm giá và combo giúp bạn.',
};
const SUGGESTIONS = ['Cuối tuần này có sự kiện gì?', 'Còn ghế đôi không?', 'Có mã giảm giá nào không?', 'Combo bắp nước giá bao nhiêu?'];

// sessionStorage có thể bị chặn (trình duyệt riêng tư) nên luôn bọc try/catch
const load = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(v) && v.length ? v : [GREETING];
  } catch {
    return [GREETING];
  }
};
const save = (m) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(m.slice(-30)));
  } catch {
    /* bỏ qua */
  }
};

/** Hiển thị **đậm**, [link](/duong-dan) và gạch đầu dòng trong câu trả lời, không dùng HTML thô. */
function RichText({ text, onNavigate }) {
  const renderInline = (line, key) => {
    const parts = [];
    const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    let m;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1]) parts.push(<b key={`${key}-${m.index}`} className="text-white font-semibold">{m[1]}</b>);
      else if (m[3].startsWith('/'))
        parts.push(
          <Link key={`${key}-${m.index}`} to={m[3]} onClick={onNavigate} className="text-accent font-semibold underline underline-offset-2">
            {m[2]}
          </Link>,
        );
      else parts.push(m[2]); // link ra ngoài: chỉ hiện chữ
      last = re.lastIndex;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  return (
    <div className="space-y-1">
      {text.split('\n').filter((l) => l.trim()).map((line, i) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        return bullet ? (
          <div key={i} className="flex gap-2">
            <span className="text-accent">•</span>
            <span>{renderInline(bullet[1], i)}</span>
          </div>
        ) : (
          <p key={i}>{renderInline(line, i)}</p>
        );
      })}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(load);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => save(messages), [messages]);
  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ block: 'end' });
      inputRef.current?.focus();
    }
  }, [open, messages, busy]);

  const send = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', text: q.slice(0, 1000) }];
    setMessages(next);
    setInput('');
    setError('');
    setBusy(true);
    try {
      // Lời chào cố định không gửi lên server
      const history = next.filter((m) => m !== GREETING && m.text !== GREETING.text).slice(-12);
      const r = await api.post('/chat', { messages: history });
      setMessages((m) => [...m, { role: 'assistant', text: r.data.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([GREETING]);
    setError('');
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý TicketHub"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 hover:bg-accentDark transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Hỏi trợ lý</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý TicketHub"
          className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px] h-[min(560px,calc(100vh-1.5rem))] flex flex-col rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/60 overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Bot className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Trợ lý TicketHub</div>
              <div className="text-[11px] text-slate-400">Trả lời từ dữ liệu vé thật · có thể sai, hãy kiểm tra lại khi đặt</div>
            </div>
            <button onClick={reset} title="Cuộc trò chuyện mới" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen(false)} aria-label="Đóng" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm leading-relaxed">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-white whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              ) : (
                <div key={i} className="flex">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-surface2 px-3.5 py-2.5 text-slate-200 break-words">
                    <RichText text={m.text} onNavigate={() => window.innerWidth < 640 && setOpen(false)} />
                  </div>
                </div>
              ),
            )}

            {messages.length === 1 && !busy && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:border-accent/50 hover:text-white">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <div className="flex">
                <div className="rounded-2xl rounded-bl-md bg-surface2 px-4 py-3 flex gap-1" aria-label="Đang trả lời">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-white/[0.08] p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Hỏi về sự kiện, ghế, giá vé..."
              className="flex-1 resize-none rounded-xl bg-surface2 border border-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent/70 max-h-28"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Gửi"
              className="h-9 w-9 flex-shrink-0 rounded-xl bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:bg-accentDark transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
