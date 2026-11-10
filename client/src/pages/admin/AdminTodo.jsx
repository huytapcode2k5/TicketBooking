import { Construction, Code, Lightbulb } from 'lucide-react';

/** Trang quản trị chưa làm: hiện việc cần làm và các API đã có sẵn ở server để nhóm triển khai giao diện. */
export default function AdminTodo({ title, owner, api }) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Module Quản trị
        </span>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white">{title}</h1>
      </div>

      <div className="card p-6 sm:p-7 space-y-5 bg-surface/90 border-white/10 shadow-2xl">
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300">
          <Construction className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="text-xs sm:text-sm leading-relaxed">
            Giao diện trang này đang được xây dựng (phần việc của thành viên{' '}
            <b className="text-white font-bold bg-amber-400/20 px-2 py-0.5 rounded">
              {owner}
            </b>
            ). Hệ thống backend đã hoàn thiện đầy đủ các API RESTful sau:
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
            <Code className="h-4 w-4 text-accent" />
            <span>Endpoint APIs khả dụng:</span>
          </div>

          <ul className="space-y-2 font-mono text-xs text-slate-300">
            {api.map((a) => (
              <li
                key={a}
                className="rounded-xl bg-surface2/80 border border-white/5 px-4 py-2.5 flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
          <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>
            Gợi ý: Sử dụng module <code className="text-accent">api</code> trong{' '}
            <code className="text-slate-200">src/api/axios.js</code> để gọi dữ liệu và tái sử dụng các component Card, Table từ trang Dashboard.
          </span>
        </div>
      </div>
    </div>
  );
}
