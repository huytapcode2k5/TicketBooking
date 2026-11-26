import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  RotateCcw, 
  FileText, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Phone, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../../api/axios.js';

export function FooterModal({ isOpen, onClose, title, icon: Icon, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-surface border border-white/10 shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-surface2/60">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="font-display font-bold text-lg text-white">{title}</h3>
              <p className="text-xs text-slate-400">Quy định & thông tin chính thức từ TicketHub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 text-sm leading-relaxed text-slate-300">
          {children}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface2/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary !py-2 !px-5 text-xs font-semibold"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/** 1. Modal Chính sách đổi trả & hoàn vé */
export function RefundPolicyModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  return (
    <FooterModal isOpen={isOpen} onClose={onClose} title="Chính sách đổi trả & hoàn vé" icon={RotateCcw}>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <b className="text-emerald-200 text-sm block mb-1">Cam kết minh bạch và nhanh chóng</b>
            TicketHub hỗ trợ hoàn tiền tự động 100% về tài khoản Ví MoMo của khách hàng theo đúng quy định dưới đây.
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">1</span>
            Thời hạn yêu cầu hoàn vé
          </h4>
          <p className="text-xs text-slate-300 pl-8">
            Quý khách có thể gửi yêu cầu hủy vé <b>trước giờ suất chiếu bắt đầu tối thiểu 60 phút</b>. Sau thời điểm này, hệ thống sẽ tự động khóa tính năng hoàn vé để rạp chuẩn bị suất chiếu.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">2</span>
            Điều kiện hoàn vé hợp lệ
          </h4>
          <ul className="text-xs text-slate-300 space-y-1.5 pl-8 list-disc list-inside">
            <li>Vé phải ở trạng thái <b>CHƯA SỬ DỤNG</b> (chưa được nhân viên soát vé quét mã QR tại rạp).</li>
            <li>Đơn hàng đã được thanh toán thành công qua cổng thanh toán được TicketHub hỗ trợ.</li>
            <li>Không áp dụng hoàn vé đối với các suất chiếu hoặc sự kiện có thông báo "Không áp dụng hoàn hủy" trong phần mô tả đặc biệt.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">3</span>
            Thời gian và phương thức nhận tiền hoàn
          </h4>
          <p className="text-xs text-slate-300 pl-8">
            Sau khi bạn bấm <b>Hủy vé</b> trong mục "Vé của tôi", hệ thống sẽ kích hoạt hoàn tiền tự động qua MoMo IPN. Số tiền hoàn sẽ được gửi trả về đúng tài khoản ví MoMo của bạn trong vòng <b>24h - 48h làm việc</b>.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">4</span>
            Sự kiện bị hủy hoặc dời lịch từ Ban Tổ Chức
          </h4>
          <p className="text-xs text-slate-300 pl-8">
            Trường hợp bất khả kháng rạp hoặc Ban tổ chức hủy suất chiếu, TicketHub sẽ chủ động gửi email thông báo và <b>hoàn lại 100% giá trị vé cùng combo (nếu có)</b> mà khách hàng không chịu bất kỳ chi phí nào.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => {
              onClose();
              navigate('/my-tickets');
            }}
            className="btn btn-primary !py-2 !px-4 text-xs flex items-center gap-2"
          >
            Xem danh sách vé của tôi để yêu cầu hoàn vé
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </FooterModal>
  );
}

/** 2. Modal Điều khoản dịch vụ */
export function TermsModal({ isOpen, onClose }) {
  return (
    <FooterModal isOpen={isOpen} onClose={onClose} title="Điều khoản dịch vụ" icon={FileText}>
      <div className="space-y-4">
        <p className="text-xs text-slate-300">
          Chào mừng quý khách đến với nền tảng đặt vé <b>TicketHub</b>. Bằng việc truy cập hoặc đặt vé trên hệ thống, quý khách đồng ý tuân thủ các điều khoản sau:
        </p>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-accent">1. Tài khoản & Bảo mật thông tin</h4>
          <p className="text-xs text-slate-300">
            Khách hàng có trách nhiệm bảo mật mật khẩu và mã vé QR nhận được sau khi thanh toán. TicketHub không chịu trách nhiệm trong trường hợp khách hàng tự ý chia sẻ mã QR dẫn đến việc vé bị người khác sử dụng trước tại cổng soát vé.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-accent">2. Quy định giữ ghế thời gian thực</h4>
          <p className="text-xs text-slate-300">
            Hệ thống giữ chỗ thời gian thực cho phép mỗi khách hàng giữ ghế tối đa <b>10 phút</b> trong khi thực hiện thanh toán. Nếu quá thời gian trên mà đơn hàng chưa được thanh toán thành công, ghế sẽ tự động giải phóng để đảm bảo công bằng cho các khán giả khác.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-accent">3. Phân loại độ tuổi xem phim (Cục Điện Ảnh)</h4>
          <p className="text-xs text-slate-300">
            Khách hàng cần tuân thủ quy định độ tuổi ghi rõ trên từng phim:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="p-2 rounded bg-surface2 border border-white/5 text-center">
              <span className="font-bold text-emerald-400 block">P</span>
              <span className="text-[11px] text-slate-400">Mọi độ tuổi</span>
            </div>
            <div className="p-2 rounded bg-surface2 border border-white/5 text-center">
              <span className="font-bold text-sky-400 block">K</span>
              <span className="text-[11px] text-slate-400">Dưới 13 có phụ huynh</span>
            </div>
            <div className="p-2 rounded bg-surface2 border border-white/5 text-center">
              <span className="font-bold text-amber-400 block">T13 / T16</span>
              <span className="text-[11px] text-slate-400">Từ 13 / 16 tuổi trở lên</span>
            </div>
            <div className="p-2 rounded bg-surface2 border border-white/5 text-center">
              <span className="font-bold text-red-400 block">T18 / C</span>
              <span className="text-[11px] text-slate-400">Từ 18 tuổi trở lên</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            * Nhân viên soát vé có quyền từ chối vào rạp nếu khách hàng không xuất trình được giấy tờ tùy thân chứng minh đủ độ tuổi theo quy định.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-accent">4. Nội quy phòng chiếu & bản quyền</h4>
          <p className="text-xs text-slate-300">
            Nghiêm cấm tuyệt đối mọi hành vi quay phim, chụp ảnh, ghi âm hoặc phát trực tiếp (livestream) nội dung trong phòng chiếu. Không mang đồ ăn, thức uống ngoài quy định vào rạp.
          </p>
        </div>
      </div>
    </FooterModal>
  );
}

/** 3. Modal Hệ thống Cụm rạp & Địa điểm */
export function VenuesModal({ isOpen, onClose }) {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/cinemas')
      .then((res) => {
        setCinemas(res.data || []);
      })
      .catch(() => setCinemas([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const cities = ['Tất cả', ...new Set(cinemas.map((c) => c.city).filter(Boolean))];
  const filtered = selectedCity && selectedCity !== 'Tất cả'
    ? cinemas.filter((c) => c.city === selectedCity)
    : cinemas;

  const onSelectCinema = (cinemaId) => {
    onClose();
    navigate(`/?cinemaId=${cinemaId}`);
  };

  return (
    <FooterModal isOpen={isOpen} onClose={onClose} title="Hệ thống Cụm rạp & Địa điểm" icon={MapPin}>
      <div className="space-y-4">
        <p className="text-xs text-slate-300">
          TicketHub liên kết với các cụm rạp tiêu chuẩn quốc tế với phòng chiếu hiện đại (IMAX, 2D, 3D, Dolby Atmos). Bấm vào rạp để xem lịch chiếu tại rạp đó:
        </p>

        {/* Lọc theo thành phố */}
        {cities.length > 2 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  (selectedCity === city || (!selectedCity && city === 'Tất cả'))
                    ? 'bg-accent text-white font-semibold'
                    : 'bg-surface2 text-slate-400 hover:text-white'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {/* Danh sách rạp */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Đang tải danh sách cụm rạp...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có thông tin cụm rạp nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {filtered.map((c) => (
              <div
                key={c.cinemaId}
                onClick={() => onSelectCinema(c.cinemaId)}
                className="group p-3.5 rounded-xl bg-surface2/60 border border-white/5 hover:border-accent/40 hover:bg-surface2 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-white text-xs group-hover:text-accent transition-colors">
                    {c.name}
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0">
                    {c.city}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {c.address}
                </p>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>{c.roomCount || 0} phòng chiếu</span>
                  <span className="text-accent group-hover:underline flex items-center gap-1 font-medium">
                    Xem lịch chiếu <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FooterModal>
  );
}

/** 4. Modal Thông tin thanh toán */
export function PaymentInfoModal({ isOpen, onClose }) {
  return (
    <FooterModal isOpen={isOpen} onClose={onClose} title="Cổng thanh toán & Bảo mật" icon={CreditCard}>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-pink-400 text-sm">
            <CreditCard className="h-4 w-4" />
            Cổng thanh toán Ví điện tử MoMo
          </div>
          <p className="leading-relaxed">
            Hỗ trợ quét mã QR qua ứng dụng MoMo trên điện thoại hoặc qua thẻ liên kết ngân hàng. Hệ thống nhận thông báo thanh toán tự động (IPN) và phát hành vé điện tử tức thì chỉ sau 1-3 giây.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-accent">Các hình thức thanh toán được chấp nhận</h4>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-surface2 border border-white/5 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 font-bold text-[11px] shrink-0 mt-0.5">MoMo</span>
              <div>
                <b className="text-white block">Ví MoMo & MoMo Pay</b>
                <span className="text-slate-400">Quét mã QR tiện lợi, không mất phí giao dịch. Hoàn tiền tức thì khi hủy vé.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface2 border border-white/5 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[11px] shrink-0 mt-0.5">ATM</span>
              <div>
                <b className="text-white block">Thẻ ATM Nội địa (Napas)</b>
                <span className="text-slate-400">Hỗ trợ hơn 40 ngân hàng lớn: Vietcombank, Techcombank, MB Bank, BIDV, ACB...</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface2 border border-white/5 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[11px] shrink-0 mt-0.5">VISA</span>
              <div>
                <b className="text-white block">Thẻ quốc tế (Visa / MasterCard / JCB)</b>
                <span className="text-slate-400">Bảo mật xác thực 2 lớp 3D-Secure quốc tế, bảo vệ chống gian lận.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-accent">Cam kết bảo mật giao dịch</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Mọi dữ liệu giao dịch thanh toán đều được mã hóa bằng giao thức SSL/TLS 256-bit theo tiêu chuẩn PCI-DSS quốc tế. TicketHub <b>không lưu trữ</b> mật khẩu tài khoản ngân hàng hoặc số thẻ tín dụng của khách hàng trên máy chủ.
          </p>
        </div>
      </div>
    </FooterModal>
  );
}
